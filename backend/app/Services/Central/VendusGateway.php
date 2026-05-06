<?php
namespace App\Services\Central;

use App\Models\Central\Escola;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gateway Vendus AO (https://www.vendus.co.ao/ws/).
 *
 * Suporta dois modos de credenciais:
 *   - fromEnv()           → conta global do operador (facturas centrais a escolas)
 *   - forEscola($escola)  → conta da escola (facturação a alunos/EE no tenant)
 *
 * Vendus usa HTTP Basic auth com api_key como utilizador e password vazia.
 */
class VendusGateway {
    public function __construct(
        private string $baseUrl,
        private ?string $apiKey,
        private ?string $registerId,
        private ?string $serie,
        private string $modo,
        private int $timeout,
        private bool $verifySsl,
    ) {}

    public static function fromEnv(): self {
        return new self(
            baseUrl:    rtrim((string) config("services.vendus.base_url"), "/") . "/",
            apiKey:     config("services.vendus.api_key"),
            registerId: config("services.vendus.register_id"),
            serie:      config("services.vendus.serie"),
            modo:       (string) config("services.vendus.modo", "live"),
            timeout:    (int) config("services.vendus.timeout", 20),
            verifySsl:  (bool) config("services.vendus.verify_ssl", true),
        );
    }

    public static function forEscola(Escola $escola): self {
        return new self(
            baseUrl:    rtrim((string) config("services.vendus.base_url"), "/") . "/",
            apiKey:     $escola->vendus_api_key,
            registerId: $escola->vendus_register_id,
            serie:      $escola->vendus_serie,
            modo:       (string) ($escola->vendus_modo ?: "live"),
            timeout:    (int) config("services.vendus.timeout", 20),
            verifySsl:  (bool) config("services.vendus.verify_ssl", true),
        );
    }

    public function configurado(): bool {
        return !empty($this->apiKey);
    }

    public function registerId(): ?string { return $this->registerId; }
    public function serie(): ?string      { return $this->serie; }
    public function modo(): string        { return $this->modo; }

    /**
     * @return array{ok:bool, status:int, body:array|string, erro:?string}
     */
    public function emitirDocumento(array $payload): array {
        return $this->request("POST", "documents", $payload);
    }

    public function buscarDocumento(int|string $id): array {
        return $this->request("GET", "documents/" . rawurlencode((string) $id));
    }

    public function cancelarDocumento(int|string $id, string $motivo = ""): array {
        return $this->request("PATCH", "documents/" . rawurlencode((string) $id), [
            "status" => "N",
            "reason" => $motivo,
        ]);
    }

    /**
     * Devolve bytes do PDF do documento (ou erro).
     * @return array{ok:bool, status:int, body:string, erro:?string}
     */
    public function descarregarPdf(int|string $id): array {
        if (!$this->configurado()) {
            return ["ok" => false, "status" => 0, "body" => "", "erro" => "Vendus não configurado"];
        }
        try {
            $response = $this->client()->get("documents/" . rawurlencode((string) $id) . "/pdf");
            return [
                "ok"     => $response->successful(),
                "status" => $response->status(),
                "body"   => (string) $response->body(),
                "erro"   => $response->successful() ? null : "HTTP {$response->status()}",
            ];
        } catch (\Throwable $e) {
            return ["ok" => false, "status" => 0, "body" => "", "erro" => $e->getMessage()];
        }
    }

    public function listarClientes(array $filtros = []): array {
        return $this->request("GET", "clients", $filtros);
    }

    public function criarCliente(array $payload): array {
        return $this->request("POST", "clients", $payload);
    }

    public function listarDocumentos(array $filtros = []): array {
        return $this->request("GET", "documents", $filtros);
    }

    private function request(string $method, string $path, array $data = []): array {
        if (!$this->configurado()) {
            return ["ok" => false, "status" => 0, "body" => [], "erro" => "Vendus não configurado"];
        }

        try {
            $req = $this->client();
            $method = strtoupper($method);
            $response = match ($method) {
                "GET"    => $req->get($path, $data),
                "POST"   => $req->asJson()->post($path, $data),
                "PATCH"  => $req->asJson()->patch($path, $data),
                "DELETE" => $req->delete($path, $data),
                default  => throw new \InvalidArgumentException("Método HTTP inválido: $method"),
            };

            $body = $response->json() ?? (string) $response->body();

            if (!$response->successful()) {
                Log::warning("Vendus API erro", [
                    "method" => $method, "path" => $path,
                    "status" => $response->status(), "body" => $body,
                ]);
            }

            $erro = null;
            if (!$response->successful()) {
                $msgVendus = null;
                if (is_array($body)) {
                    $msgVendus = $body["errors"][0]["message"]
                        ?? $body["errors"][0]["error"]
                        ?? (is_array($body["errors"] ?? null) ? json_encode($body["errors"], JSON_UNESCAPED_UNICODE) : null)
                        ?? $body["error"]
                        ?? $body["message"]
                        ?? null;
                } elseif (is_string($body) && trim($body) !== "") {
                    $msgVendus = mb_substr(trim($body), 0, 400);
                }
                $erro = "HTTP {$response->status()}" . ($msgVendus ? " — {$msgVendus}" : "");
            }

            return [
                "ok"     => $response->successful(),
                "status" => $response->status(),
                "body"   => $body,
                "erro"   => $erro,
            ];
        } catch (\Throwable $e) {
            Log::error("Vendus API exceção", ["path" => $path, "erro" => $e->getMessage()]);
            return ["ok" => false, "status" => 0, "body" => [], "erro" => $e->getMessage()];
        }
    }

    private function client(): PendingRequest {
        return Http::baseUrl($this->baseUrl)
            ->timeout($this->timeout)
            ->withOptions(["verify" => $this->verifySsl])
            ->withBasicAuth((string) $this->apiKey, "")
            ->acceptJson();
    }
}
