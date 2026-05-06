<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Plano;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PlanoController extends Controller {
    public function index(Request $request) {
        $q = Plano::query()->orderBy("ordem")->orderBy("preco_mensal");
        if ($request->boolean("apenas_ativos")) $q->where("ativo", true);

        $planos = $q->get()->map(function ($p) {
            $p->total_assinaturas = $p->assinaturas()->whereIn("estado", ["ativa", "trial"])->count();
            return $p;
        });

        return response()->json($planos);
    }

    public function show(Plano $plano) {
        $plano->total_assinaturas = $plano->assinaturas()->count();
        return response()->json($plano);
    }

    public function store(Request $request) {
        $data = $this->validateData($request);
        $data["codigo"] = $data["codigo"] ?? Str::slug($data["nome"]);
        $data["features"] = $data["features"] ?? [];
        $plano = Plano::create($data);
        return response()->json($plano, 201);
    }

    public function update(Request $request, Plano $plano) {
        $data = $this->validateData($request, $plano->id);
        $plano->update($data);
        return response()->json($plano->fresh());
    }

    public function destroy(Plano $plano) {
        if ($plano->assinaturas()->whereIn("estado", ["ativa", "trial"])->exists()) {
            return response()->json(["message" => "Não pode eliminar plano com assinaturas activas."], 422);
        }
        $plano->update(["ativo" => false]);
        return response()->json(["message" => "Plano desactivado."]);
    }

    private function validateData(Request $request, ?int $ignoreId = null): array {
        $rules = [
            "codigo"       => ["nullable", "string", "max:30", "regex:/^[a-z0-9_-]+$/", "unique:planos,codigo" . ($ignoreId ? ",{$ignoreId}" : "")],
            "nome"         => "required|string|max:100",
            "descricao"    => "nullable|string|max:1000",
            "preco_mensal" => "required|numeric|min:0",
            "preco_anual"  => "nullable|numeric|min:0",
            "max_alunos"   => "required|integer|min:-1",
            "max_admins"   => "required|integer|min:-1",
            "features"     => "nullable|array",
            "features.*"   => "string|max:255",
            "feature_keys" => "nullable|array",
            "feature_keys.*" => "string|max:50|regex:/^[a-z0-9_]+$/",
            "destaque"     => "boolean",
            "ativo"        => "boolean",
            "ordem"        => "integer|min:0",
            "dias_trial"   => "integer|min:0|max:90",
        ];
        return $request->validate($rules);
    }
}
