<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Turno;
use Illuminate\Http\Request;
class TurnoController extends Controller {
    public function index() {
        return response()->json(Turno::orderBy("hora_inicio")->get());
    }
    public function store(Request $request) {
        $request->validate(["nome" => "required", "hora_inicio" => "required", "hora_fim" => "required"]);
        return response()->json(Turno::create($request->only(["nome","codigo","hora_inicio","hora_fim","descricao","ativo"])), 201);
    }
    public function update(Request $request, Turno $turno) {
        $turno->update($request->only(["nome","codigo","hora_inicio","hora_fim","descricao","ativo"]));
        return response()->json($turno);
    }
    public function destroy(Turno $turno) {
        $turno->delete();
        return response()->json(["message" => "Turno eliminado."]);
    }
}
