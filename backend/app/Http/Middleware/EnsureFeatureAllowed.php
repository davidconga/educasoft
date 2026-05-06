<?php
namespace App\Http\Middleware;

use App\Services\Central\PlanoTenantResolver;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware tenant: bloqueia rotas que dependem de uma feature do plano.
 * Uso: Route::middleware("feature:aulas_remotas")->...
 *
 * A escola é obtida do attribute "escola" (definido em InitializeTenant).
 */
class EnsureFeatureAllowed {
    public function handle(Request $request, Closure $next, string $feature): Response {
        $escola = $request->attributes->get("escola");
        if (!$escola) {
            return response()->json(["message" => "Tenant não inicializado."], 403);
        }

        $plano = (new PlanoTenantResolver())->paraEscola($escola);
        if (!$plano) {
            return response()->json([
                "message"  => "Plano não encontrado.",
                "code"     => "plan_missing",
            ], 403);
        }

        if (!in_array($feature, $plano["feature_keys"] ?? [], true)) {
            return response()->json([
                "message"      => "Esta funcionalidade não está incluída no plano " . $plano["nome"] . ".",
                "code"         => "feature_locked",
                "feature"      => $feature,
                "plano_atual"  => $plano["codigo"],
                "upgrade_url"  => "/upgrade?feature=" . urlencode($feature),
            ], 403);
        }

        return $next($request);
    }
}
