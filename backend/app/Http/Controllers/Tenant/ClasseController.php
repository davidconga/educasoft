<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Classe;
use Illuminate\Http\Request;
class ClasseController extends Controller {
    public function index(\Illuminate\Http\Request $request) {
        $query = Classe::with("curso")->orderBy("ordem");
        if ($request->curso_id) $query->where("curso_id", $request->curso_id);
        return response()->json($query->get());
    }
    private function sanitize(Request $request): array {
        $data = $request->only(["nome","nivel","ordem","curso_id","descricao","ativo"]);
        if (array_key_exists("ordem", $data) && $data["ordem"] === "") $data["ordem"] = null;
        return $data;
    }

    public function store(Request $request) {
        $request->validate(["nome" => "required", "curso_id" => "required|exists:cursos,id"]);
        return response()->json(Classe::create($this->sanitize($request)), 201);
    }
    public function update(Request $request, Classe $classe) {
        $request->validate(["nome" => "required", "curso_id" => "required|exists:cursos,id"]);
        $classe->update($this->sanitize($request));
        return response()->json($classe->load("curso"));
    }
    public function destroy(Classe $classe) {
        $classe->delete();
        return response()->json(["message" => "Classe eliminada."]);
    }

    /** Disciplinas (catálogo global) que estão no plano curricular desta classe (match por código ou nome). */
    public function disciplinas(Classe $classe) {
        $planoEntries = \App\Models\Tenant\CursoDisciplina::where("classe_id", $classe->id)->get();
        if ($planoEntries->isEmpty()) {
            return response()->json([]);
        }
        $codigos = $planoEntries->pluck("codigo")->filter()->unique()->values();
        $nomes   = $planoEntries->pluck("nome")->filter()->unique()->values();

        $query = \App\Models\Tenant\Disciplina::query();
        $query->where(function ($q) use ($codigos, $nomes) {
            if ($codigos->isNotEmpty()) $q->orWhereIn("codigo", $codigos);
            if ($nomes->isNotEmpty())   $q->orWhereIn("nome",   $nomes);
        });
        return response()->json($query->orderBy("nome")->get());
    }
}
