<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller {
    public function login(Request $request) {
        $request->validate(["email"=>"required|email","password"=>"required"]);

        $userRaw = DB::connection("tenant")->table("users")->where("email", $request->email)->first();

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
            "escola" => $escola ? ["id"=>$escola->id,"codigo"=>$escola->codigo,"nome"=>$escola->nome,"logo"=>$escola->logo,"email"=>$escola->email,"telefone"=>$escola->telefone,"endereco"=>$escola->endereco] : null,
        ]);
    }

    public function logout(Request $request) {
        $user = $request->attributes->get("auth_user");
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
            "escola" => $escola ? ["id"=>$escola->id,"codigo"=>$escola->codigo,"nome"=>$escola->nome,"logo"=>$escola->logo,"email"=>$escola->email,"telefone"=>$escola->telefone,"endereco"=>$escola->endereco] : null,
        ]);
    }
}
