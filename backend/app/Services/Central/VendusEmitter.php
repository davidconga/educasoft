<?php
namespace App\Services\Central;

use App\Models\Central\Escola;
use App\Models\Central\FacturaCentral;
use App\Models\Tenant\Pagamento;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Emissão de documentos fiscais via Vendus AO.
 *
 * Tipo de documento usado: FR (Factura/Recibo).
 *
 * Modos:
 *   - emitirFacturaCentral() → conta global do operador (assinaturas a escolas).
 *   - emitirPagamento()      → conta da escola (recibo de propina/emolumento).
 *
 * Em ambos: persiste vendus_document_id, vendus_numero, vendus_hash,
 * vendus_serie, vendus_pdf_url, vendus_emitido_em ou vendus_erro.
 */
class VendusEmitter {
    /**
     * Emite uma FacturaCentral via conta global Vendus do operador.
     * @return array{ok:bool, factura:FacturaCentral, erro:?string}
     */
    public function emitirFacturaCentral(FacturaCentral $factura): array {
        if ($factura->vendus_document_id) {
            return ["ok" => true, "factura" => $factura, "erro" => null]; // já emitida
        }

        $gateway = VendusGateway::fromEnv();
        if (!$gateway->configurado()) {
            return ["ok" => false, "factura" => $factura, "erro" => "Vendus global não configurado (.env VENDUS_API_KEY)"];
        }

        $payload = $this->payloadFacturaCentral($factura, $gateway);
        $r = $gateway->emitirDocumento($payload);
        $this->persistirResultado($factura, $r);
        return ["ok" => $r["ok"], "factura" => $factura->refresh(), "erro" => $r["erro"]];
    }

    /**
     * Emite uma Nota de Crédito (NC) Vendus a creditar uma factura/recibo
     * já emitido para um Pagamento. Persiste em campos vendus_nc_*.
     *
     * @return array{ok:bool, pagamento:Pagamento, erro:?string}
     */
    public function emitirNotaCredito(Pagamento $pagamento, Escola $escola, string $motivo): array {
        if (!$pagamento->vendus_document_id) {
            return ["ok" => false, "pagamento" => $pagamento, "erro" => "Pagamento não tem factura Vendus emitida."];
        }
        if ($pagamento->vendus_nc_document_id) {
            return ["ok" => true, "pagamento" => $pagamento, "erro" => null];
        }
        $gateway = VendusGateway::forEscola($escola);
        if (!$gateway->configurado()) {
            return ["ok" => false, "pagamento" => $pagamento, "erro" => "API key Vendus não definida para a escola"];
        }

        // Buscar items do FR original para clonar no NC (preserva descrição, IVA, valores).
        $orig = $gateway->buscarDocumento($pagamento->vendus_document_id);
        if (!$orig["ok"]) {
            $pagamento->update(["vendus_nc_erro" => substr("Falha a obter FR original: " . $orig["erro"], 0, 1000)]);
            return ["ok" => false, "pagamento" => $pagamento->refresh(), "erro" => $orig["erro"]];
        }
        $body = $orig["body"];

        // Vendus AO exige items com id da linha original + reference_document
        // (document_number + document_row, 1-indexed) para gerar a NC.
        $items = [];
        $row = 1;
        foreach (($body["items"] ?? []) as $it) {
            $entry = array_filter([
                "id"          => $it["id"] ?? null,
                "title"       => $it["title"] ?? "Crédito",
                "qty"         => (float) ($it["qty"] ?? 1),
                "gross_price" => (float) ($it["amounts"]["gross_unit"] ?? $it["gross_price"] ?? 0),
                "reference_document" => [
                    "document_number" => $body["number"] ?? $pagamento->vendus_numero,
                    "document_row"    => $row,
                ],
            ], fn($v) => $v !== null && $v !== "");
            $items[] = $entry;
            $row++;
        }
        if (!$items) {
            return ["ok" => false, "pagamento" => $pagamento, "erro" => "FR original sem items para creditar."];
        }

        // Preferir reutilizar o cliente existente do FR pelo id (evita
        // "Unable to create client - NIF português inválido" quando o
        // fiscal_id original não é um NIF numérico).
        $clientPayload = !empty($body["client"]["id"])
            ? ["id" => (int) $body["client"]["id"]]
            : array_filter([
                "name"               => $body["client"]["name"] ?? "Aluno",
                "country"            => $body["client"]["country"] ?? "AO",
                "external_reference" => $body["client"]["external_reference"] ?? ("ALUNO-" . $pagamento->aluno_id),
                "fiscal_id"          => preg_match('/^\d{5,}$/', (string)($body["client"]["fiscal_id"] ?? "")) ? $body["client"]["fiscal_id"] : null,
                "email"              => $body["client"]["email"] ?? null,
            ]);

        $payload = [
            "type"  => "NC",
            "date"  => date("Y-m-d"),
            "client" => $clientPayload,
            "items" => $items,
            "notes" => trim(sprintf(
                "Nota de Crédito do %s. Motivo: %s",
                $body["number"] ?? $pagamento->vendus_numero,
                $motivo
            )),
        ];
        if ($gateway->registerId()) $payload["register_id"] = $gateway->registerId();

        $r = $gateway->emitirDocumento($payload);
        $this->persistirResultadoNc($pagamento, $r, $motivo);
        return ["ok" => $r["ok"], "pagamento" => $pagamento->refresh(), "erro" => $r["erro"]];
    }

    /**
     * Emite um Pagamento (tenant) via conta Vendus da escola.
     * @return array{ok:bool, pagamento:Pagamento, erro:?string}
     */
    public function emitirPagamento(Pagamento $pagamento, Escola $escola): array {
        if ($pagamento->vendus_document_id) {
            return ["ok" => true, "pagamento" => $pagamento, "erro" => null];
        }
        if (!$escola->vendus_ativo) {
            return ["ok" => false, "pagamento" => $pagamento, "erro" => "Vendus não activo para esta escola"];
        }

        $gateway = VendusGateway::forEscola($escola);
        if (!$gateway->configurado()) {
            return ["ok" => false, "pagamento" => $pagamento, "erro" => "API key Vendus não definida para a escola"];
        }

        $payload = $this->payloadPagamento($pagamento, $escola, $gateway);
        $r = $gateway->emitirDocumento($payload);
        $this->persistirResultado($pagamento, $r);
        return ["ok" => $r["ok"], "pagamento" => $pagamento->refresh(), "erro" => $r["erro"]];
    }

    private function payloadFacturaCentral(FacturaCentral $factura, VendusGateway $gateway): array {
        // FT (Factura) — emitida no momento da geração, antes do pagamento.
        // Quando paga, podemos opcionalmente emitir um recibo separado.
        $payload = [
            "type"  => "FT",
            // data fiscal de emissão = hoje (Vendus impõe ordem cronológica).
            "date"  => date("Y-m-d"),
            "client" => array_filter([
                "name"               => $factura->cliente_nome,
                "fiscal_id"          => $factura->cliente_nif,
                "email"              => $factura->cliente_email,
                "address"            => $factura->cliente_morada,
                "country"            => "AO",
                "external_reference" => "ESCOLA-" . $factura->escola_id,
            ]),
            "items" => [[
                "title"       => "Educajá — Subscrição " . ($factura->plano ?: ""),
                "qty"         => 1,
                "gross_price" => (float) $factura->total,
            ]],
            "notes" => sprintf(
                "Período %s a %s. Factura interna: %s",
                optional($factura->periodo_inicio)->format("d/m/Y"),
                optional($factura->periodo_fim)->format("d/m/Y"),
                $factura->numero
            ),
        ];
        if ($gateway->registerId()) $payload["register_id"] = $gateway->registerId();
        // Nota: a série Vendus é determinada pelo register_id (não aceita campo "serie" no payload).
        return $payload;
    }

    private function payloadPagamento(Pagamento $pagamento, Escola $escola, VendusGateway $gateway): array {
        $aluno = $pagamento->relationLoaded("aluno") ? $pagamento->aluno : $pagamento->aluno()->with("user")->first();
        $nomeAluno = $aluno?->user?->name ?? $aluno?->nome ?? "Aluno";

        $titulo = $this->descricaoPagamento($pagamento);
        $totalDevido = (float) $pagamento->valor + (float) ($pagamento->multa_valor ?? 0) - (float) ($pagamento->bolsa_valor ?? 0);

        // Vendus exige data >= último documento emitido. Usar sempre today() é seguro;
        // a data real do pagamento fica registada em "notes".
        $dataPag = optional($pagamento->data_pagamento)->format("d/m/Y");

        $payload = [
            "type"  => "FR",
            "date"  => date("Y-m-d"),
            "client" => array_filter([
                "name"               => $nomeAluno,
                "country"            => "AO",
                "external_reference" => "ALUNO-" . ($pagamento->aluno_id ?? $pagamento->id),
                "email"              => $aluno?->user?->email ?: null,
            ]),
            "items" => [[
                "title"       => $titulo,
                "qty"         => 1,
                "gross_price" => round(max(0, $totalDevido), 2),
            ]],
            "payments" => [[
                "id"     => $this->resolverPaymentMethodId($gateway, "vendus.payment_method.escola." . $escola->id),
                "amount" => round(max(0, $totalDevido), 2),
            ]],
            "notes" => trim(sprintf(
                "%s — Recibo: %s%s%s",
                $escola->nome ?? "",
                $pagamento->referencia ?? ("PAG-" . $pagamento->id),
                $pagamento->mes_referencia ? " | " . $pagamento->mes_referencia : "",
                $dataPag ? " | Pago em " . $dataPag : ""
            ), " —|"),
        ];
        if ($gateway->registerId()) $payload["register_id"] = $gateway->registerId();
        // Nota: a série Vendus é determinada pelo register_id (não aceita campo "serie" no payload).
        return $payload;
    }

    /**
     * Resolve o ID numérico de método de pagamento para a conta Vendus em uso.
     * Cada conta Vendus AO tem IDs próprios; lê-se um documento existente para
     * descobrir um ID válido, com cache de 24h.
     */
    private function resolverPaymentMethodId(VendusGateway $gateway, string $cacheKey) {
        // Usa explicitamente o store file/array para evitar wrappers tag-aware
        // injectados pelo stancl/tenancy quando em contexto de tenant.
        $store = Cache::store("file");
        $cached = $store->get($cacheKey);
        if ($cached) return $cached;

        $lista = $gateway->listarDocumentos(["per_page" => 1]);
        $primeiroDocId = $lista["body"][0]["id"] ?? null;
        if ($primeiroDocId) {
            $detail = $gateway->buscarDocumento($primeiroDocId);
            $methodId = $detail["body"]["payments"][0]["id"] ?? null;
            if ($methodId) {
                $store->put($cacheKey, $methodId, now()->addDay());
                return $methodId;
            }
        }
        return 0;
    }

    private function descricaoPagamento(Pagamento $p): string {
        return match ($p->tipo) {
            "mensalidade" => "Propina" . ($p->mes_referencia ? " " . $p->mes_referencia : ""),
            "matricula"   => "Matrícula",
            "emolumento"  => "Emolumento" . ($p->emolumento?->nome ? " — " . $p->emolumento->nome : ""),
            "multa"       => "Multa",
            default       => $p->tipo ? ucfirst($p->tipo) : "Recibo",
        };
    }

    /**
     * @param FacturaCentral|Pagamento $modelo
     * @param array{ok:bool, status:int, body:mixed, erro:?string} $r
     */
    private function persistirResultado($modelo, array $r): void {
        if (!$r["ok"]) {
            $modelo->update(["vendus_erro" => substr((string) $r["erro"], 0, 1000)]);
            Log::warning("Vendus emissão falhou", [
                "modelo" => get_class($modelo),
                "id"     => $modelo->id,
                "erro"   => $r["erro"],
            ]);
            return;
        }

        $body = is_array($r["body"]) ? $r["body"] : [];
        $modelo->update([
            "vendus_document_id" => (string) ($body["id"] ?? $body["document_id"] ?? ""),
            "vendus_numero"      => (string) ($body["number"] ?? $body["document_number"] ?? ""),
            "vendus_hash"        => (string) ($body["hash"] ?? ""),
            "vendus_serie"       => (string) ($body["series"] ?? $body["serie"] ?? ""),
            "vendus_pdf_url"     => (string) ($body["public_url"] ?? $body["pdf_url"] ?? $body["url"] ?? ""),
            "vendus_emitido_em"  => now(),
            "vendus_erro"        => null,
        ]);
    }

    /**
     * @param Pagamento $pagamento
     * @param array{ok:bool, status:int, body:mixed, erro:?string} $r
     */
    private function persistirResultadoNc(Pagamento $pagamento, array $r, string $motivo): void {
        if (!$r["ok"]) {
            $pagamento->update([
                "vendus_nc_motivo" => $motivo,
                "vendus_nc_erro"   => substr((string) $r["erro"], 0, 1000),
            ]);
            Log::warning("Vendus NC falhou", [
                "pagamento" => $pagamento->id,
                "fr_id"     => $pagamento->vendus_document_id,
                "erro"      => $r["erro"],
            ]);
            return;
        }
        $body = is_array($r["body"]) ? $r["body"] : [];
        $pagamento->update([
            "vendus_nc_document_id" => (string) ($body["id"] ?? $body["document_id"] ?? ""),
            "vendus_nc_numero"      => (string) ($body["number"] ?? $body["document_number"] ?? ""),
            "vendus_nc_hash"        => (string) ($body["hash"] ?? ""),
            "vendus_nc_pdf_url"     => (string) ($body["public_url"] ?? $body["pdf_url"] ?? $body["url"] ?? ""),
            "vendus_nc_emitido_em"  => now(),
            "vendus_nc_motivo"      => $motivo,
            "vendus_nc_erro"        => null,
        ]);
    }
}
