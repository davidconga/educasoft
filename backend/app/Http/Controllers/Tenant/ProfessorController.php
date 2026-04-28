<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Professor;
use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class ProfessorController extends Controller {
    public function index(Request $request) {
        $query = Professor::with("user","disciplinas");
        if ($request->search) {
            $query->whereHas("user", fn($q) => $q->where("nome","like","%{$request->search}%"));
        }
        return response()->json($query->paginate($request->per_page ?? 20));
    }
    public function store(Request $request) {
        $request->validate(["nome"=>"required","email"=>"required|email|unique:users","especialidade"=>"nullable|string"]);
        return DB::transaction(function() use ($request) {
            $user = User::create(["nome"=>$request->nome,"email"=>$request->email,"password"=>bcrypt($request->password ?? "educasoft123"),"tipo"=>"professor","telefone"=>$request->telefone]);
            $prof = Professor::create(["user_id"=>$user->id,"numero_professor"=>"P".str_pad(Professor::count()+1, 4, "0", STR_PAD_LEFT),"especialidade"=>$request->especialidade,"habilitacoes"=>$request->habilitacoes,"data_admissao"=>$request->data_admissao]);
            return response()->json(["message"=>"Professor criado.","professor"=>$prof->load("user")], 201);
        });
    }
    public function show(Professor $professor) {
        return response()->json($professor->load("user","turmas","disciplinas","horarios.turma","horarios.disciplina"));
    }
    public function update(Request $request, Professor $professor) {
        $professor->update($request->only(["especialidade","habilitacoes","data_admissao"]));
        $professor->user->update($request->only(["nome","email","telefone"]));
        return response()->json(["message"=>"Professor actualizado.","professor"=>$professor->load("user")]);
    }
    public function destroy(Professor $professor) {
        $professor->user->delete();
        return response()->json(["message"=>"Professor removido."]);
    }

    public function resetSenha(Professor $professor) {
        $professor->user->update(["password" => bcrypt("educasoft123")]);
        return response()->json(["message" => "Senha reposta para educasoft123."]);
    }

    public function definirSenha(Request $request, Professor $professor) {
        $request->validate([
            "password"              => "required|min:6|confirmed",
            "password_confirmation" => "required",
        ]);
        $professor->user->update(["password" => bcrypt($request->password)]);
        return response()->json(["message" => "Senha definida com sucesso."]);
    }
}
