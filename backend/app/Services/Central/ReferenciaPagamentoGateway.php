<?php
namespace App\Services\Central;

use App\Models\Central\FacturaCentral;
use App\Models\Central\IntelizeConfig;
use App\Models\Central\ReferenciaPagamento;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

/**
 * Gateway genérico de geração de referências Multicaixa / por entidade.
 * Configuração via .env:
 *
 *   REF_GATEWAY_URL                  endpoint REST (ex: provedor BAI/BFA/Pagaki/etc.)
 *   REF_GATEWAY_API_KEY              Bearer / Basic ("user:pass") / token simples
 *   REF_GATEWAY_METHOD               POST|GET (default POST)
 *   REF_GATEWAY_PAYLOAD_TEMPLATE     JSON com {entidade},{factura_id},{valor},{validade},{descricao}
 *   REF_ENTIDADE                     entidade Multicaixa (5 dígitos)
 *   REF_VALIDADE_DIAS                dias de validade (default 30)
 *
 * Se REF_GATEWAY_URL estiver vazio, gera uma referência interna determinística
 * (entidade.config + sequência) — útil para testes / facturação manual.
 */
class ReferenciaPagamentoGateway {
    public function gerar(FacturaCentral $factura, ?int $validadeDias = null): ReferenciaPagamento {
        if (IntelizeConfig::current()->activo) {
            return app(IntelizeGateway::class)->gerar($factura, $validadeDias);
        }
        if (strtolower((string) config("services.referencias.driver", "")) === "intelize") {
            return app(IntelizeGateway::class)->gerar($factura, $validadeDias);
        }

        $entidade = (string) (env("REF_ENTIDADE", "11111"));
        $validade = Carbon::now()->addDays($validadeDias ?? (int) env("REF_VALIDADE_DIAS", 30));
        $valor    = (float) $factura->total;

        $url = env("REF_GATEWAY_URL");
        if (!$url) {
            return $this->gerarInterna($factura, $entidade, $valor, $validade);
        }

        $payload = $this->montarPayload($factura, $entidade, $valor, $validade);

        try {
            $req = Http::timeout(20)->acceptJson();
            $key = env("REF_GATEWAY_API_KEY");
            if ($key) {
                if (str_contains($key, ":")) {
                    [$u, $p] = explode(":", $key, 2);
                    $req = $req->withBasicAuth($u, $p);
                } elseif (str_starts_with($key, "Bearer ") || str_starts_with($key, "Basic ")) {
                    $req = $req->withHeaders(["Authorization" => $key]);
                } else {
                    $req = $req->withToken($key);
                }
            }

            $method = strtolower(env("REF_GATEWAY_METHOD", "POST"));
            $response = $method === "get"
                ? $req->get($url, $payload)
                : $req->asJson()->{$method}($url, $payload);

            $body = $response->json() ?? [];
            $referenciaCode = $body["referencia"] ?? $body["reference"] ?? $body["data"]["referencia"] ?? null;

            if (!$response->successful() || !$referenciaCode) {
                // fallback para referência interna mesmo com gateway, mas regista a tentativa
                $ref = $this->gerarInterna($factura, $entidade, $valor, $validade);
                $ref->update([
                    "gateway_request"  => $payload,
                    "gateway_response" => array_merge((array) $body, [
                        "_status" => $response->status(),
                        "_erro"   => "Resposta sem referência válida; usada referência interna.",
                    ]),
                ]);
                return $ref;
            }

            return ReferenciaPagamento::create([
                "factura_id"       => $factura->id,
                "entidade"         => $body["entidade"] ?? $entidade,
                "referencia"       => (string) $referenciaCode,
                "valor"            => $valor,
                "estado"           => "pendente",
                "expira_em"        => $validade,
                "gateway_request"  => $payload,
                "gateway_response" => $body,
            ]);
        } catch (\Throwable $e) {
            $ref = $this->gerarInterna($factura, $entidade, $valor, $validade);
            $ref->update([
                "gateway_request"  => $payload,
                "gateway_response" => ["_erro" => $e->getMessage()],
            ]);
            return $ref;
        }
    }

    private function gerarInterna(FacturaCentral $factura, string $entidade, float $valor, Carbon $validade): ReferenciaPagamento {
        // Referência: 9 dígitos derivados do id da factura + checksum simples
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

    private function montarPayload(FacturaCentral $factura, string $entidade, float $valor, Carbon $validade): array {
        $template = env("REF_GATEWAY_PAYLOAD_TEMPLATE",
            '{"entidade":"{entidade}","valor":{valor},"validade":"{validade}","descricao":"{descricao}","factura_id":{factura_id}}');
        $vars = [
            "{entidade}"    => $entidade,
            "{valor}"       => number_format($valor, 2, ".", ""),
            "{validade}"    => $validade->toIso8601String(),
            "{factura_id}"  => $factura->id,
            "{descricao}"   => addcslashes("Educajá " . $factura->numero, "\"\\"),
        ];
        $rendered = strtr($template, $vars);
        $decoded  = json_decode($rendered, true);
        return is_array($decoded) ? $decoded : ["entidade" => $entidade, "valor" => $valor];
    }
}
