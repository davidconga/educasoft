<?php
namespace App\Services\Central;

use App\Models\Central\WhatsappLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Gateway WhatsApp genérico — qualquer provedor REST (Twilio WhatsApp,
 * Meta WhatsApp Cloud API, BSP local). Configurado por env:
 *
 *   WHATSAPP_GATEWAY_URL              endpoint REST
 *   WHATSAPP_API_KEY                  Bearer/Basic/token simples (opcional "user:pass")
 *   WHATSAPP_GATEWAY_METHOD           POST|GET (default POST)
 *   WHATSAPP_GATEWAY_PAYLOAD_TEMPLATE JSON template com {telefone}, {mensagem}, {sender}
 *   WHATSAPP_FROM                     número/sender id
 *   SUPER_ADMIN_WHATSAPP              número do super-admin para alertas
 */
class WhatsappGateway {
    public function __construct(
        private ?string $url,
        private ?string $apiKey,
        private string $method,
        private string $payloadTemplate,
        private ?string $sender,
    ) {}

    public static function fromEnv(): self {
        return new self(
            url:             env("WHATSAPP_GATEWAY_URL"),
            apiKey:          env("WHATSAPP_API_KEY"),
            method:          strtoupper(env("WHATSAPP_GATEWAY_METHOD", "POST")),
            payloadTemplate: env("WHATSAPP_GATEWAY_PAYLOAD_TEMPLATE",
                                 '{"to":"{telefone}","type":"text","text":{"body":"{mensagem}"}}'),
            sender:          env("WHATSAPP_FROM"),
        );
    }

    public function configurado(): bool {
        return !empty($this->url);
    }

    /**
     * @return array{ok:bool, status:int, body:string, erro:?string, payload:array}
     */
    public function enviar(string $telefone, string $mensagem, string $contexto = "geral", ?string $referencia = null): array {
        $log = WhatsappLog::create([
            "destinatario" => $telefone,
            "contexto"     => $contexto,
            "referencia"   => $referencia,
            "mensagem"     => $mensagem,
            "estado"       => "pendente",
        ]);

        if (!$this->url) {
            $log->update(["estado" => "falhou", "erro" => "Gateway WhatsApp não configurado (.env WHATSAPP_GATEWAY_URL)"]);
            Log::warning("WhatsApp gateway não configurado", ["contexto" => $contexto, "ref" => $referencia]);
            return ["ok" => false, "status" => 0, "body" => "", "erro" => "WhatsApp não configurado", "payload" => []];
        }

        $payload = $this->montarPayload($telefone, $mensagem);

        try {
            $request = Http::timeout(20)->acceptJson();
            if ($this->apiKey) {
                $key = $this->apiKey;
                if (str_contains($key, ":")) {
                    [$user, $pass] = explode(":", $key, 2);
                    $request = $request->withBasicAuth($user, $pass);
                } elseif (str_starts_with($key, "Bearer ") || str_starts_with($key, "Basic ")) {
                    $request = $request->withHeaders(["Authorization" => $key]);
                } else {
                    $request = $request->withToken($key);
                }
            }

            $response = $this->method === "GET"
                ? $request->get($this->url, $payload)
                : $request->asJson()->{strtolower($this->method)}($this->url, $payload);

            $body = (string) $response->body();
            $log->update([
                "estado"      => $response->successful() ? "enviado" : "falhou",
                "http_status" => $response->status(),
                "resposta"    => substr($body, 0, 5000),
                "erro"        => $response->successful() ? null : "HTTP {$response->status()}",
                "enviado_em"  => $response->successful() ? now() : null,
            ]);

            return [
                "ok"      => $response->successful(),
                "status"  => $response->status(),
                "body"    => $body,
                "payload" => $payload,
                "erro"    => $response->successful() ? null : "HTTP {$response->status()}: " . substr($body, 0, 500),
            ];
        } catch (\Throwable $e) {
            $log->update(["estado" => "falhou", "erro" => $e->getMessage()]);
            return ["ok" => false, "status" => 0, "body" => "", "erro" => $e->getMessage(), "payload" => $payload];
        }
    }

    private function montarPayload(string $telefone, string $mensagem): array {
        $vars = [
            "{telefone}" => $telefone,
            "{to}"       => $telefone,
            "{mensagem}" => addcslashes($mensagem, "\"\\\n\r\t"),
            "{message}"  => addcslashes($mensagem, "\"\\\n\r\t"),
            "{sender}"   => (string) ($this->sender ?? ""),
            "{from}"     => (string) ($this->sender ?? ""),
        ];
        $rendered = strtr($this->payloadTemplate, $vars);
        $decoded  = json_decode($rendered, true);
        return is_array($decoded) ? $decoded : ["to" => $telefone, "message" => $mensagem];
    }
}
