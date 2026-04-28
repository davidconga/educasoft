<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\Professor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
