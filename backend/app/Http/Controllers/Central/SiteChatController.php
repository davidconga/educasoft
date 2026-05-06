<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\SiteChat;
use App\Models\Central\SiteChatMensagem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

/**
 * Endpoints públicos (visitante do site) e privados (super-admin).
 *   Visitante autentica-se por token (gerado em iniciar()) — sem cookies/sanctum.
 *   Super-admin autentica-se via Sanctum no grupo /v1/super-admin/...
 */
class SiteChatController extends Controller {
    /* ============================ PÚBLICO (visitante) ============================ */

    public function iniciar(Request $request) {
        $key = "site-chat-iniciar:" . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json(["message" => "Demasiadas tentativas. Tente daqui a alguns minutos."], 429);
        }
        RateLimiter::hit($key, 600);

        $data = $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "nullable|email|max:255",
            "telefone" => "nullable|string|max:50",
            "assunto"  => "nullable|string|max:255",
            "mensagem" => "required|string|max:5000",
            "website"  => "nullable|max:0",
        ]);

        $chat = SiteChat::create([
            "token"               => Str::random(48),
            "nome"                => $data["nome"],
            "email"               => $data["email"] ?? null,
            "telefone"            => $data["telefone"] ?? null,
            "assunto"             => $data["assunto"] ?? null,
            "estado"              => "aberto",
            "nao_lidas_admin"     => 1,
            "nao_lidas_visitante" => 0,
            "ip"                  => $request->ip(),
            "user_agent"          => substr((string) $request->userAgent(), 0, 500),
            "ultima_mensagem_em"  => now(),
        ]);

        SiteChatMensagem::create([
            "site_chat_id" => $chat->id,
            "autor"        => "visitante",
            "autor_nome"   => $chat->nome,
            "texto"        => $data["mensagem"],
        ]);

        return response()->json([
            "token"    => $chat->token,
            "chat_id"  => $chat->id,
            "estado"   => $chat->estado,
        ], 201);
    }

    public function mensagensPublico(Request $request, string $token) {
        $chat = SiteChat::where("token", $token)->firstOrFail();
        $desde = $request->query("desde");

        $q = $chat->mensagens()->orderBy("created_at");
        if ($desde) $q->where("id", ">", (int) $desde);
        $msgs = $q->limit(100)->get();

        // marcar mensagens do admin como lidas (visitante leu)
        if ($msgs->isNotEmpty()) {
            SiteChatMensagem::where("site_chat_id", $chat->id)
                ->where("autor", "admin")
                ->whereNull("lida_em")
                ->update(["lida_em" => now()]);
            $chat->update(["nao_lidas_visitante" => 0]);
        }

        return response()->json([
            "chat"      => $chat->fresh(),
            "mensagens" => $msgs->map(fn ($m) => $this->msgPayload($m)),
        ]);
    }

    public function enviarPublico(Request $request, string $token) {
        $chat = SiteChat::where("token", $token)->firstOrFail();
        if ($chat->estado === "fechado") {
            return response()->json(["message" => "Conversa encerrada."], 422);
        }

        $data = $request->validate([
            "texto" => "required|string|max:5000",
        ]);

        $msg = SiteChatMensagem::create([
            "site_chat_id" => $chat->id,
            "autor"        => "visitante",
            "autor_nome"   => $chat->nome,
            "texto"        => $data["texto"],
        ]);

        $chat->increment("nao_lidas_admin");
        $chat->update([
            "ultima_mensagem_em" => now(),
            "estado"             => $chat->estado === "fechado" ? "fechado" : "aberto",
        ]);

        return response()->json($this->msgPayload($msg), 201);
    }

    /* ============================ SUPER-ADMIN ============================ */

    public function index(Request $request) {
        $q = SiteChat::query()->orderByDesc("ultima_mensagem_em");
        if ($estado = $request->query("estado")) $q->where("estado", $estado);
        if ($s = $request->query("q")) {
            $q->where(function ($w) use ($s) {
                $w->where("nome", "like", "%{$s}%")
                  ->orWhere("email", "like", "%{$s}%")
                  ->orWhere("telefone", "like", "%{$s}%")
                  ->orWhere("assunto", "like", "%{$s}%");
            });
        }
        return response()->json($q->paginate(20));
    }

    public function mensagens(Request $request, SiteChat $chat) {
        $desde = $request->query("desde");
        $q = $chat->mensagens()->orderBy("created_at");
        if ($desde) $q->where("id", ">", (int) $desde);
        $msgs = $q->limit(200)->get();

        // marcar mensagens do visitante como lidas
        if ($msgs->isNotEmpty()) {
            SiteChatMensagem::where("site_chat_id", $chat->id)
                ->where("autor", "visitante")
                ->whereNull("lida_em")
                ->update(["lida_em" => now()]);
            $chat->update(["nao_lidas_admin" => 0]);
        }

        return response()->json([
            "chat"      => $chat->fresh(),
            "mensagens" => $msgs->map(fn ($m) => $this->msgPayload($m)),
        ]);
    }

    public function enviarAdmin(Request $request, SiteChat $chat) {
        $data = $request->validate([
            "texto" => "required|string|max:5000",
        ]);

        $user = $request->user();
        $msg = SiteChatMensagem::create([
            "site_chat_id" => $chat->id,
            "autor"        => "admin",
            "autor_id"     => $user?->id,
            "autor_nome"   => $user?->name ?? "Suporte Educajá",
            "texto"        => $data["texto"],
        ]);

        $chat->increment("nao_lidas_visitante");
        $chat->update([
            "ultima_mensagem_em" => now(),
            "estado"             => "aberto",
        ]);

        return response()->json($this->msgPayload($msg), 201);
    }

    public function update(Request $request, SiteChat $chat) {
        $data = $request->validate([
            "estado"   => "nullable|in:aberto,em_curso,fechado",
            "assunto"  => "nullable|string|max:255",
        ]);
        $chat->update($data);
        return response()->json($chat);
    }

    public function destroy(SiteChat $chat) {
        $chat->delete();
        return response()->json(["ok" => true]);
    }

    public function sondagem(Request $request) {
        return response()->json([
            "abertas"      => SiteChat::where("estado", "!=", "fechado")->count(),
            "nao_lidas"    => (int) SiteChat::sum("nao_lidas_admin"),
            "ultimas"      => SiteChat::orderByDesc("ultima_mensagem_em")->limit(5)->get(),
        ]);
    }

    private function msgPayload(SiteChatMensagem $m): array {
        return [
            "id"         => $m->id,
            "autor"      => $m->autor,
            "autor_nome" => $m->autor_nome,
            "texto"      => $m->texto,
            "created_at" => $m->created_at,
            "lida_em"    => $m->lida_em,
        ];
    }
}
