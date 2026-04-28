<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\User;
use Illuminate\Http\Request;

class UtilizadorController extends Controller {

    private static array $defaultPermissoes = [
        "admin"       => null, // null = todas as permissões
        "secretaria"  => ["dashboard","alunos","matriculas","professores","turmas","notas","presencas","horarios","pagamentos","tesouraria","controlo_propinas"],
        "director"    => ["dashboard","alunos","notas","pagamentos","tesouraria","controlo_propinas"],
        "tesouraria"  => ["dashboard","pagamentos","tesouraria","controlo_propinas","alunos"],
        "coordenador" => ["dashboard","alunos","matriculas","turmas","notas","presencas","horarios","controlo_propinas"],
    ];

    private function fields(): array {
        return ["id","nome","email","telefone","tipo","ativo","permissoes","created_at"];
    }

    public function index() {
        return response()->json(
            User::whereIn("tipo", ["admin","secretaria","director","tesouraria","coordenador"])
                ->orderBy("nome")
                ->get($this->fields())
        );
    }

    public function store(Request $request) {
        $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "required|email|unique:users,email",
            "password" => "required|string|min:6",
            "tipo"     => "required|in:admin,secretaria,director,tesouraria,coordenador",
            "telefone" => "nullable|string|max:50",
        ]);
        $permissoes = self::$defaultPermissoes[$request->tipo] ?? null;
        $user = User::create([
            ...$request->only(["nome","email","tipo","telefone"]),
            "password"   => bcrypt($request->password),
            "ativo"      => true,
            "permissoes" => $permissoes,
        ]);
        return response()->json($user->only($this->fields()), 201);
    }

    public function update(Request $request, User $user) {
        $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "required|email|unique:users,email,{$user->id}",
            "tipo"     => "required|in:admin,secretaria,director,tesouraria,coordenador",
            "telefone" => "nullable|string|max:50",
        ]);
        $data = $request->only(["nome","email","tipo","telefone"]);
        if ($request->filled("password")) {
            $data["password"] = bcrypt($request->password);
        }
        // Reset permissions if tipo changed
        if ($request->tipo !== $user->tipo) {
            $data["permissoes"] = self::$defaultPermissoes[$request->tipo] ?? null;
        }
        $user->update($data);
        return response()->json($user->fresh()->only($this->fields()));
    }

    public function updatePermissoes(Request $request, User $user) {
        $request->validate([
            "permissoes"   => "nullable|array",
            "permissoes.*" => "string",
        ]);
        $user->update(["permissoes" => $request->permissoes]);
        return response()->json($user->fresh()->only($this->fields()));
    }

    public function toggleAtivo(User $user) {
        $user->update(["ativo" => !$user->ativo]);
        return response()->json($user->fresh()->only($this->fields()));
    }

    public function destroy(User $user) {
        $user->delete();
        return response()->json(["message" => "Utilizador removido."]);
    }
}
