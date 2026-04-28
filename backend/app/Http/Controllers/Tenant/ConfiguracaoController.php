<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ConfiguracaoController extends Controller {

    public function escola(Request $request) {
        $escola = $request->attributes->get("escola");
        return response()->json($escola->only(["id","nome","email","telefone","endereco","logo","codigo","plano"]));
    }

    public function updateEscola(Request $request) {
        $escola = $request->attributes->get("escola");
        $request->validate([
            "nome"     => "required|string|max:255",
            "email"    => "nullable|email|max:255",
            "telefone" => "nullable|string|max:50",
            "endereco" => "nullable|string|max:500",
        ]);
        $escola->update($request->only(["nome","email","telefone","endereco"]));
        return response()->json($escola->fresh()->only(["id","nome","email","telefone","endereco","logo","codigo","plano"]));
    }

    public function uploadLogo(Request $request) {
        $escola = $request->attributes->get("escola");
        $request->validate(["logo" => "required|image|max:2048"]);
        if ($escola->logo) Storage::disk("public")->delete($escola->logo);
        $path = $request->file("logo")->store("logos", "public");
        $escola->update(["logo" => $path]);
        return response()->json(["logo" => $path, "message" => "Logo actualizado."]);
    }
}
