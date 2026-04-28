<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Curso;
use App\Models\Tenant\CursoDisciplina;
use Illuminate\Http\Request;
class CursoController extends Controller {
    public function index() {
        return response()->json(Curso::withCount("disciplinas")->get());
    }
    public function store(Request $request) {
        $request->validate(["nome" => "required"]);
        $curso = Curso::create($request->only(["nome","codigo","area","duracao_anos","descricao","ativo"]));
        return response()->json($curso, 201);
    }
    public function show(Curso $curso) {
        return response()->json($curso->load("disciplinas"));
    }
    public function update(Request $request, Curso $curso) {
        $curso->update($request->only(["nome","codigo","area","duracao_anos","descricao","ativo"]));
        return response()->json($curso);
    }
    public function destroy(Curso $curso) {
        $curso->delete();
        return response()->json(["message" => "Curso eliminado."]);
    }
    // Plano Curricular
    public function disciplinas(Curso $curso) {
        return response()->json($curso->disciplinas()->orderBy("ano")->orderBy("semestre")->get());
    }
    public function storeDisciplina(Request $request, Curso $curso) {
        $request->validate(["nome" => "required"]);
        $disc = $curso->disciplinas()->create($request->only(["nome","codigo","carga_horaria","ano","semestre","obrigatoria","descricao"]));
        return response()->json($disc, 201);
    }
    public function updateDisciplina(Request $request, Curso $curso, CursoDisciplina $disciplina) {
        $disciplina->update($request->only(["nome","codigo","carga_horaria","ano","semestre","obrigatoria","descricao"]));
        return response()->json($disciplina);
    }
    public function destroyDisciplina(Curso $curso, CursoDisciplina $disciplina) {
        $disciplina->delete();
        return response()->json(["message" => "Disciplina removida."]);
    }
}
