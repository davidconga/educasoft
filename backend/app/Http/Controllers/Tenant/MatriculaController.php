<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Matricula;
use Illuminate\Http\Request;
class MatriculaController extends Controller {
    public function index(Request $request) {
        $query = Matricula::with("aluno.user","turma.classe.curso");
        if ($request->turma_id)   $query->where("turma_id",   $request->turma_id);
        if ($request->ano_letivo) $query->where("ano_letivo", $request->ano_letivo);
        if ($request->status)     $query->where("status",     $request->status);
        if ($request->search) {
            $query->whereHas("aluno.user", fn($q) =>
                $q->where("nome","like","%{$request->search}%")
            );
        }
        return response()->json($query->orderBy("created_at","desc")->paginate($request->per_page ?? 50));
    }

    public function store(Request $request) {
        $request->validate([
            "aluno_id"      => "required|exists:alunos,id",
            "turma_id"      => "required|exists:turmas,id",
            "ano_letivo"    => "required",
            "data_matricula"=> "required|date",
        ]);
        $data = $request->only(["aluno_id","turma_id","ano_letivo","data_matricula"]);
        $data["status"] = $request->status ?? "pendente";
        $mat = Matricula::create($data);
        return response()->json(["message"=>"Matrícula criada.","matricula"=>$mat->load("aluno.user","turma.classe.curso")], 201);
    }

    public function show(Matricula $matricula) {
        return response()->json($matricula->load("aluno.user","turma.classe.curso"));
    }

    public function update(Request $request, Matricula $matricula) {
        $matricula->update($request->only(["turma_id","status","ano_letivo"]));
        return response()->json(["message"=>"Matrícula actualizada.","matricula"=>$matricula->load("aluno.user","turma.classe.curso")]);
    }

    public function confirmar(Matricula $matricula) {
        if ($matricula->status !== "pendente") {
            return response()->json(["message"=>"Só matrículas pendentes podem ser confirmadas."], 422);
        }
        $matricula->update(["status"=>"activa"]);
        return response()->json(["message"=>"Matrícula confirmada.","matricula"=>$matricula->load("aluno.user","turma.classe.curso")]);
    }

    public function confirmarMultiplas(Request $request) {
        $request->validate(["ids"=>"required|array|min:1","ids.*"=>"integer|exists:matriculas,id"]);
        $count = Matricula::whereIn("id",$request->ids)->where("status","pendente")->update(["status"=>"activa"]);
        $matriculas = Matricula::whereIn("id",$request->ids)->with("aluno.user","turma.classe.curso")->get();
        return response()->json(["message"=>"Confirmadas {$count} matrícula(s).","confirmadas"=>$count,"matriculas"=>$matriculas]);
    }

    public function destroy(Matricula $matricula) {
        if ($matricula->status === "activa") {
            return response()->json(["message"=>"Não é possível eliminar uma matrícula activa."], 422);
        }
        $matricula->delete();
        return response()->json(["message"=>"Matrícula removida."]);
    }
}
