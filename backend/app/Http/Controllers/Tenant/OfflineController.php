<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\CaixaSessao;
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
            "warmup_urls" => [
                "/dashboard",
                "/caixa/actual",
                "/precario/propinas",
                "/precario/emolumentos",
                "/configuracoes/escola",
                "/meses",
            ],
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
