<?php
namespace App\Jobs;

use App\Models\Central\Escola;
use Illuminate\Support\Facades\DB;

/**
 * Inicializa a conexão tenant a partir do código da escola e executa
 * o callback. Quando o callback termina (com ou sem excepção), repõe
 * a conexão por defeito para `mysql` (central).
 *
 * Garante que jobs em fila — que não passam pelo middleware InitializeTenant —
 * conseguem ler/escrever na base do tenant correcto.
 */
class TenantBootstrapper {
    public static function run(string $codigo, callable $cb): mixed {
        $escola = Escola::where("codigo", $codigo)->where("ativo", true)->firstOrFail();
        $dbConfig = $escola->getDatabaseConfig();
        config(["database.connections.tenant" => $dbConfig]);
        DB::purge("tenant");
        DB::setDefaultConnection("tenant");
        app()->instance("escola", $escola);

        try {
            return $cb();
        } finally {
            DB::setDefaultConnection("mysql");
            app()->forgetInstance("escola");
        }
    }
}
