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

        return response()->json([
            "aluno" => [
                "id"           => $aluno->id,
                "nome"         => $aluno->user?->nome,
                "numero_aluno" => $aluno->numero_aluno,
                "turma"        => $aluno->matriculas->firstWhere("status", "activa")?->turma?->nome,
                "user"         => ["nome" => $aluno->user?->nome],
                "matriculas"   => $aluno->matriculas,
                "dados_academicos_verificados_em" => $aluno->dados_academicos_verificados_em,
            ],
            "dividas" => $pagamentos,
            "total_devido" => round((float) $pagamentos->sum(fn ($p) => $p->valor + ($p->multa_valor ?? 0) - ($p->bolsa_valor ?? 0)), 2),
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
        ], [
            "num_referencia_externa.required_if" => "Para método :input é obrigatório indicar a referência.",
        ]);

        $pendentes = Pagamento::whereIn("id", $data["ids"])
            ->whereIn("status", ["pendente", "vencido"])
            ->get();

        if ($pendentes->isEmpty()) {
            return response()->json(["message" => "Nenhum pagamento pendente nos IDs indicados."], 422);
        }

        // Calcula multa por atraso (em memória) — persistência ocorre no update abaixo
        MultaCalculator::aplicar($pendentes);

        $loteId = "POS-" . strtoupper(Str::random(8));
        $escola = $request->attributes->get("escola");
        $emitter = new VendusEmitter();
        $signer  = new FacturaSigner();

        DB::transaction(function () use ($pendentes, $data, $sessao, $user, $loteId, $signer) {
            $primeiro = true;
            foreach ($pendentes as $p) {
                $p->update([
                    "status"                 => "pago",
                    "metodo"                 => $data["metodo"],
                    "data_pagamento"         => now()->toDateString(),
                    "caixa_sessao_id"        => $sessao->id,
                    "lote_id"                => $loteId,
                    "num_referencia_externa" => $data["num_referencia_externa"] ?? null,
                    "multa_valor"            => (float) ($p->multa_valor ?? 0),
                    "multa_id"               => $p->multa_id ?: null,
                    "valor_entregue"         => $primeiro && isset($data["valor_entregue"]) ? $data["valor_entregue"] : null,
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

        return response()->json([
            "message"    => "Cobrança efectuada.",
            "lote_id"    => $loteId,
            "sessao"     => $sessao->fresh(),
            "pagamentos" => $pagamentos,
        ]);
    }
}
