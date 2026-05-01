<?php
namespace App\Services\Tenant;

use App\Models\Tenant\Pagamento;

/**
 * Assina facturas (pagamentos) com a chave RSA única da plataforma Educajá.
 *
 * A chave é guardada no filesystem em storage/keys/educaja_private.pem (permissões 600).
 * É gerada uma vez via comando artisan: php artisan educaja:gerar-chave-fiscal
 *
 * Formato assinado (AGT):
 *   {dataDoc};{dataSistema};{referencia};{totalFactura};{hashAnterior}
 *
 * Hash visível = chars das posições 1, 11, 21, 31 da assinatura Base64.
 */
class FacturaSigner {
    private const KEY_DIR  = "keys";
    private const PRIV_KEY = "educaja_private.pem";
    private const PUB_KEY  = "educaja_public.pem";

    public static function privateKeyPath(): string {
        return storage_path(self::KEY_DIR . DIRECTORY_SEPARATOR . self::PRIV_KEY);
    }
    public static function publicKeyPath(): string {
        return storage_path(self::KEY_DIR . DIRECTORY_SEPARATOR . self::PUB_KEY);
    }

    /** Gera o par de chaves global da Educajá. Idempotente; pisa se já existir. */
    public static function generateKeyPair(): void {
        $dir = dirname(self::privateKeyPath());
        if (!is_dir($dir)) mkdir($dir, 0750, true);

        $config = ["private_key_bits" => 1024, "private_key_type" => OPENSSL_KEYTYPE_RSA];
        $res    = openssl_pkey_new($config);
        if (!$res) throw new \RuntimeException("Falha ao gerar chave RSA: " . openssl_error_string());

        openssl_pkey_export($res, $privateKey);
        $details = openssl_pkey_get_details($res);

        file_put_contents(self::privateKeyPath(), $privateKey);
        chmod(self::privateKeyPath(), 0600);
        file_put_contents(self::publicKeyPath(), $details["key"]);
        chmod(self::publicKeyPath(), 0644);
    }

    public static function keyExists(): bool {
        return file_exists(self::privateKeyPath());
    }

    /** Garante que existe par de chaves; gera se não existir. */
    public static function ensureKey(): void {
        if (!self::keyExists()) self::generateKeyPair();
    }

    public function signPagamento(Pagamento $pagamento): void {
        self::ensureKey();
        $privateKeyPem = file_get_contents(self::privateKeyPath());
        $privateKey    = openssl_pkey_get_private($privateKeyPem);
        if (!$privateKey) throw new \RuntimeException("Chave privada inválida.");

        // Hash da factura anterior do mesmo tenant (cadeia)
        $hashAnterior = Pagamento::whereNotNull("assinatura")
            ->orderByDesc("id")
            ->where("id", "<", $pagamento->id)
            ->value("assinatura") ?? "";

        $dataDoc     = optional($pagamento->data_pagamento)->format("Y-m-d") ?? now()->format("Y-m-d");
        $dataSistema = ($pagamento->updated_at ?? now())->format("Y-m-d\TH:i:s");
        $referencia  = $pagamento->referencia ?? (string) $pagamento->id;
        $total       = number_format((float) $pagamento->valor + (float) ($pagamento->multa_valor ?? 0), 2, ".", "");

        $payload = "{$dataDoc};{$dataSistema};{$referencia};{$total};{$hashAnterior}";
        if (!openssl_sign($payload, $assinatura, $privateKey, OPENSSL_ALGO_SHA1)) {
            throw new \RuntimeException("Falha ao assinar: " . openssl_error_string());
        }
        $assinaturaB64 = base64_encode($assinatura);

        // Hash visível: posições 1, 11, 21, 31 da Base64 (formato AGT)
        $hashVisivel = substr($assinaturaB64, 0, 1)
                     . substr($assinaturaB64, 10, 1)
                     . substr($assinaturaB64, 20, 1)
                     . substr($assinaturaB64, 30, 1);

        $pagamento->update([
            "hash_factura"  => $hashVisivel,
            "assinatura"    => $assinaturaB64,
            "hash_anterior" => $hashAnterior,
            "assinada_em"   => now(),
        ]);
    }
}
