<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Escola;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    public function forgotPassword(Request $request)
    {
        $request->validate(["email" => "required|email"]);

        $email = strtolower(trim($request->email));
        $found = null;

        foreach (Escola::where("ativo", true)->get() as $escola) {
            try {
                tenancy()->initialize($escola);
                $user = DB::connection("tenant")->table("users")->where("email", $email)->first();
                tenancy()->end();

                if ($user) {
                    $found = ["escola" => $escola, "user" => $user];
                    break;
                }
            } catch (\Throwable) {
                tenancy()->end();
            }
        }

        // Always return success to avoid email enumeration
        if (!$found) {
            return response()->json(["message" => "Se o email existir, receberá instruções para recuperar a senha."]);
        }

        $escola = $found["escola"];
        $user   = $found["user"];
        $token  = Str::random(64);

        tenancy()->initialize($escola);
        DB::connection("tenant")->table("password_reset_tokens")->updateOrInsert(
            ["email" => $email],
            ["token" => Hash::make($token), "created_at" => now()]
        );
        tenancy()->end();

        $baseUrl  = rtrim(config("app.url"), "/");
        $resetUrl = "{$baseUrl}/recuperar-senha/confirmar?token={$token}&email={$email}&escola={$escola->codigo}";

        try {
            Mail::raw(
                "Olá {$user->nome},\n\nClique no link abaixo para recuperar a sua senha:\n\n{$resetUrl}\n\nEste link expira em 60 minutos.\n\nSe não solicitou a recuperação, ignore este email.",
                function ($message) use ($email, $escola) {
                    $message->to($email)->subject("[{$escola->nome}] Recuperação de Senha");
                }
            );
        } catch (\Throwable) {}

        return response()->json(["message" => "Se o email existir, receberá instruções para recuperar a senha."]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            "email"                 => "required|email",
            "token"                 => "required|string",
            "escola_codigo"         => "required|string",
            "password"              => "required|min:6|confirmed",
        ]);

        $escola = Escola::where("codigo", $request->escola_codigo)->where("ativo", true)->first();
        if (!$escola) {
            return response()->json(["message" => "Token inválido ou expirado."], 422);
        }

        tenancy()->initialize($escola);

        $record = DB::connection("tenant")->table("password_reset_tokens")
            ->where("email", $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            tenancy()->end();
            return response()->json(["message" => "Token inválido ou expirado."], 422);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::connection("tenant")->table("password_reset_tokens")->where("email", $request->email)->delete();
            tenancy()->end();
            return response()->json(["message" => "O link expirou. Solicite uma nova recuperação de senha."], 422);
        }

        DB::connection("tenant")->table("users")
            ->where("email", $request->email)
            ->update(["password" => Hash::make($request->password)]);

        DB::connection("tenant")->table("password_reset_tokens")->where("email", $request->email)->delete();
        tenancy()->end();

        return response()->json(["message" => "Senha redefinida com sucesso. Pode fazer login agora."]);
    }
}
