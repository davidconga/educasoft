<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
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

        $user = DB::connection("tenant")->table("users")->where("email", $request->email)->first();

        if (!$user) {
            return response()->json(["message" => "Se o email existir, receberá instruções para recuperar a senha."]);
        }

        $token = Str::random(64);

        DB::connection("tenant")->table("password_reset_tokens")->updateOrInsert(
            ["email" => $request->email],
            ["token" => Hash::make($token), "created_at" => now()]
        );

        $escola = $request->attributes->get("escola");
        $baseUrl = rtrim(config("app.url"), "/");
        $resetUrl = "{$baseUrl}/recuperar-senha/confirmar?token={$token}&email={$request->email}&escola={$escola->codigo}";

        try {
            Mail::raw(
                "Olá {$user->nome},\n\nClique no link abaixo para recuperar a sua senha:\n\n{$resetUrl}\n\nEste link expira em 60 minutos.\n\nSe não solicitou a recuperação, ignore este email.",
                function ($message) use ($request, $escola) {
                    $message->to($request->email)
                            ->subject("[{$escola->nome}] Recuperação de Senha");
                }
            );
        } catch (\Throwable) {
            // Log failure but don't expose it — token is still valid
        }

        $response = ["message" => "Se o email existir, receberá instruções para recuperar a senha."];

        // Return the link directly when mail is not really sent (log/array driver)
        if (in_array(config("mail.default"), ["log", "array"])) {
            $response["reset_url"] = $resetUrl;
        }

        return response()->json($response);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            "email"                 => "required|email",
            "token"                 => "required|string",
            "password"              => "required|min:6|confirmed",
        ]);

        $record = DB::connection("tenant")->table("password_reset_tokens")
            ->where("email", $request->email)
            ->first();

        if (!$record || !Hash::check($request->token, $record->token)) {
            return response()->json(["message" => "Token inválido ou expirado."], 422);
        }

        if (now()->diffInMinutes($record->created_at) > 60) {
            DB::connection("tenant")->table("password_reset_tokens")->where("email", $request->email)->delete();
            return response()->json(["message" => "O link expirou. Solicite uma nova recuperação de senha."], 422);
        }

        DB::connection("tenant")->table("users")
            ->where("email", $request->email)
            ->update(["password" => Hash::make($request->password)]);

        DB::connection("tenant")->table("password_reset_tokens")->where("email", $request->email)->delete();

        return response()->json(["message" => "Senha redefinida com sucesso. Pode fazer login agora."]);
    }
}
