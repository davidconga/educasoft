<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\Professor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class PortalController extends Controller {
    public function me(Request $request) {
        $authUser = $request->attributes->get("auth_user");
        $aluno = Aluno::where("user_id", $authUser->id)
            ->with([
                "user",
                "matriculas.turma.classe.curso",
                "matriculas.turma.turnoObj",
                "notas.disciplina",
                "pagamentos.plano",
                "pagamentos.emolumento",
            ])
            ->firstOrFail();
        return response()->json($aluno);
    }

    public function professorMe(Request $request) {
        $authUser = $request->attributes->get("auth_user");
        $professor = Professor::where("user_id", $authUser->id)
            ->with(["user", "horarios.turma", "horarios.disciplina"])
            ->firstOrFail();

        $professor->load([
            "turmas" => function ($q) use ($professor) {
                $q->with([
                    "classe.curso",
                    "turnoObj",
                    "disciplinas" => function ($dq) use ($professor) {
                        $dq->wherePivot("professor_id", $professor->id);
                    },
                ]);
            },
        ]);

        $professor->turmas->each(function ($turma) {
            $turma->loadCount(["matriculas as total_alunos" => fn($q) => $q->where("status", "activa")]);
        });

        return response()->json($professor);
    }

    /** GET /portal/perfil — retorna dados básicos do user logado + perfil (aluno/professor se aplicar). */
    public function perfil(Request $request) {
        $authUser = $request->attributes->get("auth_user");
        $aluno     = Aluno::where("user_id", $authUser->id)->first();
        $professor = $aluno ? null : Professor::where("user_id", $authUser->id)->first();
        return response()->json([
            "user" => [
                "id"       => $authUser->id,
                "nome"     => $authUser->nome,
                "email"    => $authUser->email,
                "telefone" => $authUser->telefone,
                "tipo"     => $authUser->tipo,
                "ativo"    => $authUser->ativo,
            ],
            "aluno"     => $aluno    ? ["id"=>$aluno->id, "numero_aluno"=>$aluno->numero_aluno, "foto"=>$aluno->foto] : null,
            "professor" => $professor ? ["id"=>$professor->id, "numero_professor"=>$professor->numero_professor, "especialidade"=>$professor->especialidade, "foto"=>$professor->foto] : null,
        ]);
    }

    /** PUT /portal/perfil — actualiza dados básicos do user logado (nome, email, telefone). */
    public function atualizarPerfil(Request $request) {
        $authUser = $request->attributes->get("auth_user");
        $data = $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "required|email|max:255|unique:users,email," . $authUser->id,
            "telefone" => "nullable|string|max:50",
        ]);
        $authUser->update($data);
        return response()->json(["message"=>"Perfil actualizado.", "user" => $authUser->only(["id","nome","email","telefone","tipo"])]);
    }

    /** POST /portal/perfil/foto — upload da própria foto (apenas aluno/professor têm coluna `foto`). */
    public function uploadFoto(Request $request) {
        $request->validate(["foto" => "required|image|max:2048"]);
        $authUser = $request->attributes->get("auth_user");
        $aluno     = Aluno::where("user_id", $authUser->id)->first();
        $professor = $aluno ? null : Professor::where("user_id", $authUser->id)->first();
        if (!$aluno && !$professor) {
            return response()->json(["message"=>"Este tipo de utilizador não suporta foto de perfil."], 422);
        }

        $target = $aluno ?? $professor;
        $folder = $aluno ? "fotos/alunos" : "fotos/professores";
        if ($target->foto) Storage::disk("public")->delete($target->foto);
        $path = $request->file("foto")->store($folder, "public");
        $target->update(["foto" => $path]);

        return response()->json(["foto_url" => "/storage/{$path}", "foto" => $path]);
    }

    public function alterarSenha(Request $request) {
        $request->validate([
            "senha_atual"  => "required",
            "nova_senha"   => "required|min:6|confirmed",
        ]);
        $authUser = $request->attributes->get("auth_user");
        if (!Hash::check($request->senha_atual, $authUser->password)) {
            return response()->json(["message" => "Senha actual incorrecta."], 422);
        }
        $authUser->update(["password" => bcrypt($request->nova_senha)]);
        return response()->json(["message" => "Senha alterada com sucesso."]);
    }
}
