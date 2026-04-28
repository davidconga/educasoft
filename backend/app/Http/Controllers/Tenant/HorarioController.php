<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Horario;
use App\Models\Tenant\Turma;
use Illuminate\Http\Request;
class HorarioController extends Controller {
    public function index(Request $request) {
        $query = Horario::with("turma","disciplina","professor.user");
        if ($request->turma_id) $query->where("turma_id",$request->turma_id);
        if ($request->professor_id) $query->where("professor_id",$request->professor_id);
        return response()->json($query->get());
    }
    public function store(Request $request) {
        $request->validate(["turma_id"=>"required|exists:turmas,id","disciplina_id"=>"required|exists:disciplinas,id","professor_id"=>"required|exists:professores,id","dia_semana"=>"required","hora_inicio"=>"required","hora_fim"=>"required"]);
        $conflito = Horario::where("professor_id",$request->professor_id)->where("dia_semana",$request->dia_semana)->where(function($q) use ($request) {
            $q->whereBetween("hora_inicio",[$request->hora_inicio,$request->hora_fim])->orWhereBetween("hora_fim",[$request->hora_inicio,$request->hora_fim]);
        })->exists();
        if ($conflito) return response()->json(["message"=>"Conflito de horário para este professor."], 422);
        $horario = Horario::create($request->only(["turma_id","disciplina_id","professor_id","dia_semana","hora_inicio","hora_fim","sala"]));

        // Ao criar horário, registar automaticamente professor↔disciplina↔turma
        $turma = Turma::find($request->turma_id);
        $turma->disciplinas()->syncWithoutDetaching([
            $request->disciplina_id => ["professor_id" => $request->professor_id]
        ]);

        return response()->json(["message"=>"Horário criado.","horario"=>$horario->load("turma","disciplina","professor.user")], 201);
    }
    public function destroy(Horario $horario) {
        $horario->delete();
        return response()->json(["message"=>"Horário removido."]);
    }
}
