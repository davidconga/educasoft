<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Services\Central\VendusGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ConfiguracaoController extends Controller {

    public function escola(Request $request) {
        $escola = $request->attributes->get("escola");
        return response()->json($escola->only(["id","nome","email","nif","telefone","endereco","logo","codigo","plano","formato_impressao"]));
    }

    public function impressao(Request $request) {
        $escola = $request->attributes->get("escola");
        return response()->json([
            "formato_impressao" => $escola->formato_impressao ?: "a4",
        ]);
    }

    public function updateImpressao(Request $request) {
        $escola = $request->attributes->get("escola");
        $data = $request->validate([
            "formato_impressao" => "required|in:a4,a5,ticket",
        ]);
        $escola->update($data);
        return response()->json([
            "formato_impressao" => $escola->fresh()->formato_impressao,
        ]);
    }

    public function updateEscola(Request $request) {
        $escola = $request->attributes->get("escola");
        $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "nullable|email|max:255",
            "nif"      => "nullable|string|max:30",
            "telefone" => "nullable|string|max:50",
            "endereco" => "nullable|string|max:500",
        ]);
        $escola->update($request->only(["nome","email","nif","telefone","endereco"]));
        return response()->json($escola->fresh()->only(["id","nome","email","nif","telefone","endereco","logo","codigo","plano"]));
    }

    public function uploadLogo(Request $request) {
        $escola = $request->attributes->get("escola");
        $request->validate(["logo" => "required|image|max:2048"]);
        if ($escola->logo) Storage::disk("public")->delete($escola->logo);
        $path = $request->file("logo")->store("logos", "public");
        $escola->update(["logo" => $path]);
        return response()->json(["logo" => $path, "message" => "Logo actualizado."]);
    }

    public function vendus(Request $request) {
        $escola = $request->attributes->get("escola");
        $key = (string) ($escola->vendus_api_key ?? "");
        return response()->json([
            "ativo"        => (bool) $escola->vendus_ativo,
            "api_key_set"  => $key !== "",
            "api_key_hint" => $key !== "" ? str_repeat("•", max(0, strlen($key) - 4)) . substr($key, -4) : "",
            "register_id"  => $escola->vendus_register_id,
            "serie"        => $escola->vendus_serie,
            "modo"         => $escola->vendus_modo ?: "live",
        ]);
    }

    public function updateVendus(Request $request) {
        $escola = $request->attributes->get("escola");
        $data = $request->validate([
            "ativo"       => "boolean",
            "api_key"     => "nullable|string|max:255",
            "register_id" => "nullable|string|max:100",
            "serie"       => "nullable|string|max:50",
            "modo"        => "nullable|in:live,test",
        ]);

        $update = [
            "vendus_ativo"       => (bool) ($data["ativo"] ?? false),
            "vendus_register_id" => $data["register_id"] ?? null,
            "vendus_serie"       => $data["serie"] ?? null,
            "vendus_modo"        => $data["modo"] ?? "live",
        ];
        if (array_key_exists("api_key", $data) && !empty($data["api_key"])) {
            $update["vendus_api_key"] = $data["api_key"];
        }
        $escola->update($update);

        return $this->vendus($request);
    }

    public function testarVendus(Request $request) {
        $escola = $request->attributes->get("escola");
        $gateway = VendusGateway::forEscola($escola);
        if (!$gateway->configurado()) {
            return response()->json(["ok" => false, "erro" => "API key não definida."], 422);
        }
        $r = $gateway->listarClientes(["per_page" => 1]);
        return response()->json([
            "ok"     => $r["ok"],
            "status" => $r["status"],
            "erro"   => $r["erro"],
        ], $r["ok"] ? 200 : 422);
    }
}
