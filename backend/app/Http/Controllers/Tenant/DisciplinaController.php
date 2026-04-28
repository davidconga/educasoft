<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Disciplina;
use Illuminate\Http\Request;
class DisciplinaController extends Controller {
    public function index() { return response()->json(Disciplina::all()); }
    public function store(Request $request) {
        $request->validate(["nome"=>"required","codigo"=>"nullable|unique:disciplinas"]);
        $disc = Disciplina::create($request->only(["nome","codigo","carga_horaria"]));
        return response()->json(["message"=>"Disciplina criada.","disciplina"=>$disc], 201);
    }
    public function update(Request $request, Disciplina $disciplina) {
        $disciplina->update($request->only(["nome","codigo","carga_horaria"]));
        return response()->json(["message"=>"Disciplina actualizada.","disciplina"=>$disciplina]);
    }
    public function destroy(Disciplina $disciplina) {
        $disciplina->delete();
        return response()->json(["message"=>"Disciplina removida."]);
    }
}
