<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\CaixaSessao;
use App\Models\Tenant\Pagamento;
use App\Services\Tenant\MultaCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Endpoints de suporte à camada offline:
 *  - manifest: snapshot leve do estado relevante para o cliente, devolvido
 *    no warm-up pós-login (counts, sessão de caixa, marcas de versão).
 *  - telemetry: receber métricas da outbox (queued, time-to-sync, fails)
 *    para sabermos quão bem a app aguenta internet má no terreno.
 */
class OfflineController extends Controller
{
    /**
     * Manifest enxuto para o cliente decidir o que pré-carregar e validar
     * estado local após reconexão. Não devolve listas grandes — apenas
     * marcadores. O cliente faz GETs separados (e o service worker cacheia).
     */
    public function manifest(Request $request) {
        $user   = $request->attributes->get("auth_user");
        $escola = $request->attributes->get("escola");

        $sessaoCaixa = $user
            ? CaixaSessao::where("operador_id", $user->id)
                ->where("status", "aberta")
                ->latest("abriu_em")
                ->first()
            : null;

        $alunosCount    = Aluno::count();
        $alunosMaxUpd   = (string) (Aluno::max("updated_at") ?? "");
        $precarioMaxUpd = (string) max(
            (string) (DB::table("precario_propinas")->max("updated_at") ?? ""),
            (string) (DB::table("precario_emolumentos")->max("updated_at") ?? "")
        );
        $configMaxUpd   = (string) ($escola?->updated_at ?? "");

        return response()->json([
            "server_time"   => now()->toIso8601String(),
            "tenant"        => $escola?->codigo,
            "user_id"       => $user?->id,
            "caixa_sessao"  => $sessaoCaixa ? [
                "id"        => $sessaoCaixa->id,
                "abriu_em"  => optional($sessaoCaixa->abriu_em)->toIso8601String(),
                "status"    => $sessaoCaixa->status,
            ] : null,
            // Marcadores de "versão" — o cliente pode comparar contra o último
            // manifest cacheado e decidir se vale a pena refrescar listas grandes.
            "versions" => [
                "alunos"    => ["count" => $alunosCount, "max_updated_at" => $alunosMaxUpd],
                "precario"  => ["max_updated_at" => $precarioMaxUpd],
                "configuracao" => ["max_updated_at" => $configMaxUpd],
            ],
            // Lista de URLs que o cliente deve pré-carregar para ficar utilizável offline.
            // Mantida no servidor para podermos ajustar sem novo deploy do frontend.
            // Inclui leituras P0 (dashboard/caixa/precário) e P1 (cascatas académicas
            // que alimentam Alunos.jsx, Notas, Presenças, Horários).
            "warmup_urls" => [
                "/dashboard",
                "/caixa/actual",
                "/precario/propinas",
                "/precario/emolumentos",
                "/configuracoes/escola",
                "/meses",
                "/turmas",
                "/cursos",
                "/classes",
                "/turnos",
                "/disciplinas",
                "/professores",
            ],
        ]);
    }

    /**
     * Snapshot enxuto dos alunos para pesquisa local quando offline.
     *
     * Devolve apenas os campos necessários para a barra de pesquisa do POS
     * (id, nome, numero_aluno, turma activa, foto). Sem dívidas — essas vêm
     * via `/pos/alunos/{id}/dividas` por aluno (a app cacheia em IndexedDB
     * à medida que o utilizador os visita online).
     *
     * Suporta paginação por `cursor` (id mínimo) para tenants grandes.
     * Devolve `next_cursor` se houver mais — o cliente itera até esgotar.
     */
    public function alunosSnapshot(Request $request) {
        $cursor = (int) $request->query("cursor", 0);
        $limit  = min(1000, max(50, (int) $request->query("limit", 500)));

        $rows = Aluno::with(["user:id,nome,email", "matriculas" => function ($q) {
                $q->where("status", "activa")->with("turma:id,nome");
            }])
            ->where("id", ">", $cursor)
            ->orderBy("id")
            ->limit($limit + 1)
            ->get();

        $hasMore = $rows->count() > $limit;
        if ($hasMore) $rows = $rows->take($limit);

        $items = $rows->map(function ($a) {
            return [
                "id"           => $a->id,
                "nome"         => $a->user?->nome,
                "email"        => $a->user?->email,
                "numero_aluno" => $a->numero_aluno,
                "turma"        => $a->matriculas->firstWhere("status", "activa")?->turma?->nome,
                "foto"         => $a->foto,
            ];
        });

        return response()->json([
            "items"        => $items,
            "next_cursor"  => $hasMore ? $rows->last()->id : null,
            "snapshot_at"  => now()->toIso8601String(),
        ]);
    }

    /**
     * Snapshot em bloco das dívidas pendentes/vencidas, agrupado por aluno.
     *
     * Permite ao cliente pré-cachear o payload de `/pos/alunos/{id}/dividas`
     * para todos os alunos com dívida activa, sem ter de visitar cada um
     * individualmente online. Resultado: ao tocar num aluno offline, a lista
     * de dívidas aparece em vez do aviso "sem dívidas cacheadas".
     *
     * Cada item já vem no formato esperado pelo `cacheDividas()` do frontend.
     * `saldo_carteira` e `lotes_recentes` são omitidos (calculá-los para
     * todos os alunos seria pesado e é informação que só interessa quando o
     * operador realmente abre o aluno — vem fresca quando ele estiver online).
     *
     * Pagina por cursor sobre `aluno_id`. Default 100 alunos por chamada.
     */
    public function dividasSnapshot(Request $request) {
        $cursor = (int) $request->query("cursor", 0);
        $limit  = min(200, max(20, (int) $request->query("limit", 100)));

        $alunoIds = Pagamento::whereIn("status", ["pendente", "vencido"])
            ->where("aluno_id", ">", $cursor)
            ->orderBy("aluno_id")
            ->distinct()
            ->limit($limit + 1)
            ->pluck("aluno_id");

        $hasMore = $alunoIds->count() > $limit;
        if ($hasMore) $alunoIds = $alunoIds->take($limit);

        if ($alunoIds->isEmpty()) {
            return response()->json([
                "items"       => [],
                "next_cursor" => null,
                "snapshot_at" => now()->toIso8601String(),
            ]);
        }

        $alunos = Aluno::with([
            "user:id,nome,email",
            "matriculas.turma.classe.curso",
            "matriculas.turma.turnoObj",
        ])
            ->whereIn("id", $alunoIds)
            ->get()
            ->keyBy("id");

        $pagamentosByAluno = Pagamento::with("propina", "emolumento")
            ->whereIn("aluno_id", $alunoIds)
            ->whereIn("status", ["pendente", "vencido"])
            ->orderBy("aluno_id")
            ->orderBy("data_vencimento")
            ->get()
            ->groupBy("aluno_id");

        // Aplica multas em memória para o payload bater o que `/pos/alunos/{id}/dividas` devolve.
        foreach ($pagamentosByAluno as $grupo) {
            MultaCalculator::aplicar($grupo);
        }

        $items = [];
        foreach ($alunoIds as $aid) {
            $aluno = $alunos[$aid] ?? null;
            if (!$aluno) continue;
            $pagamentos = $pagamentosByAluno[$aid] ?? collect();
            $items[] = [
                "aluno_id" => $aid,
                "payload" => [
                    "aluno" => [
                        "id"           => $aluno->id,
                        "nome"         => $aluno->user?->nome,
                        "numero_aluno" => $aluno->numero_aluno,
                        "turma"        => $aluno->matriculas->firstWhere("status", "activa")?->turma?->nome,
                        "foto"         => $aluno->foto,
                        "user"         => ["nome" => $aluno->user?->nome],
                        "matriculas"   => $aluno->matriculas,
                        "dados_academicos_verificados_em" => $aluno->dados_academicos_verificados_em,
                    ],
                    "dividas"        => $pagamentos->values(),
                    "total_devido"   => round((float) $pagamentos->sum(fn ($p) => $p->valor + ($p->multa_valor ?? 0) - ($p->bolsa_valor ?? 0)), 2),
                    "saldo_carteira" => 0,   // calculado online quando o operador abrir o aluno
                    "lotes_recentes" => [],  // idem
                ],
            ];
        }

        return response()->json([
            "items"       => $items,
            "next_cursor" => $hasMore ? $alunoIds->last() : null,
            "snapshot_at" => now()->toIso8601String(),
        ]);
    }

    /**
     * Telemetria de uma sessão offline.
     *
     * Payload esperado:
     *   {
     *     "session_started_at": "2026-05-16T10:00:00Z",
     *     "session_ended_at":   "2026-05-16T10:42:00Z",
     *     "queued":             12,    // total enviado à outbox
     *     "synced":             11,    // total que chegou a `synced`
     *     "failed":             1,     // 4xx hard, ficou em `failed`
     *     "ms_until_first_sync": 3200, // tempo entre voltar online e 1º sync
     *     "ms_total":           65000  // tempo total para esvaziar
     *   }
     *
     * Apenas registamos no log — não criamos tabela ainda (manter custo baixo).
     * Se viermos a precisar de análise estruturada, fazemos uma migração depois.
     */
    public function telemetry(Request $request) {
        $data = $request->validate([
            "session_started_at"  => "nullable|date",
            "session_ended_at"    => "nullable|date",
            "queued"              => "nullable|integer|min:0|max:100000",
            "synced"              => "nullable|integer|min:0|max:100000",
            "failed"              => "nullable|integer|min:0|max:100000",
            "ms_until_first_sync" => "nullable|integer|min:0|max:86400000",
            "ms_total"            => "nullable|integer|min:0|max:86400000",
        ]);
        $user   = $request->attributes->get("auth_user");
        $escola = $request->attributes->get("escola");
        Log::channel(config("logging.default"))->info("offline.telemetry", [
            "tenant"  => $escola?->codigo,
            "user_id" => $user?->id,
            ...$data,
        ]);
        return response()->json(["ok" => true]);
    }
}
