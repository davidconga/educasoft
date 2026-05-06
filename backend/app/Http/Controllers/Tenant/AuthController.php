<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Services\Central\LimitesPlanoService;
use App\Services\Central\PlanoTenantResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller {
    public function login(Request $request) {
        $request->validate(["identifier"=>"required|string","password"=>"required"]);

        $identifier = trim($request->identifier);

        if (str_contains($identifier, '@')) {
            $userRaw = DB::connection("tenant")->table("users")->where("email", $identifier)->first();
        } else {
            $aluno = DB::connection("tenant")->table("alunos")->where("numero_aluno", $identifier)->first();
            $userRaw = $aluno
                ? DB::connection("tenant")->table("users")->where("id", $aluno->user_id)->first()
                : null;
        }

        if (!$userRaw || !Hash::check($request->password, $userRaw->password)) {
            return response()->json(["message"=>"Credenciais inválidas."], 401);
        }
        if (!$userRaw->ativo) {
            return response()->json(["message"=>"Conta desactivada."], 403);
        }

        $userModel = new \App\Models\Tenant\User();
        $userModel->setConnection("tenant");
        $user = $userModel->newQuery()->find($userRaw->id);

        $token = $user->createToken("api-token")->plainTextToken;
        $escola = $request->attributes->get("escola");

        return response()->json([
            "token" => $token,
            "user" => ["id"=>$user->id,"nome"=>$user->nome,"email"=>$user->email,"tipo"=>$user->tipo,"foto"=>$user->foto,"ativo"=>$user->ativo,"permissoes"=>$user->permissoes],
            "escola" => $escola ? ["id"=>$escola->id,"codigo"=>$escola->codigo,"nome"=>$escola->nome,"logo"=>$escola->logo,"email"=>$escola->email,"telefone"=>$escola->telefone,"endereco"=>$escola->endereco,"formato_impressao"=>$escola->formato_impressao ?: "a4","permite_pago_historico"=>(bool)$escola->permite_pago_historico] : null,
            "plano"   => $escola ? (new PlanoTenantResolver())->paraEscola($escola) : null,
            "limites" => $escola ? [
                "alunos"  => (new LimitesPlanoService())->alunos($escola),
                "admins"  => (new LimitesPlanoService())->admins($escola),
            ] : null,
        ]);
    }

    public function logout(Request $request) {
        $tokenId = $request->attributes->get("auth_token_id");
        if ($tokenId) {
            DB::connection("tenant")->table("personal_access_tokens")->where("id", $tokenId)->delete();
        }
        return response()->json(["message"=>"Sessão terminada."]);
    }

    public function me(Request $request) {
        $user = $request->attributes->get("auth_user");
        $escola = $request->attributes->get("escola");
        return response()->json([
            "user" => $user,
            "escola" => $escola ? ["id"=>$escola->id,"codigo"=>$escola->codigo,"nome"=>$escola->nome,"logo"=>$escola->logo,"email"=>$escola->email,"telefone"=>$escola->telefone,"endereco"=>$escola->endereco,"formato_impressao"=>$escola->formato_impressao ?: "a4","permite_pago_historico"=>(bool)$escola->permite_pago_historico] : null,
            "plano" => $escola ? (new PlanoTenantResolver())->paraEscola($escola) : null,
        ]);
    }
}
