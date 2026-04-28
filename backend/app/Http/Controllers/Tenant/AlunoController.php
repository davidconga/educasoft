<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
class AlunoController extends Controller {
    private function relations(): array {
        return ["user","matriculas.turma.classe.curso","matriculas.turma.turnoObj"];
    }

    public function index(Request $request) {
        $query = Aluno::with($this->relations());
        if ($request->search) {
            $query->whereHas("user", fn($q) => $q->where("nome","like","%{$request->search}%")->orWhere("email","like","%{$request->search}%"));
        }
        if ($request->turma_id) {
            $query->whereHas("matriculas", fn($q) => $q->where("turma_id", $request->turma_id)->where("status","activa"));
        }
        if ($request->classe_id) {
            $query->whereHas("matriculas.turma", fn($q) => $q->where("classe_id", $request->classe_id));
        }
        if ($request->turno_id) {
            $query->whereHas("matriculas.turma", fn($q) => $q->where("turno_id", $request->turno_id));
        }
        if ($request->curso_id) {
            $query->whereHas("matriculas.turma.classe", fn($q) => $q->where("curso_id", $request->curso_id));
        }
        if ($request->status) {
            $query->whereHas("matriculas", fn($q) => $q->where("status", $request->status));
        }
        if ($request->ano_letivo) {
            $query->whereHas("matriculas", fn($q) => $q->where("ano_letivo", $request->ano_letivo));
        }
        if ($request->genero) {
            $query->where("genero", $request->genero);
        }
        return response()->json($query->paginate($request->per_page ?? 50));
    }

    public function store(Request $request) {
        $request->validate(["nome"=>"required","email"=>"required|email|unique:users","data_nascimento"=>"nullable|date"]);
        return DB::transaction(function() use ($request) {
            $user = User::create(["nome"=>$request->nome,"email"=>$request->email,"password"=>bcrypt($request->password ?? "educasoft123"),"tipo"=>"aluno","telefone"=>$request->telefone]);
            $aluno = Aluno::create(array_merge($request->only(["data_nascimento","genero","naturalidade","nacionalidade","bi","nome_pai","nome_mae","telefone_responsavel","endereco"]),["user_id"=>$user->id,"numero_aluno"=>"A".str_pad(Aluno::count()+1, 5, "0", STR_PAD_LEFT)]));
            return response()->json(["message"=>"Aluno criado.","aluno"=>$aluno->load($this->relations())], 201);
        });
    }

    public function show(Aluno $aluno) {
        return response()->json($aluno->load("user","matriculas.turma.classe.curso","matriculas.turma.turnoObj","notas.disciplina","pagamentos.plano"));
    }

    public function update(Request $request, Aluno $aluno) {
        $aluno->update($request->only(["data_nascimento","genero","naturalidade","bi","nome_pai","nome_mae","telefone_responsavel","endereco"]));
        $aluno->user->update($request->only(["nome","email","telefone"]));
        return response()->json(["message"=>"Aluno actualizado.","aluno"=>$aluno->load($this->relations())]);
    }

    public function uploadFoto(Request $request, Aluno $aluno) {
        $request->validate(["foto"=>"required|image|max:2048"]);
        // Delete old photo if exists
        if ($aluno->foto) Storage::disk("public")->delete($aluno->foto);
        $path = $request->file("foto")->store("fotos/alunos", "public");
        $aluno->update(["foto" => $path]);
        return response()->json(["foto_url" => "/storage/{$path}"]);
    }

    public function resetSenha(Aluno $aluno) {
        $aluno->user->update(["password" => bcrypt("educasoft123")]);
        return response()->json(["message" => "Senha redefinida para educasoft123."]);
    }

    public function definirSenha(Request $request, Aluno $aluno) {
        $request->validate([
            "password"              => "required|min:6|confirmed",
            "password_confirmation" => "required",
        ]);
        $aluno->user->update(["password" => bcrypt($request->password)]);
        return response()->json(["message" => "Senha definida com sucesso."]);
    }

    public function destroy(Aluno $aluno) {
        if ($aluno->foto) Storage::disk("public")->delete($aluno->foto);
        $aluno->user->delete();
        return response()->json(["message"=>"Aluno removido."]);
    }
}
