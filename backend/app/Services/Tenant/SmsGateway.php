<?php
namespace App\Services\Tenant;

use App\Models\Tenant\LembreteConfig;
use Illuminate\Support\Facades\Http;

/**
 * Gateway SMS genérico — qualquer provedor REST que aceite POST com JSON
 * ou form-urlencoded. O payload é montado a partir de `sms_gateway_payload_template`
 * com placeholders {to}, {sender}, {mensagem}.
 *
 * Compatível por configuração com Twilio, Africa's Talking, Vonage e a maioria
 * de provedores angolanos que exponham endpoints HTTP.
 */
class SmsGateway {
    public function __construct(private LembreteConfig $config) {}

    public static function fromConfig(): self {
        return new self(LembreteConfig::current());
    }

    /**
     * @return array{ok:bool, status:int, body:string, erro:?string, payload:array}
     */
    public function enviar(string $telefone, string $mensagem): array {
        $cfg = $this->config;
        if (!$cfg->sms_gateway_url) {
            return ["ok" => false, "status" => 0, "body" => "", "erro" => "URL do gateway SMS não configurada.", "payload" => []];
        }

        $payload = $this->montarPayload($telefone, $mensagem);
        $method  = strtoupper($cfg->sms_gateway_method ?? "POST");

        try {
            $request = Http::timeout(15)->acceptJson();
            if ($cfg->sms_gateway_api_key) {
                $key = $cfg->sms_gateway_api_key;
                if (str_contains($key, ":")) {
                    [$user, $pass] = explode(":", $key, 2);
                    $request = $request->withBasicAuth($user, $pass);
                } elseif (str_starts_with($key, "Bearer ") || str_starts_with($key, "Basic ")) {
                    $request = $request->withHeaders(["Authorization" => $key]);
                } else {
                    $request = $request->withToken($key);
                }
            }

            $response = $method === "GET"
                ? $request->get($cfg->sms_gateway_url, $payload)
                : $request->asJson()->{strtolower($method)}($cfg->sms_gateway_url, $payload);

            $body = (string)$response->body();
            return [
                "ok"      => $response->successful(),
                "status"  => $response->status(),
                "body"    => $body,
                "payload" => $payload,
                "erro"    => $response->successful() ? null : "HTTP {$response->status()}: ".substr($body, 0, 500),
            ];
        } catch (\Throwable $e) {
            return [
                "ok"      => false,
                "status"  => 0,
                "body"    => "",
                "payload" => $payload,
                "erro"    => $e->getMessage(),
            ];
        }
    }

    private function montarPayload(string $telefone, string $mensagem): array {
        $template = $this->config->sms_gateway_payload_template ?? '{"to":"{telefone}","message":"{mensagem}"}';
        $vars = [
            "{telefone}" => $telefone,
            "{to}"       => $telefone,
            "{mensagem}" => $mensagem,
            "{message}"  => $mensagem,
            "{sender}"   => (string)($this->config->sms_sender_id ?? ""),
            "{from}"     => (string)($this->config->sms_sender_id ?? ""),
        ];
        $rendered = strtr($template, $vars);
        $decoded  = json_decode($rendered, true);
        return is_array($decoded) ? $decoded : ["to" => $telefone, "message" => $mensagem];
    }
}
