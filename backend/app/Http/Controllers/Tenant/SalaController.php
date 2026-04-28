<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Sala;
use Illuminate\Http\Request;
class SalaController extends Controller {
    public function index() {
        return response()->json(Sala::orderBy("tipo")->orderBy("nome")->get());
    }
    public function store(Request $request) {
        $request->validate(["nome" => "required"]);
        return response()->json(Sala::create($request->only(["nome","tipo","capacidade","localizacao","descricao","ativo"])), 201);
    }
    public function update(Request $request, Sala $sala) {
        $sala->update($request->only(["nome","tipo","capacidade","localizacao","descricao","ativo"]));
        return response()->json($sala);
    }
    public function destroy(Sala $sala) {
        $sala->delete();
        return response()->json(["message" => "Sala eliminada."]);
    }
}
