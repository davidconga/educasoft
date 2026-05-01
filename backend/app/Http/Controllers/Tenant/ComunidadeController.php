<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Comentario;
use App\Models\Tenant\Gosto;
use App\Models\Tenant\Post;
use App\Models\Tenant\Turma;
use App\Models\Tenant\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComunidadeController extends Controller {
    /**
     * Feed cronológico da escola.
     * Mostra posts com audiência=escola + posts de turmas em que o user
     * pertence. Posts fixados aparecem no topo. Cursor: ?antes={id}.
     */
    public function feed(Request $r) {
        $user      = $r->user();
        $turmasIds = $this->turmasDoUser($user);

        $base = Post::query()
            ->where("tipo", "post")
            ->where(function ($w) use ($turmasIds) {
                $w->where("audiencia", "escola")
                  ->orWhere(function ($w2) use ($turmasIds) {
                      $w2->where("audiencia", "turma")->whereIn("turma_id", $turmasIds);
                  });
            });

        if ($r->filled("antes")) {
            $base->where("id", "<", (int) $r->antes);
        }

        $posts = $base->with(["autor:id,nome,tipo,foto", "turma:id,nome"])
            ->orderByDesc("fixado")
            ->orderByDesc("id")
            ->limit(20)
            ->get();

        return response()->json($this->formatarPosts($posts, $user->id));
    }

    /** Fórum de uma turma — só tópicos do tipo "forum" dessa turma. */
    public function forumTurma(Request $r, int $turma) {
        $user = $r->user();
        $this->garantirAcessoTurma($user, $turma);

        $base = Post::query()
            ->where("tipo", "forum")
            ->where("turma_id", $turma);

        if ($r->filled("antes")) {
            $base->where("id", "<", (int) $r->antes);
        }
        $posts = $base->with(["autor:id,nome,tipo,foto", "turma:id,nome"])
            ->orderByDesc("fixado")
            ->orderByDesc("id")
            ->limit(20)
            ->get();

        return response()->json($this->formatarPosts($posts, $user->id));
    }

    /** Detalhe de um post + comentários ordenados por data. */
    public function show(Request $r, int $post) {
        $p = Post::with(["autor:id,nome,tipo,foto", "turma:id,nome"])->findOrFail($post);
        $this->garantirVisibilidade($r->user(), $p);

        $comentarios = Comentario::query()
            ->where("post_id", $p->id)
            ->with("autor:id,nome,tipo,foto")
            ->orderBy("created_at")
            ->get();

        $jaGostei = Gosto::where("post_id", $p->id)->where("user_id", $r->user()->id)->exists();

        return response()->json([
            "post"        => $this->formatarPost($p, $r->user()->id, $jaGostei),
            "comentarios" => $comentarios->map(fn ($c) => [
                "id"         => $c->id,
                "corpo"      => $c->corpo,
                "created_at" => $c->created_at,
                "autor"      => [
                    "id"   => $c->autor->id ?? null,
                    "nome" => $c->autor->nome ?? "Removido",
                    "tipo" => $c->autor->tipo ?? null,
                    "foto" => $c->autor->foto ?? null,
                ],
                "aceite"     => $p->resposta_aceite_id === $c->id,
            ])->values(),
        ]);
    }

    /** Cria um post (feed) ou tópico de fórum. */
    public function criar(Request $r) {
        $user = $r->user();
        $data = $r->validate([
            "tipo"      => "required|in:post,forum",
            "audiencia" => "required|in:escola,turma",
            "turma_id"  => "nullable|integer|exists:turmas,id",
            "titulo"    => "nullable|string|max:200",
            "corpo"     => "required|string|max:10000",
        ]);

        if ($data["tipo"] === "forum") {
            if (empty($data["turma_id"])) {
                return response()->json(["message" => "Tópico de fórum requer turma."], 422);
            }
            if (empty($data["titulo"])) {
                return response()->json(["message" => "Tópico requer título."], 422);
            }
            $data["audiencia"] = "turma";
            $this->garantirAcessoTurma($user, (int) $data["turma_id"]);
        }
        if ($data["audiencia"] === "turma") {
            if (empty($data["turma_id"])) {
                return response()->json(["message" => "Audiência de turma requer turma_id."], 422);
            }
            $this->garantirAcessoTurma($user, (int) $data["turma_id"]);
        } else {
            $data["turma_id"] = null;
        }

        $post = Post::create([
            "autor_user_id" => $user->id,
            "audiencia"     => $data["audiencia"],
            "turma_id"      => $data["turma_id"] ?? null,
            "tipo"          => $data["tipo"],
            "titulo"        => $data["titulo"] ?? null,
            "corpo"         => trim($data["corpo"]),
        ]);

        $post->load(["autor:id,nome,tipo,foto", "turma:id,nome"]);
        return response()->json($this->formatarPost($post, $user->id, false), 201);
    }

    /** Actualiza corpo/título/fixado. Apenas autor (corpo/título) ou admin (tudo). */
    public function actualizar(Request $r, int $post) {
        $user = $r->user();
        $p    = Post::findOrFail($post);
        $eAdmin = $user->tipo === "admin";

        if (! $eAdmin && $p->autor_user_id !== $user->id) {
            return response()->json(["message" => "Sem permissão."], 403);
        }

        $regras = [
            "titulo" => "nullable|string|max:200",
            "corpo"  => "sometimes|required|string|max:10000",
        ];
        if ($eAdmin) $regras["fixado"] = "nullable|boolean";

        $data = $r->validate($regras);
        $p->update($data);
        $p->load(["autor:id,nome,tipo,foto", "turma:id,nome"]);
        return response()->json($this->formatarPost($p, $user->id, $this->jaGostei($p->id, $user->id)));
    }

    /** Remove (soft) um post. Autor ou admin. */
    public function apagar(Request $r, int $post) {
        $user = $r->user();
        $p    = Post::findOrFail($post);
        if ($user->tipo !== "admin" && $p->autor_user_id !== $user->id) {
            return response()->json(["message" => "Sem permissão."], 403);
        }
        $p->delete();
        return response()->json(["ok" => true]);
    }

    /** Adiciona comentário. */
    public function comentar(Request $r, int $post) {
        $user = $r->user();
        $p    = Post::findOrFail($post);
        $this->garantirVisibilidade($user, $p);

        $data = $r->validate(["corpo" => "required|string|max:5000"]);

        $c = DB::transaction(function () use ($p, $user, $data) {
            $c = Comentario::create([
                "post_id"       => $p->id,
                "autor_user_id" => $user->id,
                "corpo"         => trim($data["corpo"]),
            ]);
            $p->increment("comentarios_count");
            return $c;
        });

        $c->load("autor:id,nome,tipo,foto");
        return response()->json([
            "id"         => $c->id,
            "corpo"      => $c->corpo,
            "created_at" => $c->created_at,
            "autor"      => [
                "id"   => $c->autor->id,
                "nome" => $c->autor->nome,
                "tipo" => $c->autor->tipo,
                "foto" => $c->autor->foto,
            ],
            "aceite"     => false,
        ], 201);
    }

    /** Apaga comentário. Autor ou admin. */
    public function apagarComentario(Request $r, int $comentario) {
        $user = $r->user();
        $c    = Comentario::findOrFail($comentario);
        if ($user->tipo !== "admin" && $c->autor_user_id !== $user->id) {
            return response()->json(["message" => "Sem permissão."], 403);
        }
        DB::transaction(function () use ($c) {
            $c->delete();
            Post::where("id", $c->post_id)->decrement("comentarios_count");
            // Se era a resposta aceite, limpar.
            Post::where("id", $c->post_id)
                ->where("resposta_aceite_id", $c->id)
                ->update(["resposta_aceite_id" => null]);
        });
        return response()->json(["ok" => true]);
    }

    /** Toggle gosto (idempotente). Devolve novo total. */
    public function gostar(Request $r, int $post) {
        $user = $r->user();
        $p    = Post::findOrFail($post);
        $this->garantirVisibilidade($user, $p);

        $existente = Gosto::where("post_id", $p->id)->where("user_id", $user->id)->first();
        if ($existente) {
            DB::transaction(function () use ($existente, $p) {
                $existente->delete();
                $p->decrement("gostos_count");
            });
            return response()->json(["gostos" => max(0, $p->gostos_count - 1), "gostei" => false]);
        }
        DB::transaction(function () use ($p, $user) {
            Gosto::create(["post_id" => $p->id, "user_id" => $user->id]);
            $p->increment("gostos_count");
        });
        return response()->json(["gostos" => $p->gostos_count + 1, "gostei" => true]);
    }

    /** Marca um comentário como resposta aceite (apenas autor do tópico ou admin, e só em fóruns). */
    public function aceitar(Request $r, int $post, int $comentario) {
        $user = $r->user();
        $p    = Post::findOrFail($post);
        if ($p->tipo !== "forum") {
            return response()->json(["message" => "Apenas tópicos de fórum aceitam respostas."], 422);
        }
        if ($user->tipo !== "admin" && $p->autor_user_id !== $user->id) {
            return response()->json(["message" => "Sem permissão."], 403);
        }
        $c = Comentario::where("id", $comentario)->where("post_id", $p->id)->firstOrFail();

        // Toggle: se já era a aceite, limpa.
        $novoId = ($p->resposta_aceite_id === $c->id) ? null : $c->id;
        $p->update(["resposta_aceite_id" => $novoId]);

        return response()->json(["resposta_aceite_id" => $novoId]);
    }

    // ---------- helpers ----------

    /** @return array<int> */
    private function turmasDoUser(User $user): array {
        if ($user->tipo === "admin") {
            return Turma::pluck("id")->all();
        }
        if ($user->tipo === "aluno") {
            return DB::table("matriculas")
                ->join("alunos", "alunos.id", "=", "matriculas.aluno_id")
                ->where("alunos.user_id", $user->id)
                ->where("matriculas.status", "activa")
                ->pluck("matriculas.turma_id")
                ->unique()
                ->values()
                ->all();
        }
        if ($user->tipo === "professor") {
            return DB::table("turma_disciplina")
                ->join("professores", "professores.id", "=", "turma_disciplina.professor_id")
                ->where("professores.user_id", $user->id)
                ->pluck("turma_disciplina.turma_id")
                ->unique()
                ->values()
                ->all();
        }
        return [];
    }

    private function garantirAcessoTurma(User $user, int $turmaId): void {
        if ($user->tipo === "admin") return;
        $ids = $this->turmasDoUser($user);
        abort_unless(in_array($turmaId, $ids, true), 403, "Sem acesso a esta turma.");
    }

    private function garantirVisibilidade(User $user, Post $p): void {
        if ($user->tipo === "admin") return;
        if ($p->audiencia === "escola") return;
        if ($p->audiencia === "turma") {
            $ids = $this->turmasDoUser($user);
            abort_unless(in_array((int) $p->turma_id, $ids, true), 403, "Sem acesso a este post.");
            return;
        }
        abort(403, "Sem acesso.");
    }

    private function jaGostei(int $postId, int $userId): bool {
        return Gosto::where("post_id", $postId)->where("user_id", $userId)->exists();
    }

    /** @param \Illuminate\Database\Eloquent\Collection<Post> $posts */
    private function formatarPosts($posts, int $userId): array {
        if ($posts->isEmpty()) return [];
        $idsGostados = Gosto::whereIn("post_id", $posts->pluck("id"))
            ->where("user_id", $userId)
            ->pluck("post_id")
            ->all();
        $set = array_flip($idsGostados);
        return $posts->map(fn ($p) => $this->formatarPost($p, $userId, isset($set[$p->id])))->values()->all();
    }

    private function formatarPost(Post $p, int $userId, bool $gostei): array {
        return [
            "id"                 => $p->id,
            "tipo"               => $p->tipo,
            "audiencia"          => $p->audiencia,
            "titulo"             => $p->titulo,
            "corpo"              => $p->corpo,
            "fixado"             => (bool) $p->fixado,
            "gostos"             => (int) $p->gostos_count,
            "comentarios"        => (int) $p->comentarios_count,
            "gostei"             => $gostei,
            "resposta_aceite_id" => $p->resposta_aceite_id,
            "created_at"         => $p->created_at,
            "turma"              => $p->turma ? ["id" => $p->turma->id, "nome" => $p->turma->nome] : null,
            "autor"              => [
                "id"   => $p->autor->id ?? null,
                "nome" => $p->autor->nome ?? "Removido",
                "tipo" => $p->autor->tipo ?? null,
                "foto" => $p->autor->foto ?? null,
            ],
            "podeEditar"         => $p->autor_user_id === $userId,
        ];
    }
}
