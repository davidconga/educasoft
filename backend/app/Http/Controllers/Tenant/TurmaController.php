<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Turma;
use Illuminate\Http\Request;
class TurmaController extends Controller {
    public function index(Request $request) {
        $query = Turma::with("classe.curso")->withCount("matriculas");
        if ($request->ano_letivo) $query->where("ano_letivo", $request->ano_letivo);
        if ($request->classe_id)  $query->where("classe_id",  $request->classe_id);
        if ($request->curso_id) {
            $query->whereHas("classe", fn($q) => $q->where("curso_id", $request->curso_id));
        }
        return response()->json($query->orderBy("nome")->get());
    }
    private function sanitize(Request $request): array {
        $data = $request->only(["nome","nivel","turno","turno_id","ano_letivo","capacidade","classe_id","sala_id","diretor_turma_id","descricao","ativo"]);
        foreach (["turno_id","classe_id","sala_id","diretor_turma_id","capacidade"] as $field) {
            if (array_key_exists($field, $data) && $data[$field] === "") {
                $data[$field] = null;
            }
        }
        return $data;
    }

    public function store(Request $request) {
        $request->validate(["nome" => "required", "ano_letivo" => "required"]);
        $turma = Turma::create($this->sanitize($request));
        return response()->json($turma->load("turnoObj","sala","classe","diretorTurma.user"), 201);
    }
    public function show(Turma $turma) {
        return response()->json($turma->load("alunos.user","disciplinas.professores.user","horarios.disciplina","horarios.professor.user","turnoObj","sala","classe","diretorTurma.user"));
    }
    public function update(Request $request, Turma $turma) {
        $turma->update($this->sanitize($request));
        return response()->json($turma->load("turnoObj","sala","classe","diretorTurma.user"));
    }
    public function destroy(Turma $turma) {
        $turma->delete();
        return response()->json(["message" => "Turma removida."]);
    }
    public function atribuirDisciplina(Request $request, Turma $turma) {
        $request->validate(["disciplina_id" => "required|exists:disciplinas,id", "professor_id" => "required|exists:professores,id"]);
        $turma->disciplinas()->syncWithoutDetaching([$request->disciplina_id => ["professor_id" => $request->professor_id]]);
        return response()->json(["message" => "Disciplina atribuída à turma."]);
    }

}
