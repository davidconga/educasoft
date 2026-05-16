<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

/**
 * Idempotência para escritas vindas da app offline.
 *
 * O cliente envia `Idempotency-Key: <uuid>` no header. Para a mesma chave e
 * mesmo (método, path, body):
 *   - 1ª execução: corre normalmente, regista a resposta.
 *   - Re-tentativas: devolve a resposta original gravada (sem voltar a executar
 *     o handler).
 *   - Concorrente: devolve 409 (a 1ª ainda está a executar).
 *   - Mesma chave + body diferente: devolve 409 (cliente reusou indevidamente).
 *
 * Apenas activa em POST/PUT/PATCH (GET/DELETE não precisam).
 * Apenas activa quando o header está presente — endpoints normais continuam
 * a funcionar sem alterações para clientes que não enviam a chave.
 *
 * Depende de `InitializeTenant` ter corrido antes (usa connection tenant).
 */
class Idempotency
{
    /** Janela de retenção da chave após completar. */
    private const TTL_DAYS = 7;

    /** Quanto tempo consideramos um pedido "em execução" antes de assumir crash. */
    private const PROCESSING_GRACE_SECONDS = 60;

    public function handle(Request $request, Closure $next): SymfonyResponse {
        $method = strtoupper($request->method());
        if (!in_array($method, ["POST", "PUT", "PATCH"], true)) {
            return $next($request);
        }

        $key = trim((string) $request->header("Idempotency-Key", ""));
        if ($key === "") {
            return $next($request);
        }
        if (strlen($key) > 80 || !preg_match('/^[A-Za-z0-9._\-:]+$/', $key)) {
            return response()->json(["message" => "Idempotency-Key inválida."], 400);
        }

        $path = "/" . ltrim($request->path(), "/");
        $bodyHash = hash("sha256", $request->getContent() ?: "");
        $user = $request->attributes->get("auth_user");
        $userId = $user?->id;

        $now = now();

        $existing = DB::connection("tenant")
            ->table("idempotency_keys")
            ->where("key", $key)
            ->first();

        if ($existing) {
            // Mesma chave para utilizador diferente → tratar como conflito (não devolvemos resposta de outro user).
            if ($userId !== null && $existing->user_id !== null && (int) $existing->user_id !== (int) $userId) {
                return response()->json([
                    "message" => "Idempotency-Key já usada por outro utilizador.",
                ], 409);
            }
            // Mesma chave, request diferente → conflito.
            if ($existing->method !== $method
                || $existing->path !== $path
                || !hash_equals((string) $existing->request_hash, $bodyHash)) {
                return response()->json([
                    "message" => "Idempotency-Key já usada com um pedido diferente.",
                ], 409);
            }
            // Já temos resposta? Devolver a original.
            if ($existing->status_code !== null && $existing->response_body !== null) {
                return response()
                    ->json(json_decode($existing->response_body, true), (int) $existing->status_code)
                    ->header("Idempotent-Replay", "true");
            }
            // Ainda em execução noutro processo (e dentro da janela de graça)?
            if ($existing->processing_until !== null && strtotime($existing->processing_until) > $now->getTimestamp()) {
                return response()->json([
                    "message" => "Pedido idêntico ainda em processamento.",
                ], 409);
            }
            // Fora da janela → primeiro processo crashou. Vamos reservar e re-executar.
            $reserved = DB::connection("tenant")
                ->table("idempotency_keys")
                ->where("id", $existing->id)
                ->whereNull("status_code")
                ->where(function ($q) use ($now) {
                    $q->whereNull("processing_until")
                      ->orWhere("processing_until", "<=", $now);
                })
                ->update([
                    "processing_until" => $now->copy()->addSeconds(self::PROCESSING_GRACE_SECONDS),
                    "updated_at" => $now,
                ]);
            if (!$reserved) {
                // Outro processo apanhou primeiro — devolver 409.
                return response()->json([
                    "message" => "Pedido idêntico em processamento concorrente.",
                ], 409);
            }
        } else {
            try {
                DB::connection("tenant")->table("idempotency_keys")->insert([
                    "key"              => $key,
                    "user_id"          => $userId,
                    "method"           => $method,
                    "path"             => $path,
                    "request_hash"     => $bodyHash,
                    "status_code"      => null,
                    "response_body"    => null,
                    "processing_until" => $now->copy()->addSeconds(self::PROCESSING_GRACE_SECONDS),
                    "expires_at"       => $now->copy()->addDays(self::TTL_DAYS),
                    "created_at"       => $now,
                    "updated_at"       => $now,
                ]);
            } catch (\Throwable $e) {
                // Race: outro processo inseriu a chave entre o SELECT e o INSERT.
                // Re-ler e devolver 409 se ainda em processamento, ou resposta cacheada se já completou.
                $racer = DB::connection("tenant")
                    ->table("idempotency_keys")
                    ->where("key", $key)
                    ->first();
                if (!$racer) throw $e;
                if ($racer->status_code !== null && $racer->response_body !== null) {
                    return response()
                        ->json(json_decode($racer->response_body, true), (int) $racer->status_code)
                        ->header("Idempotent-Replay", "true");
                }
                return response()->json([
                    "message" => "Pedido idêntico em processamento concorrente.",
                ], 409);
            }
        }

        // Executar o handler real.
        $response = $next($request);

        // Apenas cacheamos respostas JSON 2xx (4xx/5xx podem variar por estado do servidor).
        $status = $response->getStatusCode();
        if ($status >= 200 && $status < 300) {
            $content = $response->getContent();
            // Validar que é JSON (a maior parte das nossas rotas devolvem JsonResponse).
            $decoded = json_decode($content, true);
            $isJson = json_last_error() === JSON_ERROR_NONE;
            DB::connection("tenant")
                ->table("idempotency_keys")
                ->where("key", $key)
                ->update([
                    "status_code"      => $status,
                    "response_body"    => $isJson ? $content : null,
                    "processing_until" => null,
                    "updated_at"       => now(),
                ]);
            if (!$isJson) {
                // Não conseguimos cachear → libertamos a chave para não bloquear retries.
                Log::warning("Idempotency: resposta não-JSON para chave $key path=$path");
            }
        } else {
            // Erros: libertar a chave para o cliente poder tentar de novo após corrigir.
            DB::connection("tenant")
                ->table("idempotency_keys")
                ->where("key", $key)
                ->delete();
        }

        return $response;
    }
}
