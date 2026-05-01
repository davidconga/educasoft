<?php
namespace App\Http\Middleware;

use App\Models\Tenant\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthenticateTenant
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        if (!$token) {
            return response()->json(["message" => "Unauthenticated."], 401);
        }

        // Token format: "id|plaintext"
        $parts = explode("|", $token, 2);
        if (count($parts) !== 2) {
            return response()->json(["message" => "Token inválido."], 401);
        }

        [$id, $plain] = $parts;
        $hash = hash("sha256", $plain);

        $pat = DB::connection("tenant")
            ->table("personal_access_tokens")
            ->where("id", $id)
            ->first();

        if (!$pat || !hash_equals($pat->token, $hash)) {
            return response()->json(["message" => "Unauthenticated."], 401);
        }

        // Load the user (Eloquent model — supports ->update(), relations, etc.)
        $user = User::on("tenant")->find($pat->tokenable_id);

        if (!$user || !$user->ativo) {
            return response()->json(["message" => "Unauthenticated."], 401);
        }

        // Update last_used_at
        DB::connection("tenant")
            ->table("personal_access_tokens")
            ->where("id", $id)
            ->update(["last_used_at" => now()]);

        $request->attributes->set("auth_user", $user);
        $request->attributes->set("auth_token_id", $id);

        return $next($request);
    }
}
