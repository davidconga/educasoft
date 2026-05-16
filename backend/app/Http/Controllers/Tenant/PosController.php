<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\CaixaSessao;
use App\Models\Tenant\Pagamento;
use App\Services\Central\VendusEmitter;
use App\Services\Tenant\FacturaSigner;
use App\Services\Tenant\MultaCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PosController extends Controller {
    /**
     * Pesquisa rápida de aluno por nome, número ou ID.
     */
    /**
     * Verifica se uma referência de pagamento (multicaixa, transferência, cheque)
     * já foi usada noutro pagamento desta escola.
     */
    public function verificarReferencia(Request $request) {
        $ref = trim((string) $request->query("ref", ""));
        if ($ref === "") return response()->json(["usada" => false]);

        $existe = Pagamento::with("aluno.user")
            ->where("num_referencia_externa", $ref)
            ->where("status", "pago")
            ->orderByDesc("data_pagamento")
            ->first();

        if (!$existe) return response()->json(["usada" => false]);

        return response()->json([
            "usada" => true,
            "pagamento" => [
                "id"             => $existe->id,
                "referencia"     => $existe->referencia,
                "valor"          => (float) $existe->valor,
                "metodo"         => $existe->metodo,
                "data_pagamento" => optional($existe->data_pagamento)->format("d/m/Y"),
                "aluno"          => $existe->aluno?->user?->nome,
                "numero_aluno"   => $existe->aluno?->numero_aluno,
            ],
        ]);
    }

    public function pesquisarAlunos(Request $request) {
        $q = trim((string) $request->query("q", ""));
        if ($q === "") return response()->json([]);

        $alunos = Aluno::with("user", "matriculas.turma")
            ->where(function ($w) use ($q) {
                $w->where("numero_aluno", "like", "%{$q}%")
                  ->orWhereHas("user", fn ($u) => $u->where("nome", "like", "%{$q}%")->orWhere("email", "like", "%{$q}%"));
            })
            ->limit(20)
            ->get()
            ->map(function ($a) {
                return [
                    "id"            => $a->id,
                    "nome"          => $a->user?->nome,
                    "numero_aluno"  => $a->numero_aluno,
                    "turma"         => $a->matriculas->where("status", "activa")->first()?->turma?->nome,
                    "foto"          => $a->foto,
                ];
            });

        return response()->json($alunos);
    }

    /**
     * Lista de dívidas (pendentes) do aluno + créditos disponíveis.
     */
    public function dividasAluno(Request $request, Aluno $aluno) {
        $aluno->load("user", "matriculas.turma.classe.curso", "matriculas.turma.turnoObj");

        $pagamentos = Pagamento::with("propina", "emolumento")
            ->where("aluno_id", $aluno->id)
            ->whereIn("status", ["pendente", "vencido"])
            ->orderBy("data_vencimento")
            ->get();

        // Aplica multa em memória para a UI mostrar valor actualizado
        MultaCalculator::aplicar($pagamentos);

        $saldoCarteira = round(PagamentoController::computeSaldoCarteira((int) $aluno->id), 2);

        // Últimos lotes/recibos pagos deste aluno (para reimpressão rápida)
        $recentes = Pagamento::where("aluno_id", $aluno->id)
            ->where("status", "pago")
            ->whereNotIn("tipo", ["deposito","levantamento"])
            ->orderByDesc("data_pagamento")
            ->orderByDesc("id")
            ->limit(60)
            ->get(["id","lote_id","referencia","valor","multa_valor","bolsa_valor","valor_carteira","metodo","data_pagamento","tipo","mes_referencia"]);
        $lotes = [];
        foreach ($recentes as $p) {
            $key = $p->lote_id ?: ("PAG-" . $p->id);
            if (!isset($lotes[$key])) {
                $lotes[$key] = [
                    "lote_id"        => $p->lote_id,
                    "pagamento_id"   => $p->lote_id ? null : $p->id,
                    "referencia"     => $p->referencia,
                    "metodo"         => $p->metodo,
                    "data_pagamento" => optional($p->data_pagamento)->format("Y-m-d"),
                    "n_pagamentos"   => 0,
                    "total"          => 0.0,
                    "tipo"           => $p->tipo,
                    "mes_referencia" => $p->mes_referencia,
                ];
            }
            $lotes[$key]["n_pagamentos"] += 1;
            $lotes[$key]["total"]        += (float)$p->valor + (float)($p->multa_valor ?? 0) - (float)($p->bolsa_valor ?? 0);
        }
        $lotesRecentes = array_slice(array_values($lotes), 0, 10);

        return response()->json([
            "aluno" => [
                "id"           => $aluno->id,
                "nome"         => $aluno->user?->nome,
                "numero_aluno" => $aluno->numero_aluno,
                "turma"        => $aluno->matriculas->firstWhere("status", "activa")?->turma?->nome,
                "foto"         => $aluno->foto,
                "user"         => ["nome" => $aluno->user?->nome],
                "matriculas"   => $aluno->matriculas,
                "dados_academicos_verificados_em" => $aluno->dados_academicos_verificados_em,
            ],
            "dividas" => $pagamentos,
            "total_devido" => round((float) $pagamentos->sum(fn ($p) => $p->valor + ($p->multa_valor ?? 0) - ($p->bolsa_valor ?? 0)), 2),
            "saldo_carteira" => $saldoCarteira,
            "lotes_recentes" => $lotesRecentes,
        ]);
    }

    /**
     * Devolve os pagamentos completos de um lote (ou de um único pagamento) + bloco de carteira,
     * pronto para reimpressão pelo Recibo.jsx.
     */
    public function recibo(Request $request, string $loteOrPag) {
        $isLote = !preg_match('/^PAG-(\d+)$/', $loteOrPag, $m);

        $query = Pagamento::with(
            "aluno.user",
            "aluno.matriculas.turma.classe.curso",
            "aluno.matriculas.turma.turnoObj",
            "propina",
            "emolumento"
        );

        $pagamentos = $isLote
            ? $query->where("lote_id", $loteOrPag)->orderBy("id")->get()
            : $query->where("id", (int) $m[1])->get();

        if ($pagamentos->isEmpty()) {
            return response()->json(["message" => "Recibo não encontrado."], 404);
        }

        $alunoId       = $pagamentos->first()->aluno_id;

        // Incrementa contador de impressões e devolve nº da via
        if ($isLote) {
            Pagamento::where("lote_id", $loteOrPag)->update(["n_impressoes" => \DB::raw("COALESCE(n_impressoes,0) + 1")]);
            $pagamentos = $query->where("lote_id", $loteOrPag)->orderBy("id")->get();
        } else {
            Pagamento::where("id", (int) $m[1])->update(["n_impressoes" => \DB::raw("COALESCE(n_impressoes,0) + 1")]);
            $pagamentos = $query->where("id", (int) $m[1])->get();
        }
        $viaNumber = (int) ($pagamentos->max("n_impressoes") ?: 1);

        $saldoActual   = round(PagamentoController::computeSaldoCarteira((int) $alunoId), 2);
        $totalPagoAcum = (float) Pagamento::where("aluno_id", $alunoId)->where("status","pago")
            ->whereNotIn("tipo", ["deposito","levantamento"])->sum("valor");
        $totalPendAcum = (float) Pagamento::where("aluno_id", $alunoId)->whereIn("status",["pendente","vencido"])->sum("valor");

        return response()->json([
            "pagamentos" => $pagamentos,
            "via_number" => $viaNumber,
            "carteira"   => [
                "total_pago"              => round($totalPagoAcum, 2),
                "total_pendente"          => round($totalPendAcum, 2),
                "saldo"                   => round($totalPagoAcum - $totalPendAcum, 2),
                "saldo_carteira"          => $saldoActual,
                "saldo_carteira_actual"   => $saldoActual,
                // 'anterior' não faz sentido em reimpressão (já foi consumido) — omitido
            ],
        ]);
    }

    /**
     * Cobrar via POS: marca pagamentos como pagos e regista movimento na sessão.
     * Ignora pagamentos sem sessão de caixa aberta — exige caixa aberta para o operador.
     */
    public function cobrar(Request $request) {
        $user = $request->attributes->get("auth_user");
        if (!$user) return response()->json(["message" => "Não autenticado."], 401);

        $sessao = CaixaSessao::where("operador_id", $user->id)->where("status", "aberta")->latest("abriu_em")->first();
        if (!$sessao) {
            return response()->json(["message" => "Não há caixa aberta para o operador. Abra uma caixa primeiro."], 422);
        }

        $data = $request->validate([
            "ids"                    => "required|array|min:1",
            "ids.*"                  => "integer|exists:pagamentos,id",
            "metodo"                 => "required|string|max:30",
            "num_referencia_externa" => "required_if:metodo,multicaixa,multicaixa_express,transferencia,referencia,referencia_multicaixa,cheque|nullable|string|max:100",
            "valor_entregue"         => "nullable|numeric|min:0",
            "valor_carteira"         => "nullable|numeric|gt:0",
            // Metadados de origem offline (preservam veracidade do registo)
            "offline_lote_ref"       => "nullable|string|max:40",
            "offline_data_pagamento" => "nullable|date",
        ], [
            "num_referencia_externa.required_if" => "Para método :input é obrigatório indicar a referência.",
        ]);

        // Se a operação foi originada offline, usamos a data registada localmente
        // (instante real da venda) em vez de `now()` (instante da sincronização).
        $isOffline      = !empty($data["offline_lote_ref"]) || !empty($data["offline_data_pagamento"]);
        $dataPagamento  = !empty($data["offline_data_pagamento"])
            ? \Carbon\Carbon::parse($data["offline_data_pagamento"])->toDateString()
            : now()->toDateString();
        $loteOfflineRef = $data["offline_lote_ref"] ?? null;

        $pendentes = Pagamento::whereIn("id", $data["ids"])
            ->whereIn("status", ["pendente", "vencido"])
            ->get();

        if ($pendentes->isEmpty()) {
            return response()->json(["message" => "Nenhum pagamento pendente nos IDs indicados."], 422);
        }

        // Calcula multa por atraso (em memória) — persistência ocorre no update abaixo
        MultaCalculator::aplicar($pendentes);

        // Validação de carteira (cobertura total ou parcial)
        $totalLote     = $pendentes->sum(fn ($p) => (float) $p->valor + (float) ($p->multa_valor ?? 0) - (float) ($p->bolsa_valor ?? 0));
        $valorCartLote = isset($data["valor_carteira"]) ? round((float) $data["valor_carteira"], 2) : 0.0;
        $alunoId       = $pendentes->first()->aluno_id;

        if ($data["metodo"] === "carteira") {
            $saldo = PagamentoController::computeSaldoCarteira((int) $alunoId);
            if ($totalLote > $saldo + 0.001) {
                return response()->json([
                    "message"        => "Saldo em carteira insuficiente (necessário " . number_format($totalLote, 2, ',', '.') . " Kz, disponível " . number_format($saldo, 2, ',', '.') . " Kz).",
                    "saldo_carteira" => round($saldo, 2),
                ], 422);
            }
            $valorCartLote = 0; // 'carteira' já cobre 100% — não usar campo parcial
        } elseif ($valorCartLote > 0) {
            if ($valorCartLote > $totalLote + 0.001) {
                return response()->json([
                    "message" => "Valor da carteira (" . number_format($valorCartLote, 2, ',', '.') . " Kz) excede o total do lote (" . number_format($totalLote, 2, ',', '.') . " Kz).",
                ], 422);
            }
            $saldo = PagamentoController::computeSaldoCarteira((int) $alunoId);
            if ($valorCartLote > $saldo + 0.001) {
                return response()->json([
                    "message"        => "Saldo em carteira insuficiente (pretendido " . number_format($valorCartLote, 2, ',', '.') . " Kz, disponível " . number_format($saldo, 2, ',', '.') . " Kz).",
                    "saldo_carteira" => round($saldo, 2),
                ], 422);
            }
        }

        $loteId = "POS-" . strtoupper(Str::random(8));
        $escola = $request->attributes->get("escola");
        $emitter = new VendusEmitter();
        $signer  = new FacturaSigner();

        DB::transaction(function () use ($pendentes, $data, $sessao, $user, $loteId, $signer, $valorCartLote, $isOffline, $dataPagamento, $loteOfflineRef) {
            $primeiro = true;
            $remainingCart = $valorCartLote;
            foreach ($pendentes as $p) {
                $totalP = (float) $p->valor + (float) ($p->multa_valor ?? 0) - (float) ($p->bolsa_valor ?? 0);
                $applyP = min($remainingCart, $totalP);
                $remainingCart -= $applyP;
                $p->update([
                    "status"                 => "pago",
                    "metodo"                 => $data["metodo"],
                    "data_pagamento"         => $dataPagamento,
                    "caixa_sessao_id"        => $sessao->id,
                    "lote_id"                => $loteId,
                    "num_referencia_externa" => $data["num_referencia_externa"] ?? null,
                    "multa_valor"            => (float) ($p->multa_valor ?? 0),
                    "multa_id"               => $p->multa_id ?: null,
                    "valor_entregue"         => $primeiro && isset($data["valor_entregue"]) ? $data["valor_entregue"] : null,
                    "valor_carteira"         => $applyP > 0 ? round($applyP, 2) : null,
                    "n_impressoes"           => 1,
                    "originado_offline"      => $isOffline,
                    "lote_offline_ref"       => $loteOfflineRef,
                    "sincronizado_em"        => $isOffline ? now() : null,
                ]);
                $primeiro = false;
            }
            // Assinar
            try {
                foreach ($pendentes->fresh() as $p) $signer->signPagamento($p);
            } catch (\Throwable $e) {
                Log::warning("Falha assinatura POS lote {$loteId}: " . $e->getMessage());
            }
            // Registar movimentos na sessão
            foreach ($pendentes->fresh() as $p) {
                CaixaController::registarPagamentoNaSessao($p, $user);
            }
        });

        // Vendus auto (best-effort)
        if ($escola && $escola->vendus_ativo) {
            foreach (Pagamento::whereIn("id", $data["ids"])->with("aluno.user", "emolumento")->get() as $p) {
                try { $emitter->emitirPagamento($p, $escola); }
                catch (\Throwable $e) { Log::warning("Vendus POS pagamento {$p->id}: " . $e->getMessage()); }
            }
        }

        $pagamentos = Pagamento::whereIn("id", $data["ids"])
            ->with(
                "aluno.user",
                "aluno.matriculas.turma.classe.curso",
                "aluno.matriculas.turma.turnoObj",
                "propina",
                "emolumento"
            )
            ->get();

        // Carteira: saldo actual e anterior (antes deste lote consumir/usar o saldo)
        $saldoActual    = round(PagamentoController::computeSaldoCarteira((int) $alunoId), 2);
        $debitadoNoLote = $pagamentos->sum(function ($p) {
            if ($p->metodo === "carteira" && !in_array($p->tipo, ["deposito","levantamento"], true)) {
                return (float) $p->valor + (float) ($p->multa_valor ?? 0) - (float) ($p->bolsa_valor ?? 0);
            }
            return (float) ($p->valor_carteira ?? 0);
        });
        $totalPagoAcum  = (float) Pagamento::where("aluno_id", $alunoId)->where("status","pago")
            ->whereNotIn("tipo", ["deposito","levantamento"])->sum("valor");
        $totalPendAcum  = (float) Pagamento::where("aluno_id", $alunoId)->whereIn("status",["pendente","vencido"])->sum("valor");

        return response()->json([
            "message"    => "Cobrança efectuada.",
            "lote_id"    => $loteId,
            "sessao"     => $sessao->fresh(),
            "pagamentos" => $pagamentos,
            "via_number" => 1,
            "carteira"   => [
                "total_pago"              => round($totalPagoAcum, 2),
                "total_pendente"          => round($totalPendAcum, 2),
                "saldo"                   => round($totalPagoAcum - $totalPendAcum, 2),
                "saldo_carteira"          => $saldoActual,
                "saldo_carteira_actual"   => $saldoActual,
                "saldo_carteira_anterior" => round($saldoActual + $debitadoNoLote, 2),
            ],
        ]);
    }
}
