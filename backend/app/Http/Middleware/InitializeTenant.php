<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Central\Escola;

class InitializeTenant
{
    public function handle(Request $request, Closure $next)
    {
        $tenantKey = $request->query("tenant") ?? $request->header("X-Tenant");

        if (!$tenantKey) {
            return response()->json(["message"=>"Código da escola não fornecido."], 400);
        }

        $escola = Escola::where("codigo", $tenantKey)->where("ativo", true)->first();

        if (!$escola) {
            return response()->json(["message"=>"Escola não encontrada ou inactiva."], 404);
        }

        $dbConfig = $escola->getDatabaseConfig();
        config(["database.connections.tenant" => $dbConfig]);
        DB::purge("tenant");
        DB::setDefaultConnection("tenant");

        $request->attributes->set("escola", $escola);
        app()->instance("escola", $escola);

        $response = $next($request);

        DB::setDefaultConnection("mysql");

        return $response;
    }
}
