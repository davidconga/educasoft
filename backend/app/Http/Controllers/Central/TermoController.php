<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Termo;
use Illuminate\Http\Request;

class TermoController extends Controller {
    /** Endpoint público — devolve os termos em vigor. */
    public function atual() {
        $t = Termo::atual();
        if (!$t) {
            return response()->json(["message" => "Sem termos publicados."], 404);
        }
        return response()->json([
            "id"          => $t->id,
            "versao"      => $t->versao,
            "titulo"      => $t->titulo,
            "conteudo"    => $t->conteudo,
            "publicado_em"=> $t->publicado_em?->toIso8601String(),
        ]);
    }

    /* ====== super-admin ====== */

    public function index() {
        return response()->json(Termo::orderByDesc("id")->get());
    }

    public function show(Termo $termo) {
        return response()->json($termo);
    }

    public function store(Request $request) {
        $data = $request->validate([
            "versao"   => "required|string|max:20|unique:termos,versao",
            "titulo"   => "required|string|max:255",
            "conteudo" => "required|string|max:65535",
            "publicar" => "boolean",
        ]);

        $publicar = (bool) ($data["publicar"] ?? false);
        if ($publicar) {
            Termo::where("publicado", true)->update(["publicado" => false]);
        }
        $t = Termo::create([
            "versao"       => $data["versao"],
            "titulo"       => $data["titulo"],
            "conteudo"     => $data["conteudo"],
            "publicado"    => $publicar,
            "publicado_em" => $publicar ? now() : null,
        ]);
        return response()->json($t, 201);
    }

    public function update(Request $request, Termo $termo) {
        $data = $request->validate([
            "titulo"   => "sometimes|required|string|max:255",
            "conteudo" => "sometimes|required|string|max:65535",
            "publicar" => "boolean",
        ]);

        $update = [];
        if (isset($data["titulo"]))   $update["titulo"]   = $data["titulo"];
        if (isset($data["conteudo"])) $update["conteudo"] = $data["conteudo"];
        if (array_key_exists("publicar", $data)) {
            $update["publicado"]    = (bool) $data["publicar"];
            $update["publicado_em"] = $data["publicar"] ? now() : null;
            if ($data["publicar"]) {
                Termo::where("publicado", true)->where("id", "!=", $termo->id)->update(["publicado" => false]);
            }
        }
        $termo->update($update);
        return response()->json($termo->fresh());
    }

    public function destroy(Termo $termo) {
        if ($termo->publicado && Termo::atual()?->id === $termo->id) {
            return response()->json(["message" => "Não pode eliminar a versão actualmente em vigor."], 422);
        }
        $termo->delete();
        return response()->json(["message" => "Versão removida."]);
    }
}
