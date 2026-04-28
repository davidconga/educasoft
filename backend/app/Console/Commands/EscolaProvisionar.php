<?php
namespace App\Console\Commands;

use App\Models\Central\Escola;
use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class EscolaProvisionar extends Command
{
    protected $signature = "escola:provisionar {codigo} {--nome=} {--email=} {--admin-nome=} {--admin-email=} {--admin-password=}";
    protected $description = "Cria escola com BD própria e utilizador admin";

    public function handle(): void
    {
        $codigo = $this->argument("codigo");
        $safeCode = preg_replace("/[^a-z0-9]/", "", strtolower($codigo));
        $dbName = "educa" . substr($safeCode, 0, 10);
        $dbUser = "educa" . substr($safeCode, 0, 7);
        $dbPass = Str::password(16, true, true, false);

        $this->info("A criar escola [{$codigo}]...");
        $this->info("BD: {$dbName} | User: {$dbUser}");

        // 1. Criar BD via clpctl
        exec("clpctl db:add --domainName=educa.okulandisa.com --databaseName={$dbName} --databaseUserName={$dbUser} --databaseUserPassword=" . escapeshellarg($dbPass) . " 2>&1", $out, $code);
        $result = implode(" ", $out);
        if ($code !== 0 && !str_contains($result, "already")) {
            $this->error("Erro ao criar BD: {$result}");
            return;
        }
        $this->info("BD criada: " . $result);

        // 2. Criar/actualizar tenant na BD central
        $escola = Escola::updateOrCreate(
            ["codigo" => $codigo],
            [
                "id" => Str::ulid(),
                "nome" => $this->option("nome") ?? ucfirst($codigo),
                "email" => $this->option("email") ?? "{$codigo}@edusoft.ao",
                "plano" => "basico",
                "ativo" => true,
                "data" => ["db_name"=>$dbName,"db_user"=>$dbUser,"db_password"=>$dbPass],
            ]
        );

        $this->info("Tenant ID: {$escola->id}");

        // 3. Migrations na BD do tenant
        $this->info("A executar migrations...");
        config(["database.connections.escola_temp" => array_merge(config("database.connections.mysql"),["database"=>$dbName,"username"=>$dbUser,"password"=>$dbPass])]);
        DB::purge("escola_temp");
        \Artisan::call("migrate",["--database"=>"escola_temp","--path"=>"database/migrations/tenant","--force"=>true],$this->output);

        // 4. Criar admin
        $adminEmail = $this->option("admin-email") ?? "admin@{$codigo}.ao";
        $adminPass = $this->option("admin-password") ?? "EduSoft@2024!";
        DB::connection("escola_temp")->table("users")->insertOrIgnore(["nome"=>$this->option("admin-nome")??"Administrador","email"=>$adminEmail,"password"=>bcrypt($adminPass),"tipo"=>"admin","ativo"=>true,"created_at"=>now(),"updated_at"=>now()]);
        DB::purge("escola_temp");

        $this->info("");
        $this->info("✅ ESCOLA PROVISIONADA!");
        $this->info("   URL:    https://educa.okulandisa.com/login");
        $this->info("   Código: {$codigo}");
        $this->info("   Admin:  {$adminEmail}");
        $this->info("   Pass:   {$adminPass}");
    }
}
