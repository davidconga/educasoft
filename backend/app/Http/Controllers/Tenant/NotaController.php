<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Matricula;
use App\Models\Tenant\Nota;
use App\Models\Tenant\Turma;
use Illuminate\Http\Request;

class NotaController extends Controller {

    public function index(Request $request) {
        $query = Nota::with("aluno.user","disciplina","turma");
        if ($request->turma_id)      $query->where("turma_id",     $request->turma_id);
        if ($request->disciplina_id) $query->where("disciplina_id",$request->disciplina_id);
        if ($request->periodo)       $query->where("periodo",      $request->periodo);
        if ($request->ano_letivo)    $query->where("ano_letivo",   $request->ano_letivo);
        return response()->json($query->get());
    }

    public function store(Request $request) {
        $request->validate([
            "aluno_id"      => "required|exists:alunos,id",
            "disciplina_id" => "required|exists:disciplinas,id",
            "turma_id"      => "required|exists:turmas,id",
            "periodo"       => "required",
            "ano_letivo"    => "required",
            "mac"  => "nullable|numeric|min:0|max:20",
            "npp"  => "nullable|numeric|min:0|max:20",
            "npt"  => "nullable|numeric|min:0|max:20",
            //"falta_justificada"   => "nullable|integer|min:0",
            //"falta_injustificada" => "nullable|integer|min:0",
        ]);

        $mac = $request->mac !== null ? (float) $request->mac : null;
        $npp = $request->npp !== null ? (float) $request->npp : null;
        $npt = $request->npt !== null ? (float) $request->npt : null;
        $mt  = Nota::calcularMT($mac, $npp, $npt);
        $resultado = $mt !== null ? ($mt >= 10 ? "aprovado" : "reprovado") : "pendente";

        $nota = Nota::updateOrCreate(
            [
                "aluno_id"      => $request->aluno_id,
                "disciplina_id" => $request->disciplina_id,
                "turma_id"      => $request->turma_id,
                "periodo"       => $request->periodo,
                "ano_letivo"    => $request->ano_letivo,
            ],
            [
                "mac"                 => $mac,
                "npp"                 => $npp,
                "npt"                 => $npt,
                "nota_continua"       => $mt,
                "nota_exame"          => null,
                "media"               => $mt,
                "resultado"           => $resultado,
                "falta_justificada"   => $request->falta_justificada  ?? 0,
                "falta_injustificada" => $request->falta_injustificada ?? 0,
            ]
        );

        return response()->json(["message" => "Nota guardada.", "nota" => $nota->load("disciplina","aluno.user")]);
    }

    /** Bulk save — recebe array de notas */
    public function storeBulk(Request $request) {
        $request->validate(["notas" => "required|array"]);
        $saved = [];
        foreach ($request->notas as $item) {
            $mac = isset($item["mac"]) && $item["mac"] !== "" ? (float) $item["mac"] : null;
            $npp = isset($item["npp"]) && $item["npp"] !== "" ? (float) $item["npp"] : null;
            $npt = isset($item["npt"]) && $item["npt"] !== "" ? (float) $item["npt"] : null;
            $mt  = Nota::calcularMT($mac, $npp, $npt);
            $resultado = $mt !== null ? ($mt >= 10 ? "aprovado" : "reprovado") : "pendente";

            $nota = Nota::updateOrCreate(
                [
                    "aluno_id"      => $item["aluno_id"],
                    "disciplina_id" => $item["disciplina_id"],
                    "turma_id"      => $item["turma_id"],
                    "periodo"       => $item["periodo"],
                    "ano_letivo"    => $item["ano_letivo"],
                ],
                [
                    "mac"                 => $mac,
                    "npp"                 => $npp,
                    "npt"                 => $npt,
                    "nota_continua"       => $mt,
                    "nota_exame"          => null,
                    "media"               => $mt,
                    "resultado"           => $resultado,
                    "falta_justificada"   => $item["falta_justificada"]   ?? 0,
                    "falta_injustificada" => $item["falta_injustificada"] ?? 0,
                ]
            );
            $saved[] = $nota->id;
        }
        return response()->json(["message" => count($saved) . " notas guardadas."]);
    }

    /** Alunos matriculados + notas de uma disciplina (sem precisar de turma_disciplina) */
    public function porDisciplina(Request $request) {
        $request->validate([
            "turma_id"      => "required|exists:turmas,id",
            "disciplina_id" => "required|exists:disciplinas,id",
            "periodo"       => "required",
            "ano_letivo"    => "required",
        ]);

        $alunos = Matricula::with("aluno.user")
            ->where("turma_id", $request->turma_id)
            ->where("status", "activa")
            ->get()
            ->sortBy("aluno.user.nome")
            ->values();

        $notas = Nota::where("turma_id",      $request->turma_id)
            ->where("disciplina_id", $request->disciplina_id)
            ->where("periodo",       $request->periodo)
            ->where("ano_letivo",    $request->ano_letivo)
            ->get()
            ->keyBy("aluno_id");

        $rows = $alunos->map(function ($m, $idx) use ($notas) {
            $n = $notas->get($m->aluno_id);
            return [
                "ord"                 => $idx + 1,
                "id"                  => $m->aluno_id,
                "nome"                => $m->aluno?->user?->nome,
                "falta_justificada"   => $n?->falta_justificada   ?? "",
                "falta_injustificada" => $n?->falta_injustificada ?? "",
                "mac"                 => $n?->mac,
                "npp"                 => $n?->npp,
                "npt"                 => $n?->npt,
                "mt"                  => $n?->media,
                "resultado"           => $n?->resultado,
            ];
        });

        return response()->json(["alunos" => $rows]);
    }

    /** Estrutura completa para gerar/imprimir pauta (um trimestre) */
    public function pauta(Request $request) {
        $request->validate([
            "turma_id"   => "required|exists:turmas,id",
            "periodo"    => "required",
            "ano_letivo" => "required",
        ]);

        $turma = Turma::with([
            "classe.curso",
            "turnoObj",
            "disciplinas",
            "diretorTurma.user",
            "matriculas.aluno.user",
        ])->findOrFail($request->turma_id);

        $disciplinas = $turma->disciplinas->sortBy("nome")->values();

        $alunos = $turma->matriculas
            ->where("status", "activa")
            ->sortBy("aluno.user.nome")
            ->values()
            ->map(fn($m) => $m->aluno)
            ->filter();

        $notas = Nota::where("turma_id",  $request->turma_id)
            ->where("periodo",    $request->periodo)
            ->where("ano_letivo", $request->ano_letivo)
            ->get()
            ->keyBy(fn($n) => "{$n->aluno_id}|{$n->disciplina_id}");

        $alunoRows = $alunos->map(function ($aluno, $idx) use ($disciplinas, $notas) {
            $notasAluno = [];
            foreach ($disciplinas as $d) {
                $n = $notas->get("{$aluno->id}|{$d->id}");
                $notasAluno[$d->id] = $n ? [
                    "id"                  => $n->id,
                    "falta_justificada"   => $n->falta_justificada,
                    "falta_injustificada" => $n->falta_injustificada,
                    "mac"                 => $n->mac,
                    "npp"                 => $n->npp,
                    "npt"                 => $n->npt,
                    "mt"                  => $n->media,
                    "resultado"           => $n->resultado,
                ] : null;
            }
            return [
                "ord"          => $idx + 1,
                "id"           => $aluno->id,
                "numero_aluno" => $aluno->numero_aluno,
                "nome"         => $aluno->user?->nome,
                "notas"        => $notasAluno,
            ];
        })->values();

        return response()->json([
            "turma"       => [
                "id"        => $turma->id,
                "nome"      => $turma->nome,
                "ano_letivo"=> $turma->ano_letivo,
                "turno"     => $turma->turnoObj?->nome ?? $turma->turno,
                "classe"    => $turma->classe?->nome,
                "curso"     => $turma->classe?->curso?->nome,
                "diretor"   => $turma->diretorTurma?->user?->nome,
            ],
            "disciplinas" => $disciplinas->map(fn($d) => ["id" => $d->id, "nome" => $d->nome]),
            "alunos"      => $alunoRows,
            "periodo"     => $request->periodo,
            "ano_letivo"  => $request->ano_letivo,
        ]);
    }

    /**
     * Pauta anual — mostra MT1, MT2, MT3 e MF por aluno × disciplina.
     * Usado pelo endpoint GET /notas/pauta-anual
     */
    public function pautaAnual(Request $request) {
        $request->validate([
            "turma_id"   => "required|exists:turmas,id",
            "ano_letivo" => "required",
        ]);

        $turma = Turma::with([
            "classe.curso",
            "turnoObj",
            "disciplinas",
            "diretorTurma.user",
            "matriculas.aluno.user",
        ])->findOrFail($request->turma_id);

        $disciplinas = $turma->disciplinas->sortBy("nome")->values();

        $alunos = $turma->matriculas
            ->where("status", "activa")
            ->sortBy("aluno.user.nome")
            ->values()
            ->map(fn($m) => $m->aluno)
            ->filter();

        // Todas as notas do ano (3 trimestres)
        $notas = Nota::where("turma_id",  $request->turma_id)
            ->where("ano_letivo", $request->ano_letivo)
            ->whereIn("periodo", ["1","2","3"])
            ->get()
            ->groupBy(fn($n) => "{$n->aluno_id}|{$n->disciplina_id}");

        $alunoRows = $alunos->map(function ($aluno, $idx) use ($disciplinas, $notas) {
            $notasAluno = [];
            foreach ($disciplinas as $d) {
                $key   = "{$aluno->id}|{$d->id}";
                $grupo = $notas->get($key, collect())->keyBy("periodo");
                $mt1   = $grupo->get("1")?->media;
                $mt2   = $grupo->get("2")?->media;
                $mt3   = $grupo->get("3")?->media;
                $vals  = array_filter([$mt1, $mt2, $mt3], fn($v) => $v !== null);
                $mf    = count($vals) ? round(array_sum($vals) / count($vals), 2) : null;
                $notasAluno[$d->id] = compact("mt1","mt2","mt3","mf");
            }
            return [
                "ord"          => $idx + 1,
                "id"           => $aluno->id,
                "numero_aluno" => $aluno->numero_aluno,
                "nome"         => $aluno->user?->nome,
                "notas"        => $notasAluno,
            ];
        })->values();

        return response()->json([
            "turma"       => [
                "id"        => $turma->id,
                "nome"      => $turma->nome,
                "ano_letivo"=> $turma->ano_letivo,
                "turno"     => $turma->turnoObj?->nome ?? $turma->turno,
                "classe"    => $turma->classe?->nome,
                "curso"     => $turma->classe?->curso?->nome,
                "diretor"   => $turma->diretorTurma?->user?->nome,
            ],
            "disciplinas" => $disciplinas->map(fn($d) => ["id" => $d->id, "nome" => $d->nome]),
            "alunos"      => $alunoRows,
            "ano_letivo"  => $request->ano_letivo,
        ]);
    }

    public function boletim(Request $request, $alunoId) {
        $notas = Nota::with("disciplina","turma")
            ->where("aluno_id",   $alunoId)
            ->where("ano_letivo", $request->ano_letivo ?? date("Y"))
            ->get();
        return response()->json([
            "aluno_id"    => $alunoId,
            "notas"       => $notas,
            "media_geral" => $notas->avg("media"),
        ]);
    }
}
