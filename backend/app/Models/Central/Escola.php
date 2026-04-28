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
        return ["id","nome","email","telefone","endereco","logo","ativo","plano","codigo"];
    }

    protected $casts = ["ativo" => "boolean"];

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
