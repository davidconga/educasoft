<?php
namespace App\Services\Central;

use App\Models\Central\FacturaCentral;

/**
 * Assina facturas centrais com o par RSA da Educajá. Mesmo padrão do FacturaSigner
 * dos tenants, mas com chave dedicada (educaja_central_private.pem).
 *
 * Payload AGT:
 *   {dataDoc};{dataSistema};{numero};{total};{hashAnterior}
 *
 * Hash visível = chars das posições 1, 11, 21, 31 da assinatura Base64.
 */
class FacturaCentralSigner {
    private const PRIV_KEY = "educaja_central_private.pem";
    private const PUB_KEY  = "educaja_central_public.pem";

    public static function privPath(): string {
        return storage_path("keys/" . self::PRIV_KEY);
    }
    public static function pubPath(): string {
        return storage_path("keys/" . self::PUB_KEY);
    }

    public static function ensureKey(): void {
        if (file_exists(self::privPath()) && is_readable(self::privPath())) return;

        $dir = dirname(self::privPath());
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException("Sem permissão para criar storage/keys. Execute: chown -R " . get_current_user() . ":" . get_current_user() . " " . dirname($dir));
        }

        if (!is_writable($dir)) {
            throw new \RuntimeException("storage/keys não tem permissão de escrita para o utilizador PHP-FPM. Corrija com: chown -R " . get_current_user() . ":" . get_current_user() . " " . $dir);
        }

        $res = openssl_pkey_new(["private_key_bits" => 2048, "private_key_type" => OPENSSL_KEYTYPE_RSA]);
        if (!$res) throw new \RuntimeException("Falha ao gerar chave: " . openssl_error_string());

        openssl_pkey_export($res, $priv);
        $details = openssl_pkey_get_details($res);

        if (@file_put_contents(self::privPath(), $priv) === false) {
            throw new \RuntimeException("Não foi possível escrever a chave privada em " . self::privPath());
        }
        @chmod(self::privPath(), 0600);
        @file_put_contents(self::pubPath(), $details["key"]);
        @chmod(self::pubPath(), 0644);
    }

    public function assinar(FacturaCentral $f): void {
        self::ensureKey();
        $priv = openssl_pkey_get_private(file_get_contents(self::privPath()));
        if (!$priv) throw new \RuntimeException("Chave privada inválida.");

        $hashAnterior = FacturaCentral::whereNotNull("assinatura")
            ->where("id", "<", $f->id)
            ->orderByDesc("id")
            ->value("hash") ?? "";

        $dataDoc     = ($f->data_emissao ?? now())->format("Y-m-d");
        $dataSistema = ($f->updated_at ?? now())->format("Y-m-d\TH:i:s");
        $total       = number_format((float) $f->total, 2, ".", "");
        $payload     = "{$dataDoc};{$dataSistema};{$f->numero};{$total};{$hashAnterior}";

        if (!openssl_sign($payload, $assinatura, $priv, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException("Falha ao assinar: " . openssl_error_string());
        }
        $b64 = base64_encode($assinatura);
        $hashVisivel = substr($b64, 0, 1) . substr($b64, 10, 1) . substr($b64, 20, 1) . substr($b64, 30, 1);

        $f->update([
            "hash"          => $hashVisivel,
            "assinatura"    => $b64,
            "hash_anterior" => $hashAnterior,
            "assinada_em"   => now(),
        ]);
    }
}
