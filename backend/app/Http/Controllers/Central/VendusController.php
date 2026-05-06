<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Services\Central\VendusGateway;

class VendusController extends Controller {

    public function show() {
        $key = (string) (config("services.vendus.api_key") ?? "");
        return response()->json([
            "base_url"     => config("services.vendus.base_url"),
            "api_key_set"  => $key !== "",
            "api_key_hint" => $key !== "" ? str_repeat("•", max(0, strlen($key) - 4)) . substr($key, -4) : "",
            "register_id"  => config("services.vendus.register_id"),
            "serie"        => config("services.vendus.serie"),
            "modo"         => config("services.vendus.modo", "live"),
            "verify_ssl"   => (bool) config("services.vendus.verify_ssl", true),
            "timeout"      => (int) config("services.vendus.timeout", 20),
        ]);
    }

    public function testar() {
        $gateway = VendusGateway::fromEnv();
        if (!$gateway->configurado()) {
            return response()->json(["ok" => false, "erro" => "VENDUS_API_KEY não definida no .env"], 422);
        }
        $r = $gateway->listarClientes(["per_page" => 1]);
        return response()->json([
            "ok"     => $r["ok"],
            "status" => $r["status"],
            "erro"   => $r["erro"],
        ], $r["ok"] ? 200 : 422);
    }
}
