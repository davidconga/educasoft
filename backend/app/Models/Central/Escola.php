<?php
namespace App\Models\Central;

use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Escola extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    protected $table = "tenants";

    public static function getCustomColumns(): array
    {
        return [
            "id","nome","email","telefone","endereco","logo","ativo","plano","codigo","nif",
            "email_facturacao","responsavel_facturacao","dia_vencimento","valor_mensal","desconto_pct","notas_facturacao",
            "termos_versao_aceita","termos_aceitos_em","termos_aceitos_ip",
            "vendus_ativo","vendus_api_key","vendus_register_id","vendus_serie","vendus_modo",
            "formato_impressao",
            "permite_pago_historico",
        ];
    }

    protected $casts = [
        "ativo" => "boolean",
        "valor_mensal" => "decimal:2",
        "desconto_pct" => "decimal:2",
        "dia_vencimento" => "integer",
        "vendus_ativo" => "boolean",
        "vendus_api_key" => "encrypted",
        "permite_pago_historico" => "boolean",
    ];

    public function facturas() {
        return $this->hasMany(FacturaCentral::class, "escola_id");
    }

    public function assinaturas() {
        return $this->hasMany(Assinatura::class, "escola_id");
    }

    public function assinaturaAtiva() {
        return $this->hasOne(Assinatura::class, "escola_id")
            ->whereIn("estado", ["ativa", "trial"])
            ->latestOfMany();
    }

    public function getDatabaseConfig(): array
    {
        $codigo = preg_replace("/[^a-z0-9]/", "", strtolower($this->codigo ?? ""));
        $dbName = $this->getInternal('db_name') ?? ("escola_" . substr($codigo, 0, 20));
        return array_merge(config("database.connections.mysql"), [
            "database" => $dbName,
            "username" => env("DB_USERNAME", "educasoft"),
            "password" => env("DB_PASSWORD", ""),
        ]);
    }
}
