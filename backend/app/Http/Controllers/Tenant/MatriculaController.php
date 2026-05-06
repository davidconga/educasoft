<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\AlunoDocumento;
use App\Models\Tenant\AlunoDocumentoEntrega;
use App\Models\Tenant\Classe;
use App\Models\Tenant\Matricula;
use App\Models\Tenant\TipoDocumento;
use App\Models\Tenant\Turma;
use App\Models\Tenant\User;
use App\Services\Central\LimitesPlanoService;
use App\Services\Tenant\AproveitamentoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MatriculaController extends Controller {
    public function index(Request $request) {
        $query = Matricula::with("aluno.user","turma.classe.curso");
        if ($request->turma_id)   $query->where("turma_id",   $request->turma_id);
        if ($request->ano_letivo) $query->where("ano_letivo", $request->ano_letivo);
        if ($request->status)     $query->where("status",     $request->status);
        if ($request->tipo)       $query->where("tipo",       $request->tipo);
        if ($request->search) {
            $query->whereHas("aluno.user", fn($q) =>
                $q->where("nome","like","%{$request->search}%")
            );
        }
        return response()->json($query->orderBy("created_at","desc")->paginate($request->per_page ?? 50));
    }

    /**
     * Inscrição. Se vier `aluno_id`, vincula a aluno existente (renovação manual / transferência).
     * Caso contrário cria User+Aluno+Matrícula numa transação.
     * Status default `pendente` (precisa de confirmação para virar `activa`).
     */
    public function store(Request $request) {
        $request->validate([
            "aluno_id"       => "nullable|exists:alunos,id",
            "turma_id"       => "required|exists:turmas,id",
            "ano_letivo"     => "required|string",
            "data_matricula" => "required|date",
            "status"         => "nullable|in:pendente,activa",
            "tipo"           => "nullable|in:nova,renovacao",
            "matricula_anterior_id" => "nullable|exists:matriculas,id",
        ]);

        if (!$request->aluno_id) {
            $request->validate([
                "nome"  => "required|string|max:255",
                "email" => "required|email|unique:users,email",
                "data_nascimento" => "nullable|date",
            ]);

            // Verificar limite de alunos do plano
            $escola = $request->attributes->get("escola");
            if ($escola) {
                $limite = (new LimitesPlanoService())->alunos($escola);
                if (!$limite["pode"]) {
                    return response()->json([
                        "message"     => $limite["mensagem"],
                        "code"        => "limite_alunos_atingido",
                        "limite"      => $limite,
                        "upgrade_url" => "/upgrade?feature=mais_alunos",
                    ], 422);
                }
            }
        }

        // Validação de capacidade da turma (sala manda; senão capacidade da turma)
        $turma = Turma::with("sala")->find($request->turma_id);
        if ($turma) {
            $cap  = $turma->capacidadeEfetiva();
            $ocup = $turma->ocupacao();
            if ($cap > 0 && $ocup >= $cap && !$request->boolean("forcar")) {
                return response()->json([
                    "message"     => "Turma {$turma->nome} sem vagas ({$ocup}/{$cap}).",
                    "turma_cheia" => true,
                    "turma"       => ["id"=>$turma->id, "nome"=>$turma->nome],
                    "capacidade"  => $cap,
                    "ocupacao"    => $ocup,
                ], 422);
            }
        }

        return DB::transaction(function () use ($request) {
            if ($request->aluno_id) {
                $aluno = Aluno::findOrFail($request->aluno_id);
            } else {
                $user = User::create([
                    "nome"     => $request->nome,
                    "email"    => $request->email,
                    "password" => bcrypt($request->password ?? "educasoft123"),
                    "tipo"     => "aluno",
                    "telefone" => $request->telefone,
                ]);
                $aluno = Aluno::create(array_merge(
                    array_filter(
                        $request->only([
                            "data_nascimento","genero","naturalidade","nacionalidade",
                            "bi","nome_pai","nome_mae","telefone_responsavel","endereco",
                        ]),
                        fn($v) => $v !== null && $v !== ""
                    ),
                    [
                        "user_id"      => $user->id,
                        "numero_aluno" => "A" . str_pad((string)(Aluno::count() + 1), 5, "0", STR_PAD_LEFT),
                    ]
                ));

                // Documento extendido (campos opcionais — só cria a linha se vier algum)
                $docInput = $request->input("documento", []);
                if (is_array($docInput) && count(array_filter($docInput, fn($v) => $v !== null && $v !== ""))) {
                    AlunoDocumento::create(array_merge(
                        ["aluno_id" => $aluno->id],
                        array_intersect_key($docInput, array_flip(AlunoDocumento::inputFields()))
                    ));
                }
            }

            $matricula = Matricula::create([
                "aluno_id"              => $aluno->id,
                "turma_id"              => $request->turma_id,
                "ano_letivo"            => $request->ano_letivo,
                "data_matricula"        => $request->data_matricula,
                "status"                => $request->status ?? "pendente",
                "tipo"                  => $request->tipo ?? "nova",
                "matricula_anterior_id" => $request->matricula_anterior_id,
            ]);

            return response()->json([
                "message"   => "Inscrição criada.",
                "matricula" => $matricula->load("aluno.user","turma.classe.curso"),
            ], 201);
        });
    }

    public function show(Matricula $matricula) {
        return response()->json($matricula->load("aluno.user","turma.classe.curso","matriculaAnterior.turma.classe"));
    }

    public function update(Request $request, Matricula $matricula) {
        $matricula->update($request->only(["turma_id","status","ano_letivo","aproveitamento_status"]));
        return response()->json(["message"=>"Matrícula actualizada.","matricula"=>$matricula->load("aluno.user","turma.classe.curso")]);
    }

    public function confirmar(Request $request, Matricula $matricula) {
        if ($matricula->status !== "pendente") {
            return response()->json(["message"=>"Só matrículas pendentes podem ser confirmadas."], 422);
        }

        // Verifica documentos obrigatórios + bloqueia_matricula no escopo do aluno
        $matricula->load("turma.classe","turma.sala");
        $cursoId  = $matricula->turma?->classe?->curso_id;
        $classeId = $matricula->turma?->classe_id;

        $bloqueantes = TipoDocumento::aplicaveisAo($cursoId, $classeId)
            ->where("obrigatorio", true)
            ->where("bloqueia_matricula", true);

        if ($bloqueantes->isNotEmpty()) {
            $entregues = AlunoDocumentoEntrega::where("aluno_id", $matricula->aluno_id)
                ->whereIn("tipo_documento_id", $bloqueantes->pluck("id"))
                ->where("entregue", true)
                ->pluck("tipo_documento_id");
            $faltam = $bloqueantes->whereNotIn("id", $entregues)->pluck("nome")->values()->all();
            if (!empty($faltam) && !$request->boolean("forcar")) {
                return response()->json([
                    "message" => "Faltam documentos obrigatórios: " . implode(", ", $faltam),
                    "documentos_em_falta" => $faltam,
                ], 422);
            }
        }

        $matricula->update(["status"=>"activa"]);
        return response()->json(["message"=>"Matrícula confirmada.","matricula"=>$matricula->load("aluno.user","turma.classe.curso")]);
    }

    public function cancelar(Matricula $matricula) {
        if (in_array($matricula->status, ["concluida","cancelada","reprovada"], true)) {
            return response()->json(["message"=>"Esta matrícula já está num estado final ({$matricula->status})."], 422);
        }
        $matricula->update(["status"=>"cancelada"]);
        return response()->json(["message"=>"Matrícula cancelada.","matricula"=>$matricula->load("aluno.user","turma.classe.curso")]);
    }

    public function reactivar(Request $request, Matricula $matricula) {
        if ($matricula->status !== "cancelada") {
            return response()->json(["message"=>"Só matrículas canceladas podem ser reactivadas (estado actual: {$matricula->status})."], 422);
        }
        // Reactivar passa de cancelada (não contada) para pendente (contada). Verifica vaga.
        $turma = $matricula->turma()->with("sala")->first();
        if ($turma) {
            $cap  = $turma->capacidadeEfetiva();
            $ocup = $turma->ocupacao();
            if ($cap > 0 && $ocup >= $cap && !$request->boolean("forcar")) {
                return response()->json([
                    "message"     => "Turma {$turma->nome} sem vagas ({$ocup}/{$cap}).",
                    "turma_cheia" => true,
                    "capacidade"  => $cap,
                    "ocupacao"    => $ocup,
                ], 422);
            }
        }
        $matricula->update(["status"=>"pendente"]);
        return response()->json([
            "message"   => "Matrícula reactivada — agora está pendente. Confirme para passar a activa.",
            "matricula" => $matricula->load("aluno.user","turma.classe.curso"),
        ]);
    }

    public function transferir(Request $request, Matricula $matricula) {
        if (in_array($matricula->status, ["concluida","cancelada","reprovada","transferida"], true)) {
            return response()->json(["message"=>"Esta matrícula já está num estado final ({$matricula->status})."], 422);
        }
        $request->validate([
            "turma_destino_id" => "nullable|exists:turmas,id",
            "motivo"           => "nullable|string|max:500",
        ]);

        // Se vier turma_destino_id → transferência interna (continua activa, muda turma)
        // Senão → transferida para fora (status=transferida, fim de jornada nesta escola)
        if ($request->turma_destino_id) {
            // Verifica vaga na turma destino
            $destino = Turma::with("sala")->find($request->turma_destino_id);
            if ($destino) {
                $cap  = $destino->capacidadeEfetiva();
                $ocup = $destino->ocupacao();
                if ($cap > 0 && $ocup >= $cap && !$request->boolean("forcar")) {
                    return response()->json([
                        "message"     => "Turma destino {$destino->nome} sem vagas ({$ocup}/{$cap}).",
                        "turma_cheia" => true,
                        "capacidade"  => $cap,
                        "ocupacao"    => $ocup,
                    ], 422);
                }
            }
            $matricula->update([
                "turma_id" => $request->turma_destino_id,
                "status"   => "activa",
            ]);
            $msg = "Aluno transferido para nova turma.";
        } else {
            $matricula->update(["status" => "transferida"]);
            $msg = "Matrícula marcada como transferida.";
        }
        return response()->json(["message"=>$msg,"matricula"=>$matricula->load("aluno.user","turma.classe.curso")]);
    }

    public function confirmarMultiplas(Request $request) {
        $request->validate(["ids"=>"required|array|min:1","ids.*"=>"integer|exists:matriculas,id"]);

        $matriculas = Matricula::whereIn("id", $request->ids)
            ->where("status","pendente")
            ->with("aluno.user","turma.classe")
            ->get();

        if (!$request->boolean("forcar")) {
            // Para cada matrícula, valida documentos obrigatórios bloqueantes
            $bloqueadas = [];
            foreach ($matriculas as $m) {
                $cursoId  = $m->turma?->classe?->curso_id;
                $classeId = $m->turma?->classe_id;
                $bloqueantes = TipoDocumento::aplicaveisAo($cursoId, $classeId)
                    ->where("obrigatorio", true)
                    ->where("bloqueia_matricula", true);
                if ($bloqueantes->isEmpty()) continue;

                $entregues = AlunoDocumentoEntrega::where("aluno_id", $m->aluno_id)
                    ->whereIn("tipo_documento_id", $bloqueantes->pluck("id"))
                    ->where("entregue", true)
                    ->pluck("tipo_documento_id");
                $faltam = $bloqueantes->whereNotIn("id", $entregues)->pluck("nome")->values()->all();
                if (!empty($faltam)) {
                    $bloqueadas[] = [
                        "matricula_id" => $m->id,
                        "aluno"        => $m->aluno?->user?->nome,
                        "faltam"       => $faltam,
                    ];
                }
            }

            if (!empty($bloqueadas)) {
                return response()->json([
                    "message"    => count($bloqueadas) . " matrícula(s) com documentos em falta.",
                    "bloqueadas" => $bloqueadas,
                ], 422);
            }
        }

        $count = Matricula::whereIn("id",$request->ids)->where("status","pendente")->update(["status"=>"activa"]);
        $matriculas = Matricula::whereIn("id",$request->ids)->with("aluno.user","turma.classe.curso")->get();
        return response()->json(["message"=>"Confirmadas {$count} matrícula(s).","confirmadas"=>$count,"matriculas"=>$matriculas]);
    }

    public function destroy(Matricula $matricula) {
        if ($matricula->status === "activa") {
            return response()->json(["message"=>"Não é possível eliminar uma matrícula activa."], 422);
        }
        $matricula->delete();
        return response()->json(["message"=>"Matrícula removida."]);
    }

    /**
     * Preview da renovação: para cada aluno do ano de origem, calcula aproveitamento
     * e sugere acção (criar activa na próxima classe, criar pendente para repetir, rejeitar, revisar).
     */
    public function renovarAnoPreview(Request $request, AproveitamentoService $svc) {
        $request->validate([
            "ano_origem"  => "required|string",
            "ano_destino" => "required|string|different:ano_origem",
            "turma_id"    => "nullable|exists:turmas,id",
            "classe_id"   => "nullable|exists:classes,id",
            "curso_id"    => "nullable|exists:cursos,id",
        ]);

        $query = Matricula::with("aluno.user","turma.classe.curso")
            ->where("ano_letivo", $request->ano_origem)
            ->whereIn("status", ["activa","concluida"]);
        if ($request->turma_id)  $query->where("turma_id", $request->turma_id);
        if ($request->classe_id) $query->whereHas("turma", fn($q) => $q->where("classe_id", $request->classe_id));
        if ($request->curso_id)  $query->whereHas("turma.classe", fn($q) => $q->where("curso_id", $request->curso_id));

        $resultados = $query->get()->map(function ($m) use ($svc, $request) {
            $apr = $svc->calcular($m->aluno_id, $request->ano_origem, $m->turma_id);
            return [
                "matricula_anterior_id" => $m->id,
                "aluno" => [
                    "id"           => $m->aluno?->id,
                    "nome"         => $m->aluno?->user?->nome,
                    "numero_aluno" => $m->aluno?->numero_aluno,
                ],
                "turma_anterior" => [
                    "id"     => $m->turma?->id,
                    "nome"   => $m->turma?->nome,
                    "classe" => $m->turma?->classe?->nome,
                    "curso"  => $m->turma?->classe?->curso?->nome,
                ],
                "aproveitamento" => $apr,
                "sugestao"       => $this->sugerirAcao($m, $apr),
            ];
        });

        return response()->json(["resultados" => $resultados]);
    }

    public function renovarAnoExecutar(Request $request) {
        $request->validate([
            "ano_destino" => "required|string",
            "decisoes"    => "required|array|min:1",
            "decisoes.*.aluno_id"              => "required|exists:alunos,id",
            "decisoes.*.matricula_anterior_id" => "required|exists:matriculas,id",
            "decisoes.*.acao"                  => "required|in:criar_activa,criar_pendente,rejeitar",
            "decisoes.*.turma_id"              => "nullable|exists:turmas,id",
            "decisoes.*.aproveitamento_status" => "nullable|in:aprovado,reprovado",
        ]);

        $criadas = 0; $rejeitadas = 0;

        DB::transaction(function () use ($request, &$criadas, &$rejeitadas) {
            foreach ($request->decisoes as $d) {
                $matAnterior = Matricula::find($d["matricula_anterior_id"]);
                if (!$matAnterior) continue;

                $matAnterior->update([
                    "aproveitamento_status" => $d["aproveitamento_status"] ?? null,
                    "status" => match($d["aproveitamento_status"] ?? null) {
                        "aprovado"  => "concluida",
                        "reprovado" => "reprovada",
                        default     => $matAnterior->status,
                    },
                ]);

                if ($d["acao"] === "rejeitar") { $rejeitadas++; continue; }

                if (empty($d["turma_id"])) {
                    throw new \InvalidArgumentException("turma_id obrigatório para acção {$d['acao']}.");
                }

                Matricula::create([
                    "aluno_id"              => $d["aluno_id"],
                    "turma_id"              => $d["turma_id"],
                    "ano_letivo"            => $request->ano_destino,
                    "data_matricula"        => now()->toDateString(),
                    "status"                => $d["acao"] === "criar_activa" ? "activa" : "pendente",
                    "tipo"                  => "renovacao",
                    "matricula_anterior_id" => $matAnterior->id,
                ]);
                $criadas++;
            }
        });

        return response()->json([
            "message"    => "Renovação processada.",
            "criadas"    => $criadas,
            "rejeitadas" => $rejeitadas,
        ]);
    }

    private function sugerirAcao(Matricula $matAnterior, array $apr): array {
        $status = $apr["status"] ?? "sem_regra";

        if ($status === "aprovado") {
            $classeAtual = $matAnterior->turma?->classe;
            if (!$classeAtual) return ["acao"=>"revisar","motivo"=>"Classe da matrícula anterior não encontrada"];

            $proxima = Classe::where("curso_id", $classeAtual->curso_id)
                ->where("ordem", ">", $classeAtual->ordem ?? 0)
                ->orderBy("ordem")
                ->first();

            return [
                "acao"               => "criar_activa",
                "classe_id_sugerida" => $proxima?->id,
                "classe_nome"        => $proxima?->nome ?? "(última do curso — concluído)",
                "motivo"             => "Aprovado · média geral " . ($apr["media_geral"] ?? "n/a"),
                "aproveitamento_status" => "aprovado",
            ];
        }

        if ($status === "reprovado") {
            $comp = $apr["comportamento_reprovado"] ?? "pendente_admin";
            if ($comp === "rejeita") {
                return ["acao"=>"rejeitar","motivo"=>"Reprovado (regra: rejeitar)","aproveitamento_status"=>"reprovado"];
            }
            return [
                "acao"               => "criar_pendente",
                "classe_id_sugerida" => $matAnterior->turma?->classe_id,
                "classe_nome"        => $matAnterior->turma?->classe?->nome,
                "motivo"             => "Reprovado · " . implode("; ", $apr["reprovacoes"] ?? []),
                "aproveitamento_status" => "reprovado",
            ];
        }

        return ["acao"=>"revisar","motivo"=>"Sem decisão automática (status: {$status})"];
    }
}
