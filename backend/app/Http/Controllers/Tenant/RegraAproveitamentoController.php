<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\RegraAproveitamento;
use Illuminate\Http\Request;

class RegraAproveitamentoController extends Controller {
    public function index(Request $request) {
        $query = RegraAproveitamento::with("curso","classe");
        if ($request->has("ativa")) $query->where("ativa", filter_var($request->ativa, FILTER_VALIDATE_BOOLEAN));
        if ($request->nivel_ensino) $query->where("nivel_ensino", $request->nivel_ensino);
        if ($request->curso_id)     $query->where("curso_id",     $request->curso_id);
        if ($request->classe_id)    $query->where("classe_id",    $request->classe_id);
        if ($request->ano_letivo)   $query->where("ano_letivo",   $request->ano_letivo);
        return response()->json($query->orderByDesc("prioridade")->orderByDesc("id")->paginate($request->per_page ?? 50));
    }

    public function store(Request $request) {
        $data = $this->validateData($request);
        $regra = RegraAproveitamento::create($data);
        return response()->json(["message"=>"Regra criada.","regra"=>$regra->load("curso","classe")], 201);
    }

    public function show(RegraAproveitamento $regrasAproveitamento) {
        return response()->json($regrasAproveitamento->load("curso","classe"));
    }

    public function update(Request $request, RegraAproveitamento $regrasAproveitamento) {
        $data = $this->validateData($request);
        $regrasAproveitamento->update($data);
        return response()->json(["message"=>"Regra actualizada.","regra"=>$regrasAproveitamento->load("curso","classe")]);
    }

    public function destroy(RegraAproveitamento $regrasAproveitamento) {
        $regrasAproveitamento->delete();
        return response()->json(["message"=>"Regra removida."]);
    }

    private function validateData(Request $request): array {
        return $request->validate([
            "nome"         => "required|string|max:255",
            "descricao"    => "nullable|string",
            "ativa"        => "boolean",
            "prioridade"   => "integer",
            "nivel_ensino" => "nullable|string|max:255",
            "curso_id"     => "nullable|exists:cursos,id",
            "classe_id"    => "nullable|exists:classes,id",
            "ano_letivo"   => "nullable|string|max:255",
            "config"       => "required|array",
            "config.criterios_aprovacao"     => "required|array",
            "config.comportamento_reprovado" => "required|in:repete,rejeita,pendente_admin",
        ]);
    }
}
