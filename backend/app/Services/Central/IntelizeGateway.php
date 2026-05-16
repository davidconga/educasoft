<?php
namespace App\Services\Central;

use App\Models\Central\FacturaCentral;
use App\Models\Central\IntelizeConfig;
use App\Models\Central\ReferenciaPagamento;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Driver dedicado para a Intelize (gateway de referências Multicaixa).
 *
 * Configuração lida da tabela `intelize_config` (singleton, id=1).
 * Os valores do .env servem apenas como seed inicial.
 *
 * Fluxo:
 *   1) POST {base}{auth_path} com {username,password} -> token
 *   2) POST {base}{references_path} com payload de pagamento e headers
 *      Auth: <token>, criador: <id>, Entidade: <entidade>
 */
class IntelizeGateway {
    public function gerar(FacturaCentral $factura, ?int $validadeDias = null): ReferenciaPagamento {
        $cfg = IntelizeConfig::current();
        $entidade = (string) ($cfg->entidade ?: config("services.referencias.entidade", "11111"));
        $validade = Carbon::now()->addDays($validadeDias ?? (int) ($cfg->validade_dias ?: 30));
        $valor    = (float) $factura->total;

        $base = rtrim((string) $cfg->base_url, "/");
        if (!$base) {
            return $this->gerarInterna($factura, $entidade, $valor, $validade);
        }

        $payload = [
            "entidade"   => $entidade,
            "valor"      => round($valor, 2),
            "validade"   => $validade->toDateString(),
            "descricao"  => "Educajá " . $factura->numero,
            "factura_id" => $factura->id,
        ];

        try {
            $token = $this->autenticar($cfg);
            if (!$token) {
                throw new \RuntimeException("Falha a autenticar na Intelize.");
            }

            $criador = (string) ($cfg->criador ?? "");
            $req = Http::timeout(20)
                ->acceptJson()
                ->withHeaders(array_filter([
                    "Auth"     => $token,
                    "criador"  => $criador !== "" ? $criador : null,
                    "Entidade" => $entidade,
                ]));

            $path = "/" . ltrim((string) ($cfg->references_path ?: "/references"), "/");
            $response = $req->asJson()->post($base . $path, $payload);
            $body = $response->json() ?? [];
            $code = $body["referencia"]
                ?? $body["reference"]
                ?? $body["data"]["referencia"]
                ?? $body["data"]["reference"]
                ?? null;

            if (!$response->successful() || !$code) {
                $ref = $this->gerarInterna($factura, $entidade, $valor, $validade);
                $ref->update([
                    "gateway_request"  => $payload,
                    "gateway_response" => array_merge((array) $body, [
                        "_status" => $response->status(),
                        "_erro"   => "Intelize sem referência válida; usada referência interna.",
                    ]),
                ]);
                return $ref;
            }

            return ReferenciaPagamento::create([
                "factura_id"       => $factura->id,
                "entidade"         => $body["entidade"] ?? $entidade,
                "referencia"       => (string) $code,
                "valor"            => $valor,
                "estado"           => "pendente",
                "expira_em"        => $validade,
                "gateway_request"  => $payload,
                "gateway_response" => $body,
            ]);
        } catch (\Throwable $e) {
            Log::warning("IntelizeGateway: " . $e->getMessage());
            $ref = $this->gerarInterna($factura, $entidade, $valor, $validade);
            $ref->update([
                "gateway_request"  => $payload,
                "gateway_response" => ["_erro" => $e->getMessage()],
            ]);
            return $ref;
        }
    }

    /**
     * Testa a ligação à Intelize chamando o endpoint de auth.
     * Devolve [ok, status, erro, token_obtido].
     */
    public function testar(): array {
        $cfg = IntelizeConfig::current();
        $base = rtrim((string) $cfg->base_url, "/");
        if (!$base) {
            return ["ok" => false, "status" => 0, "erro" => "Base URL não definida.", "token_obtido" => false];
        }
        $username = (string) ($cfg->username ?? "");
        $password = (string) ($cfg->password ?? "");
        if ($username === "" || $password === "") {
            return ["ok" => false, "status" => 0, "erro" => "Credenciais (username / password) em falta.", "token_obtido" => false];
        }

        Cache::forget("intelize:token");
        try {
            $token = $this->autenticar($cfg);
            return [
                "ok"           => (bool) $token,
                "status"       => $token ? 200 : 401,
                "erro"         => $token ? null : "Auth respondeu sem token. Verifica credenciais ou caminho de auth.",
                "token_obtido" => (bool) $token,
            ];
        } catch (\Throwable $e) {
            return ["ok" => false, "status" => 0, "erro" => $e->getMessage(), "token_obtido" => false];
        }
    }

    private function autenticar(IntelizeConfig $cfg): ?string {
        $cacheKey = "intelize:token";
        $cached = Cache::get($cacheKey);
        if ($cached) return $cached;

        $username = (string) ($cfg->username ?? "");
        $password = (string) ($cfg->password ?? "");
        if ($username === "" || $password === "") return null;

        $base = rtrim((string) $cfg->base_url, "/");
        $path = "/" . ltrim((string) ($cfg->auth_path ?: "/auth"), "/");
        $response = Http::timeout(15)
            ->acceptJson()
            ->asJson()
            ->post($base . $path, [
                "username" => $username,
                "password" => $password,
            ]);

        if (!$response->successful()) {
            Log::warning("IntelizeGateway: auth falhou", [
                "status" => $response->status(),
                "body"   => $response->body(),
            ]);
            return null;
        }

        $body = $response->json() ?? [];
        $token = $body["token"]
            ?? $body["access_token"]
            ?? $body["auth"]
            ?? $body["data"]["token"]
            ?? $response->header("Auth")
            ?? null;

        if ($token) {
            $ttl = (int) ($cfg->token_ttl_min ?: 50);
            Cache::put($cacheKey, $token, now()->addMinutes(max(1, $ttl)));
        }
        return $token;
    }

    private function gerarInterna(FacturaCentral $factura, string $entidade, float $valor, Carbon $validade): ReferenciaPagamento {
        $base = str_pad((string) $factura->id, 7, "0", STR_PAD_LEFT);
        $checksum = (int) substr((string) ($factura->id * 97 + 13), -2);
        $ref = $base . str_pad((string) $checksum, 2, "0", STR_PAD_LEFT);

        return ReferenciaPagamento::create([
            "factura_id" => $factura->id,
            "entidade"   => $entidade,
            "referencia" => $ref,
            "valor"      => $valor,
            "estado"     => "pendente",
            "expira_em"  => $validade,
        ]);
    }
}
