<?php
namespace App\Services;

use App\Models\Central\Escola;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class EscolaProvisioningService
{
    public function provision(Escola $escola): void
    {
        $dbName = "escola_" . $escola->id;
        $dbUser = "educasoft";
        $dbPass = env("DB_PASSWORD");

        // Criar BD via clpctl (tem acesso root MySQL internamente)
        $domain = "educa.okulandisa.com";
        exec("clpctl db:add --domainName={$domain} --databaseName={$dbName} --databaseUserName={$dbUser} --databaseUserPassword=" . escapeshellarg($dbPass) . " 2>&1", $output, $code);

        if ($code !== 0) {
            // Tentar adicionar permissões ao user existente
            // Se a BD já existe, apenas continua
            \Log::warning("clpctl db:add falhou para {$dbName}: " . implode("\n", $output));
        }

        // Atualizar .env do tenant BD e executar migrations
        config(["database.connections.tenant_temp" => [
            "driver" => "mysql",
            "host" => env("DB_HOST"),
            "port" => env("DB_PORT"),
            "database" => $dbName,
            "username" => $dbUser,
            "password" => $dbPass,
            "charset" => "utf8mb4",
            "collation" => "utf8mb4_unicode_ci",
        ]]);

        DB::purge("tenant_temp");
        DB::connection("tenant_temp")->reconnect();
    }

    public function runMigrations(Escola $escola): void
    {
        tenancy()->initialize($escola);
        Artisan::call("tenants:migrate", ["--tenants" => [$escola->id], "--force" => true]);
        tenancy()->end();
    }

    public function createAdminUser(Escola $escola, array $userData): void
    {
        tenancy()->initialize($escola);
        \App\Models\Tenant\User::create([
            "nome" => $userData["nome"],
            "email" => $userData["email"],
            "password" => bcrypt($userData["password"]),
            "tipo" => "admin",
            "ativo" => true,
        ]);
        tenancy()->end();
    }
}
