<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Conversa;
use App\Models\Tenant\ConversaParticipante;
use App\Models\Tenant\Mensagem;
use App\Models\Tenant\Turma;
use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ChatController extends Controller {
    /**
     * Lista todas as conversas em que o utilizador participa, com última
     * mensagem, contador de não-lidas e nome legível para o cabeçalho.
     */
    public function conversas(Request $r) {
        $userId = $r->attributes->get("auth_user")->id;
        $convs = Conversa::query()
            ->whereHas("participantes", fn($q) => $q->where("user_id", $userId))
            ->with([
                "ultimaMensagem.autor:id,nome",
                "turma:id,nome",
                "utilizadores:id,nome,tipo,foto",
            ])
            ->orderByDesc("ultima_mensagem_em")
            ->orderByDesc("id")
            ->get();

        $unreadByConv = $this->contarNaoLidasPorConversa($userId, $convs->pluck("id"));

        $items = $convs->map(function (Conversa $c) use ($userId, $unreadByConv) {
            return [
                "id"                  => $c->id,
                "tipo"                => $c->tipo,
                "titulo"              => $this->tituloDaConversa($c, $userId),
                "turma"               => $c->turma ? ["id" => $c->turma->id, "nome" => $c->turma->nome] : null,
                "ultima_mensagem"     => $c->ultimaMensagem ? [
                    "id"         => $c->ultimaMensagem->id,
                    "corpo"      => $c->ultimaMensagem->corpo,
                    "autor_id"   => $c->ultimaMensagem->user_id,
                    "autor_nome" => $c->ultimaMensagem->autor?->nome,
                    "created_at" => $c->ultimaMensagem->created_at,
                ] : null,
                "nao_lidas"           => (int) ($unreadByConv[$c->id] ?? 0),
                "ultima_mensagem_em"  => $c->ultima_mensagem_em,
                "participantes"       => $c->utilizadores->map(fn($u) => [
                    "id" => $u->id, "nome" => $u->nome, "tipo" => $u->tipo, "foto" => $u->foto,
                ])->values(),
            ];
        });

        return response()->json($items);
    }

    /** Detalhe de uma conversa (cabeçalho). */
    public function showConversa(Request $r, int $conversa) {
        $c = $this->conversaOuFalha($conversa, $r->attributes->get("auth_user")->id);
        $c->load(["turma:id,nome", "utilizadores:id,nome,tipo,foto"]);
        return response()->json([
            "id"            => $c->id,
            "tipo"          => $c->tipo,
            "titulo"        => $this->tituloDaConversa($c, $r->attributes->get("auth_user")->id),
            "turma"         => $c->turma ? ["id" => $c->turma->id, "nome" => $c->turma->nome] : null,
            "participantes" => $c->utilizadores->map(fn($u) => [
                "id" => $u->id, "nome" => $u->nome, "tipo" => $u->tipo, "foto" => $u->foto,
            ])->values(),
        ]);
    }

    /**
     * Abre conversa privada com outro utilizador.
     * Idempotente: devolve a existente se já houver uma entre os dois.
     */
    public function iniciarPrivada(Request $r) {
        $data = $r->validate([
            "user_id" => "required|integer|exists:users,id|different:" . $r->attributes->get("auth_user")->id,
        ]);
        $me    = $r->attributes->get("auth_user")->id;
        $other = (int) $data["user_id"];
        if ($me === $other) {
            return response()->json(["message" => "Não pode iniciar conversa consigo próprio."], 422);
        }

        $existente = Conversa::query()
            ->whereIn("tipo", ["privada", "admin_ee"])
            ->whereHas("participantes", fn($q) => $q->where("user_id", $me))
            ->whereHas("participantes", fn($q) => $q->where("user_id", $other))
            ->withCount("participantes")
            ->having("participantes_count", 2)
            ->first();
        if ($existente) {
            return response()->json(["id" => $existente->id]);
        }

        $outroUser = User::findOrFail($other);
        $eu        = User::findOrFail($me);
        $tipo      = $this->tipoPrivado($eu, $outroUser);

        $conv = DB::transaction(function () use ($me, $other, $tipo) {
            $c = Conversa::create([
                "tipo"               => $tipo,
                "criada_por_user_id" => $me,
            ]);
            ConversaParticipante::insert([
                ["conversa_id" => $c->id, "user_id" => $me,    "joined_at" => now()],
                ["conversa_id" => $c->id, "user_id" => $other, "joined_at" => now()],
            ]);
            return $c;
        });
        return response()->json(["id" => $conv->id], 201);
    }

    /**
     * Abre/devolve grupo de uma turma. Sincroniza participantes
     * (alunos matriculados activos + professores das disciplinas).
     */
    public function iniciarTurma(Request $r, int $turma) {
        $turmaModel = Turma::with([
            "matriculas" => fn($q) => $q->where("status", "activa")->with("aluno:id,user_id"),
            "disciplinas",
        ])->findOrFail($turma);

        $userIds = collect();
        foreach ($turmaModel->matriculas as $m) {
            if ($m->aluno?->user_id) $userIds->push($m->aluno->user_id);
        }
        foreach ($turmaModel->disciplinas as $d) {
            $profId = $d->pivot->professor_id ?? null;
            if ($profId) {
                $uid = DB::table("professores")->where("id", $profId)->value("user_id");
                if ($uid) $userIds->push($uid);
            }
        }
        $userIds->push($r->attributes->get("auth_user")->id);
        $userIds = $userIds->filter()->unique()->values();

        $conv = Conversa::firstOrCreate(
            ["tipo" => "turma", "turma_id" => $turmaModel->id],
            ["titulo" => "Turma " . $turmaModel->nome, "criada_por_user_id" => $r->attributes->get("auth_user")->id]
        );

        $existentes = ConversaParticipante::where("conversa_id", $conv->id)->pluck("user_id")->all();
        $novos      = $userIds->diff($existentes);
        if ($novos->isNotEmpty()) {
            ConversaParticipante::insert(
                $novos->map(fn($uid) => [
                    "conversa_id" => $conv->id, "user_id" => $uid, "joined_at" => now(),
                ])->all()
            );
        }

        if (! $conv->temParticipante($r->attributes->get("auth_user")->id)) {
            return response()->json(["message" => "Sem permissão para esta turma."], 403);
        }

        return response()->json(["id" => $conv->id]);
    }

    /**
     * Histórico paginado. Devolve as 50 mensagens anteriores ao id "antes" (cursor).
     * Sem cursor → últimas 50.
     */
    public function mensagens(Request $r, int $conversa) {
        $this->conversaOuFalha($conversa, $r->attributes->get("auth_user")->id);
        $q = Mensagem::query()
            ->where("conversa_id", $conversa)
            ->with("autor:id,nome,tipo,foto")
            ->orderByDesc("id")
            ->limit(50);
        if ($r->filled("antes")) {
            $q->where("id", "<", (int) $r->antes);
        }
        $msgs = $q->get()->reverse()->values();
        return response()->json($msgs);
    }

    /** Envia mensagem. */
    public function enviar(Request $r, int $conversa) {
        $c    = $this->conversaOuFalha($conversa, $r->attributes->get("auth_user")->id);
        $data = $r->validate([
            "corpo" => "required|string|max:5000",
        ]);
        $msg = Mensagem::create([
            "conversa_id" => $c->id,
            "user_id"     => $r->attributes->get("auth_user")->id,
            "corpo"       => trim($data["corpo"]),
        ]);
        $c->update(["ultima_mensagem_em" => $msg->created_at]);

        // Quem envia, marca como lida automaticamente.
        ConversaParticipante::where("conversa_id", $c->id)
            ->where("user_id", $r->attributes->get("auth_user")->id)
            ->update(["last_read_at" => $msg->created_at]);

        $msg->load("autor:id,nome,tipo,foto");
        return response()->json($msg, 201);
    }

    /** Marca conversa como lida (actualiza last_read_at para now). */
    public function marcarLida(Request $r, int $conversa) {
        $this->conversaOuFalha($conversa, $r->attributes->get("auth_user")->id);
        ConversaParticipante::where("conversa_id", $conversa)
            ->where("user_id", $r->attributes->get("auth_user")->id)
            ->update(["last_read_at" => now()]);
        return response()->json(["ok" => true]);
    }

    /**
     * Sondagem (polling). Devolve nº não-lidas total + lista compacta
     * de conversas que tiveram actividade desde o timestamp recebido.
     */
    public function sondagem(Request $r) {
        $userId = $r->attributes->get("auth_user")->id;
        $desde  = $r->filled("desde") ? Carbon::parse($r->desde) : null;

        $convsId = ConversaParticipante::where("user_id", $userId)->pluck("conversa_id");
        $unreadByConv = $this->contarNaoLidasPorConversa($userId, $convsId);

        $alteradas = collect();
        if ($desde) {
            $alteradas = Conversa::query()
                ->whereIn("id", $convsId)
                ->where("ultima_mensagem_em", ">", $desde)
                ->orderByDesc("ultima_mensagem_em")
                ->get(["id", "ultima_mensagem_em"])
                ->map(fn($c) => [
                    "id"                 => $c->id,
                    "ultima_mensagem_em" => $c->ultima_mensagem_em,
                    "nao_lidas"          => (int) ($unreadByConv[$c->id] ?? 0),
                ]);
        }

        return response()->json([
            "agora"          => now()->toIso8601String(),
            "nao_lidas_total"=> (int) array_sum($unreadByConv),
            "alteradas"      => $alteradas,
        ]);
    }

    /**
     * Lista utilizadores com quem o user actual pode iniciar conversa.
     * Filtra por nome/email; respeita o tipo (admins veem todos, alunos
     * veem professores+admins, professores veem alunos+admins).
     */
    public function contactos(Request $r) {
        $me    = $r->attributes->get("auth_user");
        $busca = trim((string) $r->query("busca", ""));
        $q = User::query()
            ->where("id", "!=", $me->id)
            ->where("ativo", true);

        if ($me->tipo === "aluno") {
            $q->whereIn("tipo", ["professor", "admin"]);
        } elseif ($me->tipo === "professor") {
            $q->whereIn("tipo", ["aluno", "professor", "admin"]);
        }
        if ($busca !== "") {
            $like = "%{$busca}%";
            $q->where(function ($w) use ($like) {
                $w->where("nome", "like", $like)->orWhere("email", "like", $like);
            });
        }
        return response()->json(
            $q->orderBy("nome")->limit(50)->get(["id", "nome", "email", "tipo", "foto"])
        );
    }

    // ---------- helpers ----------

    private function conversaOuFalha(int $id, int $userId): Conversa {
        $c = Conversa::findOrFail($id);
        abort_unless($c->temParticipante($userId), 403, "Sem acesso a esta conversa.");
        return $c;
    }

    /** @return array<int,int> [conversa_id => count] */
    private function contarNaoLidasPorConversa(int $userId, $conversasIds): array {
        if (empty($conversasIds) || (is_object($conversasIds) && $conversasIds->isEmpty())) return [];
        $rows = DB::table("mensagens as m")
            ->join("conversa_participantes as cp", function ($j) use ($userId) {
                $j->on("cp.conversa_id", "=", "m.conversa_id")
                  ->where("cp.user_id", "=", $userId);
            })
            ->whereIn("m.conversa_id", $conversasIds)
            ->where("m.user_id", "!=", $userId)
            ->where(function ($w) {
                $w->whereNull("cp.last_read_at")
                  ->orWhereColumn("m.created_at", ">", "cp.last_read_at");
            })
            ->groupBy("m.conversa_id")
            ->selectRaw("m.conversa_id, COUNT(*) as total")
            ->pluck("total", "m.conversa_id")
            ->all();
        return array_map("intval", $rows);
    }

    private function tituloDaConversa(Conversa $c, int $userId): string {
        if ($c->titulo) return $c->titulo;
        if ($c->tipo === "turma" && $c->turma) return "Turma " . $c->turma->nome;
        $outros = $c->utilizadores->where("id", "!=", $userId);
        return $outros->pluck("nome")->implode(", ") ?: "Conversa";
    }

    private function tipoPrivado(User $a, User $b): string {
        $tipos = collect([$a->tipo, $b->tipo]);
        if ($tipos->contains("admin") && ($tipos->contains("aluno") || $tipos->contains("encarregado"))) {
            return "admin_ee";
        }
        return "privada";
    }
}
