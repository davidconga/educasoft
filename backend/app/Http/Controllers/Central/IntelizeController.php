<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\IntelizeConfig;
use App\Services\Central\IntelizeGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class IntelizeController extends Controller {

    public function show() {
        $cfg = IntelizeConfig::current();
        return response()->json($this->payload($cfg));
    }

    public function update(Request $request) {
        $data = $request->validate([
            "base_url"        => ["required", "url", "max:255"],
            "username"        => ["nullable", "string", "max:255"],
            "password"        => ["nullable", "string", "max:255"],
            "entidade"        => ["nullable", "string", "max:20"],
            "criador"         => ["nullable", "string", "max:100"],
            "auth_path"       => ["required", "string", "max:100"],
            "references_path" => ["required", "string", "max:100"],
            "validade_dias"   => ["required", "integer", "min:1", "max:365"],
            "token_ttl_min"   => ["required", "integer", "min:1", "max:1440"],
            "activo"          => ["required", "boolean"],
            "webhook_secret"  => ["nullable", "string", "max:255"],
        ]);

        $cfg = IntelizeConfig::current();

        // Não sobrepor password/webhook_secret se vierem vazios — preserva o valor existente
        if (($data["password"] ?? null) === null || $data["password"] === "") unset($data["password"]);
        if (($data["webhook_secret"] ?? null) === null || $data["webhook_secret"] === "") unset($data["webhook_secret"]);

        $cfg->update($data);
        Cache::forget("intelize:token");

        return response()->json($this->payload($cfg->fresh()));
    }

    public function testar(IntelizeGateway $gateway) {
        Cache::forget("intelize:token");
        $r = $gateway->testar();
        return response()->json($r, $r["ok"] ? 200 : 422);
    }

    private function payload(IntelizeConfig $cfg): array {
        $username = (string) ($cfg->username ?? "");
        $password = (string) ($cfg->password ?? "");
        $criador  = (string) ($cfg->criador ?? "");
        $secret   = (string) ($cfg->webhook_secret ?? "");

        return [
            "id"                 => $cfg->id,
            "activo"             => (bool) $cfg->activo,
            "base_url"           => $cfg->base_url,
            "auth_path"          => $cfg->auth_path,
            "references_path"    => $cfg->references_path,
            "username"           => $username,
            "username_set"       => $username !== "",
            "password_set"       => $password !== "",
            "entidade"           => $cfg->entidade,
            "criador"            => $criador,
            "criador_set"        => $criador !== "",
            "validade_dias"      => (int) $cfg->validade_dias,
            "token_ttl_min"      => (int) $cfg->token_ttl_min,
            "webhook_secret_set" => $secret !== "",
            "ambiente"           => str_contains((string) $cfg->base_url, "demo.") ? "demo" : "live",
        ];
    }
}
