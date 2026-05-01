<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\TipoDocumento;
use Illuminate\Http\Request;

class TipoDocumentoController extends Controller {
    public function index(Request $request) {
        $q = TipoDocumento::with("curso","classe");
        if ($request->has("ativo"))  $q->where("ativo", filter_var($request->ativo, FILTER_VALIDATE_BOOLEAN));
        if ($request->curso_id)      $q->where("curso_id",  $request->curso_id);
        if ($request->classe_id)     $q->where("classe_id", $request->classe_id);
        if ($request->obrigatorio)   $q->where("obrigatorio", filter_var($request->obrigatorio, FILTER_VALIDATE_BOOLEAN));
        return response()->json($q->orderBy("ordem")->orderBy("nome")->paginate($request->per_page ?? 100));
    }

    public function store(Request $request) {
        $data = $this->validateData($request);
        $tipo = TipoDocumento::create($data);
        return response()->json(["message"=>"Tipo criado.","tipo"=>$tipo->load("curso","classe")], 201);
    }

    public function show(TipoDocumento $tiposDocumento) {
        return response()->json($tiposDocumento->load("curso","classe"));
    }

    public function update(Request $request, TipoDocumento $tiposDocumento) {
        $data = $this->validateData($request);
        $tiposDocumento->update($data);
        return response()->json(["message"=>"Tipo actualizado.","tipo"=>$tiposDocumento->load("curso","classe")]);
    }

    public function destroy(TipoDocumento $tiposDocumento) {
        $tiposDocumento->delete();
        return response()->json(["message"=>"Tipo removido."]);
    }

    private function validateData(Request $request): array {
        return $request->validate([
            "nome"               => "required|string|max:255",
            "descricao"          => "nullable|string",
            "obrigatorio"        => "boolean",
            "bloqueia_matricula" => "boolean",
            "aceita_upload"      => "boolean",
            "ativo"              => "boolean",
            "ordem"              => "integer",
            "curso_id"           => "nullable|exists:cursos,id",
            "classe_id"          => "nullable|exists:classes,id",
        ]);
    }
}
