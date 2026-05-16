<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\Matricula;
use App\Models\Tenant\Pagamento;
use App\Models\Tenant\PlanoPagamento;
use App\Models\Tenant\PrecarioPropina;
use App\Models\Tenant\PrecarioEmolumento;
use App\Models\Tenant\PrecarioMulta;
use App\Services\Central\VendusEmitter;
use App\Services\Tenant\FacturaSigner;
use App\Services\Tenant\MultaCalculator;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
class PagamentoController extends Controller {
    private static $MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    public function index(Request $request) {
        $query = Pagamento::with(
            "aluno.user",
            "aluno.matriculas.turma.classe.curso",
            "aluno.matriculas.turma.turnoObj",
            "plano",
            "propina",
            "emolumento"
        );
        if ($request->aluno_id)       $query->where("aluno_id",      $request->aluno_id);
        if ($request->status)         $query->where("status",        $request->status);
        if ($request->tipo)           $query->where("tipo",          $request->tipo);
        if ($request->mes_referencia) $query->where("mes_referencia",$request->mes_referencia);
        if ($request->ano_letivo)     $query->where("mes_referencia","like","%{$request->ano_letivo}%");
        if ($request->turma_id) {
            $alunoIds = Matricula::where("turma_id", $request->turma_id)->pluck("aluno_id");
            $query->whereIn("aluno_id", $alunoIds);
        }
        $pagamentos = $query->orderBy("created_at","desc")->paginate($request->per_page ?? 20);
        $this->inferirPropinasEmFalta($pagamentos->getCollection());
        $this->aplicarMultas($pagamentos->getCollection());
        return response()->json($pagamentos);
    }

    /**
     * Calcula a multa por atraso para cada pagamento (não pago) com data_vencimento ultrapassada,
     * aplicando a regra de PrecarioMulta compatível com o escopo. Anexa via setAttribute (não persiste).
     */
    private function aplicarMultas($pagamentos): void {
        MultaCalculator::aplicar($pagamentos);
    }

    /**
     * Fallback: para pagamentos sem propina_id, infere uma propina compatível
     * com a classe/curso do aluno e anexa via setRelation (sem persistir).
     * Aplica-se in-place na collection passada.
     */
    private function inferirPropinasEmFalta($pagamentos): void {
        $semPropina = $pagamentos->filter(fn($p) => $p->tipo === "mensalidade" && empty($p->propina_id));
        if ($semPropina->isEmpty()) return;

        $alunoIds = $semPropina->pluck("aluno_id")->filter()->unique()->values();
        $matriculasPorAluno = Matricula::with("turma.classe")
            ->whereIn("aluno_id", $alunoIds)
            ->orderByRaw("FIELD(status,'activa','pendente','concluida','reprovada','transferida','cancelada')")
            ->get()
            ->groupBy("aluno_id");

        $todasPropinas = PrecarioPropina::all();

        foreach ($semPropina as $pag) {
            $matricula = ($matriculasPorAluno[$pag->aluno_id] ?? collect())->first();
            $classe    = $matricula?->turma?->classe?->nome;
            $cursoId   = $matricula?->turma?->classe?->curso_id;

            $candidatas = $todasPropinas->filter(function ($p) use ($classe, $cursoId) {
                $okClasse = !$p->nivel    || $p->nivel === $classe;
                $okCurso  = !$p->curso_id || ($cursoId && (int)$p->curso_id === (int)$cursoId);
                return $okClasse && $okCurso;
            });

            $best = $candidatas->sortByDesc(function ($p) use ($classe, $cursoId) {
                $score = 0;
                if ($classe && $p->nivel === $classe)      $score += 4;
                if ($cursoId && (int)$p->curso_id === (int)$cursoId) $score += 2;
                if ($p->ano_letivo)                        $score += 1;
                return $score;
            })->first();

            if ($best) $pag->setRelation("propina", $best);
        }
    }

    public function store(Request $request) {
        $request->validate([
            "aluno_id"      => "required|exists:alunos,id",
            "valor"         => "required|numeric",
            "tipo"          => "required",
            "propina_id"    => "nullable|exists:precario_propinas,id",
            "emolumento_id" => "nullable|exists:precario_emolumentos,id",
            "plano_id"      => "nullable|exists:planos_pagamento,id",
            // Aceitar `offline_local_id` (apenas tracing — não é guardado).
            "offline_local_id" => "nullable|string|max:40",
        ]);
        $offlineLocalId = $request->input("offline_local_id");
        $data = array_merge(
            $request->only(["aluno_id","valor","tipo","mes_referencia","metodo","data_vencimento","observacao"]),
            [
                "plano_id"      => $request->plano_id      ?: null,
                "propina_id"    => $request->propina_id    ?: null,
                "emolumento_id" => $request->emolumento_id ?: null,
                "referencia"    => "PAG-".strtoupper(Str::random(8)),
                "status"        => "pendente",
                // Pagamento criado a partir de outbox offline → marcar para auditoria.
                "originado_offline" => $offlineLocalId !== null,
                "sincronizado_em"   => $offlineLocalId !== null ? now() : null,
            ]
        );
        $pag = Pagamento::create($data);
        if (\App\Services\Tenant\BolsaApplier::aplicar($pag) > 0) $pag->save();
        return response()->json($pag->load(
            "aluno.user",
            "aluno.matriculas.turma.classe.curso",
            "aluno.matriculas.turma.turnoObj",
            "plano","propina","emolumento","bolsa","financiador"
        ), 201);
    }

    public function show(Pagamento $pagamento) {
        return response()->json($pagamento->load("aluno.user", "aluno.matriculas.turma.classe.curso", "aluno.matriculas.turma.turnoObj"));
    }

    public function pagar(Request $request, Pagamento $pagamento) {
        $request->validate([
            "metodo"                 => "required|in:dinheiro,transferencia,multicaixa,referencia,carteira",
            "data_pagamento"         => "required|date",
            "num_referencia_externa" => "required_if:metodo,multicaixa,transferencia,referencia|nullable|string|max:100",
            "comprovativo"           => "nullable|file|mimes:pdf,jpg,jpeg,png|max:5120",
        ], [
            "num_referencia_externa.required_if" => "Para método :input, é obrigatório indicar o nº de referência.",
        ]);

        // Calcular multa no momento do pagamento (só se ainda não estava persistida)
        if ($pagamento->multa_valor <= 0) {
            $coll = collect([$pagamento]);
            $this->aplicarMultas($coll);
            if (($pagamento->multa_valor ?? 0) > 0) {
                $pagamento->multa_valor = $pagamento->multa_valor;
                $pagamento->multa_id    = $pagamento->multa_id;
            }
        }

        $totalAPagar  = (float)$pagamento->valor + (float)($pagamento->multa_valor ?? 0) - (float)($pagamento->bolsa_valor ?? 0);
        $valorCart    = $request->filled("valor_carteira") ? round((float)$request->valor_carteira, 2) : 0.0;

        // Pagamento via saldo em carteira → valida cobertura
        if ($request->metodo === "carteira") {
            $saldo = self::computeSaldoCarteira((int)$pagamento->aluno_id);
            if ($totalAPagar > $saldo + 0.001) {
                return response()->json([
                    "message"        => "Saldo em carteira insuficiente (necessário " . number_format($totalAPagar, 2, ',', '.') . " Kz, disponível " . number_format($saldo, 2, ',', '.') . " Kz).",
                    "saldo_carteira" => round($saldo, 2),
                ], 422);
            }
            $valorCart = 0; // metodo='carteira' já implica cobertura total — não usa o campo parcial
        } elseif ($valorCart > 0) {
            // Pagamento misto: parte do saldo + parte por outro método
            if ($valorCart > $totalAPagar + 0.001) {
                return response()->json([
                    "message" => "Valor da carteira (" . number_format($valorCart, 2, ',', '.') . " Kz) excede o total a pagar (" . number_format($totalAPagar, 2, ',', '.') . " Kz).",
                ], 422);
            }
            $saldo = self::computeSaldoCarteira((int)$pagamento->aluno_id);
            if ($valorCart > $saldo + 0.001) {
                return response()->json([
                    "message"        => "Saldo em carteira insuficiente (pretendido " . number_format($valorCart, 2, ',', '.') . " Kz, disponível " . number_format($saldo, 2, ',', '.') . " Kz).",
                    "saldo_carteira" => round($saldo, 2),
                ], 422);
            }
        }

        $data = [
            "status"                 => "pago",
            "metodo"                 => $request->metodo,
            "data_pagamento"         => $request->data_pagamento,
            "num_referencia_externa" => $request->num_referencia_externa,
            "multa_valor"            => (float)($pagamento->multa_valor ?? 0),
            "multa_id"               => $pagamento->multa_id ?? null,
            "valor_entregue"         => $request->filled("valor_entregue") ? (float)$request->valor_entregue : null,
            "valor_carteira"         => $valorCart > 0 ? $valorCart : null,
        ];
        if ($request->hasFile("comprovativo")) {
            $data["comprovativo"] = $request->file("comprovativo")->store("comprovativos", "public");
        }
        $pagamento->update($data);

        // Assina a factura com a chave única da plataforma Educajá
        try {
            (new FacturaSigner())->signPagamento($pagamento->fresh());
        } catch (\Throwable $e) {
            Log::warning("Falha ao assinar factura {$pagamento->id}: " . $e->getMessage());
        }

        // Vincula à sessão de caixa do operador (se houver)
        try {
            CaixaController::registarPagamentoNaSessao($pagamento->fresh(), $request->attributes->get("auth_user"));
        } catch (\Throwable $e) {
            Log::warning("Falha registar pagamento na caixa: " . $e->getMessage());
        }

        // Auto-emissão Vendus (best-effort; só corre se a escola tiver Vendus activo)
        $escola = $request->attributes->get("escola");
        if ($escola && $escola->vendus_ativo) {
            try {
                (new VendusEmitter())->emitirPagamento($pagamento->fresh()->load("aluno.user","emolumento"), $escola);
            } catch (\Throwable $e) {
                Log::warning("Falha auto-emissão Vendus pagamento {$pagamento->id}: " . $e->getMessage());
            }
        }

        // Troco → regista como crédito na carteira do aluno (considera multa no total devido,
        // descontando a parcela paga pela própria carteira em pagamento misto)
        if ($request->filled('valor_entregue')) {
            $totalDevido = (float) $pagamento->valor + (float) ($pagamento->multa_valor ?? 0) - (float)($pagamento->valor_carteira ?? 0);
            $troco = (float) $request->valor_entregue - $totalDevido;
            if ($troco > 0.009) {
                Pagamento::create([
                    'aluno_id'       => $pagamento->aluno_id,
                    'tipo'           => 'outro',
                    'valor'          => round($troco, 2),
                    'status'         => 'pago',
                    'metodo'         => $pagamento->metodo,
                    'data_pagamento' => $pagamento->data_pagamento,
                    'referencia'     => 'CRED-' . strtoupper(substr(uniqid(), -6)),
                    'observacao'     => 'Crédito — troco de ' . ($pagamento->referencia ?? $pagamento->id),
                ]);
            }
        }

        return response()->json([
            "message"   => "Pagamento confirmado.",
            "pagamento" => $pagamento->fresh()->load("aluno.user", "aluno.matriculas.turma.classe.curso", "aluno.matriculas.turma.turnoObj"),
        ]);
    }

    public function pagarMultiplos(Request $request) {
        $request->validate([
            "ids"                    => "required|array|min:1",
            "ids.*"                  => "integer|exists:pagamentos,id",
            "metodo"                 => "required|in:dinheiro,transferencia,multicaixa,referencia,carteira",
            "data_pagamento"         => "required|date",
            "num_referencia_externa" => "required_if:metodo,multicaixa,transferencia,referencia|nullable|string|max:100",
        ], [
            "num_referencia_externa.required_if" => "Para método :input, é obrigatório indicar o nº de referência.",
        ]);
        // Carrega os pagamentos pendentes para calcular multa de cada
        $pendentes = Pagamento::whereIn("id", $request->ids)->where("status", "pendente")->get();
        $this->aplicarMultas($pendentes);

        $totalLote   = $pendentes->sum(fn($p) => (float)$p->valor + (float)($p->multa_valor ?? 0) - (float)($p->bolsa_valor ?? 0));
        $valorCartLote = $request->filled("valor_carteira") ? round((float)$request->valor_carteira, 2) : 0.0;

        // Pagamento via saldo em carteira → valida cobertura total (assume 1 só aluno no lote)
        if ($request->metodo === "carteira" && $pendentes->isNotEmpty()) {
            $alunoId = $pendentes->first()->aluno_id;
            $saldo   = self::computeSaldoCarteira((int)$alunoId);
            if ($totalLote > $saldo + 0.001) {
                return response()->json([
                    "message"        => "Saldo em carteira insuficiente (necessário " . number_format($totalLote, 2, ',', '.') . " Kz, disponível " . number_format($saldo, 2, ',', '.') . " Kz).",
                    "saldo_carteira" => round($saldo, 2),
                ], 422);
            }
            $valorCartLote = 0; // 'carteira' já cobre tudo, não usar campo parcial
        } elseif ($valorCartLote > 0 && $pendentes->isNotEmpty()) {
            if ($valorCartLote > $totalLote + 0.001) {
                return response()->json([
                    "message" => "Valor da carteira (" . number_format($valorCartLote, 2, ',', '.') . " Kz) excede o total do lote (" . number_format($totalLote, 2, ',', '.') . " Kz).",
                ], 422);
            }
            $alunoId = $pendentes->first()->aluno_id;
            $saldo   = self::computeSaldoCarteira((int)$alunoId);
            if ($valorCartLote > $saldo + 0.001) {
                return response()->json([
                    "message"        => "Saldo em carteira insuficiente (pretendido " . number_format($valorCartLote, 2, ',', '.') . " Kz, disponível " . number_format($saldo, 2, ',', '.') . " Kz).",
                    "saldo_carteira" => round($saldo, 2),
                ], 422);
            }
        }

        // Gera lote_id único para agrupar todos os pagamentos deste batch
        $loteId = "LT-" . strtoupper(Str::random(10));
        $valorEntregueLote = $request->filled("valor_entregue") ? (float)$request->valor_entregue : null;
        $primeiro = true;
        $remainingCart = $valorCartLote;
        foreach ($pendentes as $p) {
            $totalP  = (float)$p->valor + (float)($p->multa_valor ?? 0) - (float)($p->bolsa_valor ?? 0);
            $applyP  = min($remainingCart, $totalP);
            $remainingCart -= $applyP;
            $p->update([
                "status"                 => "pago",
                "metodo"                 => $request->metodo,
                "data_pagamento"         => $request->data_pagamento,
                "num_referencia_externa" => $request->num_referencia_externa,
                "multa_valor"            => (float)($p->multa_valor ?? 0),
                "multa_id"               => $p->multa_id ?? null,
                "valor_entregue"         => $primeiro ? $valorEntregueLote : null,
                "valor_carteira"         => $applyP > 0 ? round($applyP, 2) : null,
                "lote_id"                => $loteId,
            ]);
            $primeiro = false;
        }

        // Assina cada pagamento (cadeia de hash mantida pela ordem dos IDs) com a chave global
        try {
            $signer = new FacturaSigner();
            foreach ($pendentes->fresh() as $p) $signer->signPagamento($p);
        } catch (\Throwable $e) {
            Log::warning("Falha ao assinar facturas do lote: " . $e->getMessage());
        }

        // Vincula cada pagamento do lote à sessão de caixa do operador (se houver)
        $authUser = $request->attributes->get("auth_user");
        foreach (Pagamento::whereIn("id", $request->ids)->get() as $p) {
            try { CaixaController::registarPagamentoNaSessao($p, $authUser); }
            catch (\Throwable $e) { Log::warning("Falha registar pagamento na caixa: " . $e->getMessage()); }
        }

        // Auto-emissão Vendus (best-effort) para cada pagamento do lote
        $escola = $request->attributes->get("escola");
        if ($escola && $escola->vendus_ativo) {
            $emitter = new VendusEmitter();
            foreach (Pagamento::whereIn("id", $request->ids)->with("aluno.user","emolumento")->get() as $p) {
                try { $emitter->emitirPagamento($p, $escola); }
                catch (\Throwable $e) { Log::warning("Falha auto-emissão Vendus pagamento {$p->id}: " . $e->getMessage()); }
            }
        }

        $pagamentos = Pagamento::whereIn("id", $request->ids)
            ->with("aluno.user", "aluno.matriculas.turma.classe.curso", "aluno.matriculas.turma.turnoObj")
            ->get();

        // Troco → regista como crédito na carteira do aluno (considera multas e parcela paga via carteira)
        if ($request->filled('valor_entregue')) {
            $totalPago = $pagamentos->sum(fn($p) => (float)$p->valor + (float)($p->multa_valor ?? 0) - (float)($p->valor_carteira ?? 0));
            $troco     = (float) $request->valor_entregue - $totalPago;
            if ($troco > 0.009) {
                $alunoId = $pagamentos->first()->aluno_id;
                Pagamento::create([
                    'aluno_id'       => $alunoId,
                    'tipo'           => 'outro',
                    'valor'          => round($troco, 2),
                    'status'         => 'pago',
                    'metodo'         => $request->metodo,
                    'data_pagamento' => $request->data_pagamento,
                    'referencia'     => 'CRED-' . strtoupper(substr(uniqid(), -6)),
                    'observacao'     => 'Crédito — troco de pagamento em massa',
                ]);
            }
        }

        return response()->json([
            "message"    => "Confirmados {$pagamentos->count()} pagamento(s).",
            "confirmados"=> $pagamentos->count(),
            "pagamentos" => $pagamentos,
        ]);
    }

    /**
     * Marca múltiplos pagamentos como `pago` em modo "histórico" — sem exigir
     * num_referencia_externa, comprovativo ou multa. Apenas disponível para
     * tenants com a flag `permite_pago_historico` activa (uso para reposição
     * de dados antigos vindos de sistemas legados).
     */
    public function pagarMultiplosHistorico(Request $request) {
        $escola = $request->attributes->get("escola");
        if (!$escola || !$escola->permite_pago_historico) {
            return response()->json([
                "message" => "Esta escola não tem o modo histórico activo."
            ], 403);
        }

        $request->validate([
            "ids"            => "required|array|min:1",
            "ids.*"          => "integer|exists:pagamentos,id",
            "data_pagamento" => "required|date",
            "metodo"         => "required|in:dinheiro,transferencia,multicaixa,referencia",
            "observacao"     => "nullable|string|max:255",
        ]);

        $authUser = $request->attributes->get("auth_user");
        $marcador = $authUser?->nome ?? "Sistema";
        $obsExtra = "[HISTÓRICO por {$marcador}]" . ($request->observacao ? " — " . $request->observacao : "");

        $loteId = "HIST-" . strtoupper(Str::random(10));
        $afetados = 0;

        $pendentes = Pagamento::whereIn("id", $request->ids)
            ->whereIn("status", ["pendente", "vencido", "estornado"])
            ->get();

        foreach ($pendentes as $p) {
            $obsFinal = trim(($p->observacao ? $p->observacao . " · " : "") . $obsExtra);
            $p->update([
                "status"         => "pago",
                "metodo"         => $request->metodo,
                "data_pagamento" => $request->data_pagamento,
                "lote_id"        => $loteId,
                "observacao"     => mb_substr($obsFinal, 0, 1000),
                "multa_valor"    => 0,
                "multa_id"       => null,
            ]);
            $afetados++;
        }

        return response()->json([
            "message"     => "Marcados {$afetados} pagamento(s) como histórico.",
            "afetados"    => $afetados,
            "ignorados"   => count($request->ids) - $afetados,
            "lote_id"     => $loteId,
        ]);
    }

    public function relatorio(Request $request) {
        $query = Pagamento::query();
        if ($request->aluno_id) $query->where("aluno_id", $request->aluno_id);
        if ($request->mes)      $query->where("mes_referencia", $request->mes);
        if ($request->ano_letivo) $query->where("mes_referencia","like","%{$request->ano_letivo}%");
        return response()->json([
            "total_pago"                => (clone $query)->where("status","pago")->sum("valor"),
            "total_pendente"            => (clone $query)->where("status","pendente")->sum("valor"),
            "total_vencido"             => (clone $query)->where("status","vencido")->sum("valor"),
            "total_alunos_inadimplentes"=> (clone $query)->whereIn("status",["pendente","vencido"])->distinct("aluno_id")->count("aluno_id"),
        ]);
    }

    public function planos() {
        return response()->json(PlanoPagamento::where("ativo", true)->get());
    }

    public function storePlano(Request $request) {
        $request->validate(["nome" => "required", "valor_mensalidade" => "required|numeric", "ano_letivo" => "required"]);
        $plano = PlanoPagamento::create($request->only(["nome","valor_matricula","valor_mensalidade","nivel","ano_letivo","ativo"]));
        return response()->json(["message" => "Plano criado.", "plano" => $plano], 201);
    }

    // ── Calendário: 12 meses com estado de pagamento ──
    public function calendario(Request $request) {
        $request->validate(["aluno_id" => "required", "ano_letivo" => "required"]);
        $pagsMes = Pagamento::with("propina")
            ->where("aluno_id", $request->aluno_id)
            ->where("tipo", "mensalidade")
            ->where("mes_referencia", "like", $request->ano_letivo."-%")
            ->get();

        // Fallback dinâmico para pagamentos sem propina_id + cálculo de multa
        $this->inferirPropinasEmFalta($pagsMes);
        $this->aplicarMultas($pagsMes);
        $pagsMes = $pagsMes->keyBy("mes_referencia");

        $calendario = [];
        for ($m = 1; $m <= 12; $m++) {
            $ref = $request->ano_letivo."-".str_pad($m, 2, "0", STR_PAD_LEFT);
            $calendario[] = [
                "mes"        => $m,
                "mes_nome"   => self::$MESES[$m - 1],
                "referencia" => $ref,
                "pagamento"  => $pagsMes->get($ref),
            ];
        }
        return response()->json($calendario);
    }

    // ── Gerar propinas mensais para um aluno ──
    public function gerarPropinas(Request $request) {
        $request->validate([
            "propina_id" => "required|exists:precario_propinas,id",
            "ano_letivo" => "required",
            "meses"      => "nullable|array",
            "meses.*"    => "integer|between:1,12",
        ]);

        $alunoIds = $request->aluno_id
            ? [$request->aluno_id]
            : Aluno::pluck("id")->all();

        $propina = PrecarioPropina::findOrFail($request->propina_id);
        $meses   = $request->meses ?? range(1, 12);
        $criados = 0;
        $pulados = 0;

        foreach ($alunoIds as $alunoId) {
            foreach ($meses as $mes) {
                $ref = $request->ano_letivo."-".str_pad($mes, 2, "0", STR_PAD_LEFT);
                $existe = Pagamento::where("aluno_id", $alunoId)
                    ->where("tipo", "mensalidade")
                    ->where("mes_referencia", $ref)
                    ->exists();
                if ($existe) { $pulados++; continue; }
                $vencimento = date("Y-m-t", mktime(0, 0, 0, $mes, 1, (int)$request->ano_letivo));
                $pag = Pagamento::create([
                    "aluno_id"      => $alunoId,
                    "propina_id"    => $propina->id,
                    "plano_id"      => null,
                    "referencia"    => "PROP-".strtoupper(Str::random(8)),
                    "valor"         => $propina->valor_mensal,
                    "tipo"          => "mensalidade",
                    "mes_referencia"=> $ref,
                    "metodo"        => "dinheiro",
                    "status"        => "pendente",
                    "data_vencimento"=> $vencimento,
                ]);
                if (\App\Services\Tenant\BolsaApplier::aplicar($pag) > 0) $pag->save();
                $criados++;
            }
        }
        return response()->json(["message" => "Gerados {$criados} pagamentos. {$pulados} já existiam.", "criados" => $criados, "pulados" => $pulados]);
    }

    // ── Gerar emolumentos obrigatórios para um aluno ──
    public function gerarEmolumentos(Request $request) {
        $request->validate(["ano_letivo" => "required"]);

        $alunoIds   = $request->aluno_id
            ? [$request->aluno_id]
            : Aluno::pluck("id")->all();

        $emolumentos = PrecarioEmolumento::where("obrigatorio", true)
            ->where("ano_letivo", $request->ano_letivo)
            ->get();

        if ($emolumentos->isEmpty()) {
            return response()->json(["message" => "Nenhum emolumento obrigatório para {$request->ano_letivo}.", "criados" => 0]);
        }

        $criados = 0;
        $pulados = 0;
        foreach ($alunoIds as $alunoId) {
            foreach ($emolumentos as $emol) {
                $existe = Pagamento::where("aluno_id", $alunoId)
                    ->where("tipo", "emolumento")
                    ->where("emolumento_id", $emol->id)
                    ->exists();
                if ($existe) { $pulados++; continue; }
                $pag = Pagamento::create([
                    "aluno_id"      => $alunoId,
                    "emolumento_id" => $emol->id,
                    "plano_id"      => null,
                    "referencia"    => "EMOL-".strtoupper(Str::random(8)),
                    "valor"         => $emol->valor,
                    "tipo"          => "emolumento",
                    "mes_referencia"=> (string)$request->ano_letivo,
                    "metodo"        => "dinheiro",
                    "status"        => "pendente",
                ]);
                if (\App\Services\Tenant\BolsaApplier::aplicar($pag) > 0) $pag->save();
                $criados++;
            }
        }
        return response()->json(["message" => "Gerados {$criados} emolumentos. {$pulados} já existiam.", "criados" => $criados, "pulados" => $pulados]);
    }

    /** GET /pagamentos/controlo-propinas?turma_id=X&ano_letivo=Y */
    public function controloPropinas(Request $request) {
        $request->validate(['turma_id' => 'required|exists:turmas,id', 'ano_letivo' => 'required']);

        $matriculas = Matricula::with('aluno.user')
            ->where('turma_id', $request->turma_id)
            ->where('status', 'activa')
            ->get()
            ->sortBy('aluno.user.nome')
            ->values();

        $alunoIds = $matriculas->pluck('aluno_id');

        // Extrai os anos numéricos do ano_letivo (ex: "2025-2026" → [2025,2026], "2025" → [2025])
        preg_match_all('/\d{4}/', $request->ano_letivo, $anosMatch);
        $anos = $anosMatch[0] ?? [];

        $pagamentos = Pagamento::whereIn('aluno_id', $alunoIds)
            ->where('tipo', 'mensalidade')
            ->where(function ($q) use ($request, $anos) {
                // Formato padrão: "2025-01"
                $q->where('mes_referencia', 'like', $request->ano_letivo . '-%');
                // Formato Golfinho: "Setembro 2025", "Outubro 2026", etc.
                foreach ($anos as $ano) {
                    $q->orWhere('mes_referencia', 'like', '% ' . $ano);
                }
            })
            ->get()
            ->groupBy('aluno_id');

        $meses = [];
        for ($m = 1; $m <= 12; $m++) {
            $meses[] = [
                'num'  => $m,
                'nome' => self::$MESES[$m - 1],
                'ref'  => $request->ano_letivo . '-' . str_pad($m, 2, '0', STR_PAD_LEFT),
            ];
        }

        $rows = $matriculas->map(function ($mat, $idx) use ($pagamentos, $meses, $anos) {
            $pagsMes   = $pagamentos->get($mat->aluno_id, collect())->keyBy('mes_referencia');
            $mesesData = [];
            foreach ($meses as $mes) {
                // 1) Tenta formato padrão "2025-01"
                $pag = $pagsMes->get($mes['ref']);
                // 2) Tenta formato Golfinho "Setembro 2025", "Setembro 2026", etc.
                if (!$pag) {
                    foreach ($anos as $ano) {
                        $pag = $pagsMes->get(self::$MESES[$mes['num'] - 1] . ' ' . $ano);
                        if ($pag) break;
                    }
                }
                $mesesData[$mes['ref']] = $pag
                    ? ['status' => $pag->status, 'id' => $pag->id, 'valor' => $pag->valor]
                    : null;
            }
            return [
                'ord'      => $idx + 1,
                'aluno_id' => $mat->aluno_id,
                'nome'     => $mat->aluno?->user?->nome,
                'meses'    => $mesesData,
            ];
        });

        return response()->json(['alunos' => $rows, 'meses' => $meses, 'ano_letivo' => $request->ano_letivo]);
    }

    /** GET /pagamentos/controlo-emolumentos?turma_id=X&ano_letivo=Y */
    public function controloEmolumentos(Request $request) {
        $request->validate(['turma_id' => 'required|exists:turmas,id', 'ano_letivo' => 'required']);

        $matriculas = Matricula::with('aluno.user')
            ->where('turma_id', $request->turma_id)
            ->where('status', 'activa')
            ->get()
            ->sortBy('aluno.user.nome')
            ->values();

        $alunoIds = $matriculas->pluck('aluno_id');

        preg_match_all('/\d{4}/', $request->ano_letivo, $anosMatch);
        $anos = $anosMatch[0] ?? [];

        $pagamentos = Pagamento::whereIn('aluno_id', $alunoIds)
            ->whereIn('tipo', ['emolumento', 'matricula'])
            ->where(function ($q) use ($request, $anos) {
                $q->where('mes_referencia', 'like', '%' . $request->ano_letivo . '%');
                foreach ($anos as $ano) {
                    $q->orWhere('mes_referencia', 'like', '%' . $ano . '%');
                }
                $q->orWhereNull('mes_referencia');
            })
            ->get();

        // Tipos distintos de emolumentos (pelo nome do serviço em observacao)
        $tipos = $pagamentos
            ->pluck('observacao')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        $pagsPorAluno = $pagamentos->groupBy('aluno_id');

        $rows = $matriculas->map(function ($mat, $idx) use ($pagsPorAluno, $tipos) {
            $pagsAluno = $pagsPorAluno->get($mat->aluno_id, collect());
            $emolData  = [];
            foreach ($tipos as $tipo) {
                $pag = $pagsAluno->where('observacao', $tipo)->first();
                $emolData[$tipo] = $pag
                    ? ['status' => $pag->status, 'id' => $pag->id, 'valor' => $pag->valor]
                    : null;
            }
            return [
                'ord'         => $idx + 1,
                'aluno_id'    => $mat->aluno_id,
                'nome'        => $mat->aluno?->user?->nome,
                'emolumentos' => $emolData,
            ];
        });

        return response()->json(['alunos' => $rows, 'tipos' => $tipos, 'ano_letivo' => $request->ano_letivo]);
    }

    /** PATCH /pagamentos/{pagamento}/estornar */
    public function estornar(Request $request, Pagamento $pagamento) {
        $request->validate(['motivo' => 'required|string|min:5']);

        if ($pagamento->status !== 'pago') {
            return response()->json(['message' => 'Só é possível estornar pagamentos com estado "pago".'], 422);
        }

        $operador = $request->attributes->get('auth_user')?->nome ?? 'Sistema';

        // Marca como estornado (mantém histórico) e repõe como pendente
        $pagamento->update([
            'status'          => 'estornado',
            'estorno_motivo'  => $request->motivo,
            'estornado_em'    => now(),
            'estornado_por'   => $operador,
            'data_pagamento'  => null,
            'comprovativo'    => null,
        ]);

        return response()->json([
            'message'   => 'Pagamento estornado. Pode agora ser pago novamente.',
            'pagamento' => $pagamento->fresh()->load('aluno.user'),
        ]);
    }

    public function emitirVendus(Request $request, Pagamento $pagamento) {
        $escola = $request->attributes->get("escola");
        if (!$escola) {
            return response()->json(["ok" => false, "erro" => "Escola não detectada."], 422);
        }
        $pagamento->load("aluno.user","emolumento");
        $r = (new VendusEmitter())->emitirPagamento($pagamento, $escola);
        return response()->json([
            "ok"        => $r["ok"],
            "pagamento" => $r["pagamento"],
            "erro"      => $r["erro"],
        ], $r["ok"] ? 200 : 422);
    }

    public function emitirNotaCreditoVendus(Request $request, Pagamento $pagamento) {
        $escola = $request->attributes->get("escola");
        if (!$escola) {
            return response()->json(["ok" => false, "erro" => "Escola não detectada."], 422);
        }
        $data = $request->validate([
            "motivo" => ["required","string","min:5","max:500"],
        ]);
        $pagamento->load("aluno.user","emolumento");
        $r = (new VendusEmitter())->emitirNotaCredito($pagamento, $escola, $data["motivo"]);
        return response()->json([
            "ok"        => $r["ok"],
            "pagamento" => $r["pagamento"],
            "erro"      => $r["erro"],
        ], $r["ok"] ? 200 : 422);
    }

    /** GET /pagamentos/carteira/{aluno} */
    public function carteira(Request $request, $alunoId) {
        $pagamentos = Pagamento::where('aluno_id', $alunoId)
            ->with(
                'aluno.user',
                'aluno.matriculas.turma.classe.curso',
                'aluno.matriculas.turma.turnoObj'
            )
            ->orderBy('created_at', 'desc')
            ->get();

        // Total pago em propinas/emolumentos/matrículas (exclui movimentos puros de carteira).
        $totalPago = $pagamentos
            ->where('status', 'pago')
            ->whereNotIn('tipo', ['deposito','levantamento'])
            ->sum('valor');
        $totalPendente  = $pagamentos->whereIn('status', ['pendente', 'vencido'])->sum('valor');
        $totalEstornado = $pagamentos->where('status', 'estornado')->sum('valor');
        $saldo          = $totalPago - $totalPendente;

        $saldoCarteira = self::computeSaldoCarteira($pagamentos);

        $porTipo = $pagamentos->groupBy('tipo')->map(fn($g) => [
            'total'   => $g->sum('valor'),
            'pago'    => $g->where('status', 'pago')->sum('valor'),
            'pendente'=> $g->whereIn('status', ['pendente', 'vencido'])->sum('valor'),
            'count'   => $g->count(),
        ]);

        return response()->json([
            'aluno'          => $pagamentos->first()?->aluno,
            'resumo'         => [
                'total_pago'      => $totalPago,
                'total_pendente'  => $totalPendente,
                'total_estornado' => $totalEstornado,
                'saldo'           => $saldo,
                'saldo_carteira'  => round($saldoCarteira, 2),
            ],
            'por_tipo'       => $porTipo,
            'pagamentos'     => $pagamentos,
        ]);
    }

    /**
     * Saldo em carteira (verdadeiro): entradas (depósitos + créditos de troco)
     * menos saídas (levantamentos + pagamentos liquidados via carteira).
     * Aceita uma colecção ou um aluno_id — em ambos os casos opera só sobre status='pago'.
     */
    public static function computeSaldoCarteira($pagamentosOuAluno): float {
        $col = is_numeric($pagamentosOuAluno)
            ? Pagamento::where('aluno_id', $pagamentosOuAluno)->where('status','pago')->get()
            : collect($pagamentosOuAluno)->where('status','pago');

        $entradas = $col->filter(fn($p) =>
            $p->tipo === 'deposito'
            || ($p->tipo === 'outro' && str_starts_with((string)$p->referencia, 'CRED-'))
        )->sum('valor');

        // Saídas plenas: levantamentos e pagamentos cobertos 100% pela carteira
        $saidas = $col->filter(fn($p) =>
            $p->tipo === 'levantamento' || $p->metodo === 'carteira'
        )->sum(fn($p) =>
            $p->tipo === 'levantamento'
                ? (float)$p->valor
                : (float)$p->valor + (float)($p->multa_valor ?? 0) - (float)($p->bolsa_valor ?? 0)
        );

        // Saídas parciais: pagamentos mistos (cash + carteira) onde só uma parte saiu da carteira
        $saidas += $col->filter(fn($p) =>
            !in_array($p->tipo, ['deposito','levantamento'], true)
            && $p->metodo !== 'carteira'
            && (float)($p->valor_carteira ?? 0) > 0
        )->sum('valor_carteira');

        return (float)$entradas - (float)$saidas;
    }

    /** POST /pagamentos/carteira/{alunoId}/depositar */
    public function depositarCarteira(Request $request, $alunoId) {
        $authUser = $request->attributes->get("auth_user");
        if ($authUser && $authUser->tipo !== "admin" && !in_array("carteira_depositar", (array)($authUser->permissoes ?? []), true)) {
            return response()->json(["message" => "Sem permissão para depositar em carteira."], 403);
        }

        $request->validate([
            "valor"                  => "required|numeric|gt:0",
            "metodo"                 => "required|in:dinheiro,transferencia,multicaixa,referencia",
            "data_pagamento"         => "nullable|date",
            "num_referencia_externa" => "required_if:metodo,multicaixa,transferencia,referencia|nullable|string|max:100",
            "observacao"             => "nullable|string|max:500",
            "offline_lote_ref"       => "nullable|string|max:40",
            "offline_data_pagamento" => "nullable|date",
        ], [
            "num_referencia_externa.required_if" => "Para método :input, é obrigatório indicar o nº de referência.",
        ]);

        if (!Aluno::where("id", $alunoId)->exists()) {
            return response()->json(["message" => "Aluno não encontrado."], 404);
        }

        $isOffline      = $request->filled("offline_lote_ref") || $request->filled("offline_data_pagamento");
        $dataPagamento  = $request->filled("offline_data_pagamento")
            ? \Carbon\Carbon::parse($request->input("offline_data_pagamento"))->toDateString()
            : ($request->data_pagamento ?: now()->toDateString());

        $pag = Pagamento::create([
            "aluno_id"               => $alunoId,
            "tipo"                   => "deposito",
            "valor"                  => round((float)$request->valor, 2),
            "status"                 => "pago",
            "metodo"                 => $request->metodo,
            "data_pagamento"         => $dataPagamento,
            "num_referencia_externa" => $request->num_referencia_externa,
            "referencia"             => "DEP-" . strtoupper(Str::random(8)),
            "observacao"             => $request->observacao ?: "Depósito em carteira",
            "originado_offline"      => $isOffline,
            "lote_offline_ref"       => $request->input("offline_lote_ref"),
            "sincronizado_em"        => $isOffline ? now() : null,
        ]);

        try { CaixaController::registarPagamentoNaSessao($pag->fresh(), $request->attributes->get("auth_user")); }
        catch (\Throwable $e) { Log::warning("Caixa: falha registar depósito {$pag->id}: " . $e->getMessage()); }

        return response()->json([
            "message"   => "Depósito registado.",
            "pagamento" => $pag->fresh()->load("aluno.user"),
            "saldo_carteira" => round(self::computeSaldoCarteira((int)$alunoId), 2),
        ], 201);
    }

    /** POST /pagamentos/carteira/{alunoId}/levantar */
    public function levantarCarteira(Request $request, $alunoId) {
        $authUser = $request->attributes->get("auth_user");
        if ($authUser && $authUser->tipo !== "admin" && !in_array("carteira_levantar", (array)($authUser->permissoes ?? []), true)) {
            return response()->json(["message" => "Sem permissão para levantar de carteira."], 403);
        }

        $request->validate([
            "valor"          => "required|numeric|min:1",
            "data_pagamento" => "nullable|date",
            "observacao"     => "nullable|string|max:500",
            "offline_lote_ref"       => "nullable|string|max:40",
            "offline_data_pagamento" => "nullable|date",
        ]);

        if (!Aluno::where("id", $alunoId)->exists()) {
            return response()->json(["message" => "Aluno não encontrado."], 404);
        }

        $valor = round((float)$request->valor, 2);
        $saldo = self::computeSaldoCarteira((int)$alunoId);
        if ($valor > $saldo + 0.001) {
            return response()->json([
                "message"        => "Saldo em carteira insuficiente.",
                "saldo_carteira" => round($saldo, 2),
            ], 422);
        }

        $isOffline     = $request->filled("offline_lote_ref") || $request->filled("offline_data_pagamento");
        $dataPagamento = $request->filled("offline_data_pagamento")
            ? \Carbon\Carbon::parse($request->input("offline_data_pagamento"))->toDateString()
            : ($request->data_pagamento ?: now()->toDateString());

        $pag = Pagamento::create([
            "aluno_id"       => $alunoId,
            "tipo"           => "levantamento",
            "valor"          => $valor,
            "status"         => "pago",
            "metodo"         => "dinheiro",
            "data_pagamento" => $dataPagamento,
            "referencia"     => "LEV-" . strtoupper(Str::random(8)),
            "observacao"     => $request->observacao ?: "Levantamento de saldo em carteira",
            "originado_offline" => $isOffline,
            "lote_offline_ref"  => $request->input("offline_lote_ref"),
            "sincronizado_em"   => $isOffline ? now() : null,
        ]);

        try { CaixaController::registarPagamentoNaSessao($pag->fresh(), $request->attributes->get("auth_user")); }
        catch (\Throwable $e) { Log::warning("Caixa: falha registar levantamento {$pag->id}: " . $e->getMessage()); }

        return response()->json([
            "message"        => "Levantamento registado.",
            "pagamento"      => $pag->fresh()->load("aluno.user"),
            "saldo_carteira" => round(self::computeSaldoCarteira((int)$alunoId), 2),
        ], 201);
    }

    public function relatorioFinanceiro(Request $request) {
        $query = Pagamento::query();

        if ($request->ano_letivo) $query->where('mes_referencia', 'like', "%{$request->ano_letivo}%");
        if ($request->tipo)       $query->where('tipo', $request->tipo);
        if ($request->turma_id) {
            $alunoIds = Matricula::where('turma_id', $request->turma_id)->pluck('aluno_id');
            $query->whereIn('aluno_id', $alunoIds);
        }

        $pagamentos = $query->get();

        $pago     = $pagamentos->where('status', 'pago');
        $pendente = $pagamentos->where('status', 'pendente');
        $vencido  = $pagamentos->where('status', 'vencido');

        $porTipo = $pagamentos->groupBy('tipo')->map(fn($g) => [
            'pago'     => $g->where('status', 'pago')->sum('valor'),
            'pendente' => $g->whereIn('status', ['pendente', 'vencido'])->sum('valor'),
            'count'    => $g->count(),
        ]);

        $porMetodo = $pago->groupBy('metodo')->map(fn($g) => [
            'total' => round($g->sum('valor'), 2),
            'count' => $g->count(),
        ])->sortByDesc('total');

        $evolucaoMensal = $pago
            ->filter(fn($p) => $p->data_pagamento)
            ->groupBy(fn($p) => substr($p->data_pagamento, 0, 7))
            ->map(fn($g) => ['total' => round($g->sum('valor'), 2), 'count' => $g->count()])
            ->sortKeys();

        return response()->json([
            'resumo' => [
                'total_pago'        => round($pago->sum('valor'), 2),
                'total_pendente'    => round($pendente->sum('valor'), 2),
                'total_vencido'     => round($vencido->sum('valor'), 2),
                'inadimplentes'     => $pagamentos->whereIn('status', ['pendente', 'vencido'])->pluck('aluno_id')->unique()->count(),
                'count_recebidos'   => $pago->count(),
                'count_pendentes'   => $pendente->count() + $vencido->count(),
            ],
            'por_tipo'        => $porTipo,
            'por_metodo'      => $porMetodo,
            'evolucao_mensal' => $evolucaoMensal,
        ]);
    }

    public function relatorioDiario(Request $request) {
        $data = $request->data ?? now()->toDateString();

        $pagamentos = Pagamento::with('aluno.user', 'aluno.matriculas.turma.classe.curso', 'aluno.matriculas.turma.turnoObj')
            ->where('status', 'pago')
            ->whereDate('data_pagamento', $data)
            ->orderBy('data_pagamento', 'asc')
            ->get();

        $total = $pagamentos->sum('valor');

        $porMetodo = $pagamentos->groupBy('metodo')->map(fn($g) => [
            'count' => $g->count(),
            'total' => $g->sum('valor'),
        ]);

        $porTipo = $pagamentos->groupBy('tipo')->map(fn($g) => [
            'count' => $g->count(),
            'total' => $g->sum('valor'),
        ]);

        return response()->json([
            'data'       => $data,
            'total'      => $total,
            'count'      => $pagamentos->count(),
            'por_metodo' => $porMetodo,
            'por_tipo'   => $porTipo,
            'pagamentos' => $pagamentos,
        ]);
    }
}
