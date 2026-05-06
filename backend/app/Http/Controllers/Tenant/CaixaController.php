<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\CaixaMovimento;
use App\Models\Tenant\CaixaSessao;
use App\Models\Tenant\Pagamento;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CaixaController extends Controller {

    /**
     * Sessões de caixa, com filtros opcionais (estado, operador, datas).
     */
    public function index(Request $request) {
        $q = CaixaSessao::query()->orderByDesc("abriu_em");
        if ($s = $request->query("status"))     $q->where("status", $s);
        if ($op = $request->query("operador"))  $q->where("operador_id", (int) $op);
        if ($de = $request->query("de"))        $q->whereDate("abriu_em", ">=", $de);
        if ($ate = $request->query("ate"))      $q->whereDate("abriu_em", "<=", $ate);
        return response()->json($q->paginate(20));
    }

    /**
     * Resumo agregado das sessões num período (ou por defeito hoje).
     * Útil para director/tesoureiro ver totalizadores.
     */
    public function resumo(Request $request) {
        $de  = $request->query("de")  ?: Carbon::today()->toDateString();
        $ate = $request->query("ate") ?: Carbon::today()->toDateString();
        $op  = $request->query("operador");

        $sessoes = CaixaSessao::with("movimentos")
            ->whereDate("abriu_em", ">=", $de)
            ->whereDate("abriu_em", "<=", $ate)
            ->when($op, fn ($q, $v) => $q->where("operador_id", (int) $v))
            ->get();

        $movs = $sessoes->flatMap->movimentos;

        // Operadores únicos para o dropdown de filtros
        $operadores = CaixaSessao::select("operador_id", "operador_nome")
            ->groupBy("operador_id", "operador_nome")
            ->orderBy("operador_nome")
            ->get();

        return response()->json([
            "periodo" => ["de" => $de, "ate" => $ate],
            "n_sessoes"      => $sessoes->count(),
            "abertas"        => $sessoes->where("status", "aberta")->count(),
            "fechadas"       => $sessoes->where("status", "fechada")->count(),
            "fundo_inicial"  => (float) $sessoes->sum("fundo_inicial"),
            "pagamentos"     => (float) $movs->where("tipo", "pagamento")->sum("valor"),
            "n_pagamentos"   => $movs->where("tipo", "pagamento")->count(),
            "reforcos"       => (float) $movs->where("tipo", "reforco")->sum("valor"),
            "sangrias"       => (float) $movs->where("tipo", "sangria")->sum("valor"),
            "despesas"       => (float) $movs->where("tipo", "despesa")->sum("valor"),
            "diferenca_total"=> (float) $sessoes->whereNotNull("diferenca")->sum("diferenca"),
            "operadores"     => $operadores,
        ]);
    }

    /** Sessão activa do operador autenticado (ou null). */
    public function actual(Request $request) {
        $user = $request->attributes->get("auth_user");
        $sessao = CaixaSessao::where("operador_id", $user?->id)
            ->where("status", "aberta")
            ->latest("abriu_em")
            ->first();
        if (!$sessao) return response()->json(null);
        $sessao->total_esperado = $sessao->totalEsperadoCalculado();
        $sessao->save();
        return response()->json($sessao);
    }

    public function abrir(Request $request) {
        $user = $request->attributes->get("auth_user");
        if (!$user) return response()->json(["message" => "Não autenticado."], 401);

        // Bloqueia abertura se o operador já tem sessão aberta
        $existente = CaixaSessao::where("operador_id", $user->id)->where("status", "aberta")->first();
        if ($existente) {
            return response()->json([
                "message" => "Já tem uma sessão aberta. Feche-a antes de abrir outra.",
                "sessao"  => $existente,
            ], 422);
        }

        $data = $request->validate([
            "fundo_inicial"        => "required|numeric|min:0",
            "nome_caixa"           => "nullable|string|max:100",
            "observacoes_abertura" => "nullable|string|max:1000",
        ]);

        $codigo = "CX-" . Carbon::now()->format("Ymd") . "-" . str_pad(
            (string) (CaixaSessao::whereDate("abriu_em", Carbon::today())->count() + 1),
            3, "0", STR_PAD_LEFT
        );

        $sessao = CaixaSessao::create([
            "codigo"               => $codigo,
            "operador_id"          => $user->id,
            "operador_nome"        => $user->nome,
            "nome_caixa"           => $data["nome_caixa"] ?? "Caixa " . $user->nome,
            "fundo_inicial"        => $data["fundo_inicial"],
            "total_esperado"       => $data["fundo_inicial"],
            "observacoes_abertura" => $data["observacoes_abertura"] ?? null,
            "abriu_em"             => now(),
            "status"               => "aberta",
        ]);

        return response()->json($sessao, 201);
    }

    public function show(Request $request, CaixaSessao $sessao) {
        $sessao->load(["movimentos" => fn ($q) => $q->orderByDesc("created_at")]);
        $sessao->total_esperado = $sessao->totalEsperadoCalculado();

        // Resumo por tipo
        $resumo = [
            "fundo_inicial" => (float) $sessao->fundo_inicial,
            "pagamentos"    => (float) $sessao->movimentos->where("tipo", "pagamento")->sum("valor"),
            "reforcos"      => (float) $sessao->movimentos->where("tipo", "reforco")->sum("valor"),
            "sangrias"      => (float) $sessao->movimentos->where("tipo", "sangria")->sum("valor"),
            "despesas"      => (float) $sessao->movimentos->where("tipo", "despesa")->sum("valor"),
            "total_esperado"=> $sessao->total_esperado,
            "n_pagamentos"  => $sessao->movimentos->where("tipo", "pagamento")->count(),
        ];
        return response()->json(["sessao" => $sessao, "resumo" => $resumo]);
    }

    public function fechar(Request $request, CaixaSessao $sessao) {
        if ($sessao->status !== "aberta") {
            return response()->json(["message" => "Sessão já fechada."], 422);
        }
        $data = $request->validate([
            "total_contado"      => "required|numeric|min:0",
            "observacoes_fecho"  => "nullable|string|max:1000",
        ]);

        $esperado = $sessao->totalEsperadoCalculado();
        $sessao->update([
            "total_contado"     => $data["total_contado"],
            "total_esperado"    => $esperado,
            "diferenca"         => round((float) $data["total_contado"] - $esperado, 2),
            "observacoes_fecho" => $data["observacoes_fecho"] ?? null,
            "fechou_em"         => now(),
            "status"            => "fechada",
        ]);
        return response()->json($sessao->fresh());
    }

    public function sangria(Request $request, CaixaSessao $sessao) {
        return $this->registarMovimento($request, $sessao, "sangria", -1, true);
    }
    public function reforco(Request $request, CaixaSessao $sessao) {
        return $this->registarMovimento($request, $sessao, "reforco", 1, true);
    }
    public function despesa(Request $request, CaixaSessao $sessao) {
        return $this->registarMovimento($request, $sessao, "despesa", -1, true);
    }

    private function registarMovimento(Request $request, CaixaSessao $sessao, string $tipo, int $sentido, bool $exigeDescricao): \Illuminate\Http\JsonResponse {
        if ($sessao->status !== "aberta") {
            return response()->json(["message" => "Sessão não está aberta."], 422);
        }
        $rules = [
            "valor"     => "required|numeric|min:0.01",
            "metodo"    => "nullable|string|max:30",
            "descricao" => ($exigeDescricao ? "required" : "nullable") . "|string|max:250",
        ];
        $data = $request->validate($rules);

        $user = $request->attributes->get("auth_user");
        $mov = CaixaMovimento::create([
            "sessao_id"     => $sessao->id,
            "tipo"          => $tipo,
            "sentido"       => $sentido,
            "valor"         => $data["valor"],
            "metodo"        => $data["metodo"] ?? null,
            "descricao"     => $data["descricao"] ?? null,
            "operador_id"   => $user?->id ?? $sessao->operador_id,
            "operador_nome" => $user?->nome ?? $sessao->operador_nome,
        ]);

        // Recalcula total esperado
        $sessao->update(["total_esperado" => $sessao->totalEsperadoCalculado()]);

        return response()->json($mov, 201);
    }

    /**
     * PDF de fecho/relatório da sessão (funciona aberta ou fechada).
     * GET /caixa/{sessao}/fecho.pdf
     */
    public function pdfFecho(Request $request, CaixaSessao $sessao) {
        $sessao->load(["movimentos" => fn ($q) => $q->orderBy("created_at")]);
        $e = $request->attributes->get("escola");
        $escola = $e ? $e->toArray() : [];

        $pdf = Pdf::loadView("recibos.fecho_caixa", [
            "sessao" => $sessao,
            "escola" => $escola,
        ])->setPaper("a4", "portrait");

        $filename = "fecho-caixa-" . $sessao->codigo . ".pdf";
        return $request->boolean("download")
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    /**
     * Regista um pagamento dentro da sessão de caixa (chamado quando se confirma um pagamento via UI tradicional).
     * Ignora silenciosamente se não houver sessão activa para o operador.
     */
    public static function registarPagamentoNaSessao(Pagamento $pagamento, $user): ?CaixaMovimento {
        if (!$user || !$pagamento || $pagamento->status !== "pago") return null;
        $sessao = CaixaSessao::where("operador_id", $user->id)->where("status", "aberta")->latest("abriu_em")->first();
        if (!$sessao) return null;

        $valorPago = (float) $pagamento->valor + (float) ($pagamento->multa_valor ?? 0) - (float) ($pagamento->bolsa_valor ?? 0);
        if ($valorPago <= 0) return null;

        return DB::transaction(function () use ($pagamento, $sessao, $user, $valorPago) {
            $pagamento->update(["caixa_sessao_id" => $sessao->id]);
            $mov = CaixaMovimento::create([
                "sessao_id"     => $sessao->id,
                "pagamento_id"  => $pagamento->id,
                "tipo"          => "pagamento",
                "sentido"       => 1,
                "valor"         => round($valorPago, 2),
                "metodo"        => $pagamento->metodo,
                "descricao"     => "Pagamento " . ($pagamento->referencia ?? "PAG-" . $pagamento->id),
                "operador_id"   => $user->id,
                "operador_nome" => $user->nome,
            ]);
            $sessao->update(["total_esperado" => $sessao->totalEsperadoCalculado()]);
            return $mov;
        });
    }
}
