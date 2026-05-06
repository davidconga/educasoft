<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Assinatura;
use App\Models\Central\Escola;
use App\Models\Central\Plano;
use App\Services\Central\AssinaturaService;
use Illuminate\Http\Request;

class AssinaturaController extends Controller {
    public function index(Request $request) {
        $q = Assinatura::with(["escola:id,nome,codigo,email", "plano:id,codigo,nome,preco_mensal"])
            ->orderByDesc("created_at");

        if ($estado = $request->query("estado")) $q->where("estado", $estado);
        if ($plano  = $request->query("plano_id")) $q->where("plano_id", $plano);
        if ($s      = $request->query("q")) {
            $q->whereHas("escola", function ($w) use ($s) {
                $w->where("nome", "like", "%{$s}%")
                  ->orWhere("codigo", "like", "%{$s}%")
                  ->orWhere("email", "like", "%{$s}%");
            });
        }

        return response()->json([
            "assinaturas" => $q->paginate(20),
            "totais" => [
                "ativas"     => Assinatura::where("estado", "ativa")->count(),
                "trial"      => Assinatura::where("estado", "trial")->count(),
                "suspensas"  => Assinatura::where("estado", "suspensa")->count(),
                "canceladas" => Assinatura::where("estado", "cancelada")->count(),
                "mrr"        => (float) Assinatura::whereIn("estado", ["ativa"])->sum("preco_aplicado"),
            ],
        ]);
    }

    public function show(Assinatura $assinatura) {
        $assinatura->load(["escola", "plano"]);
        return response()->json($assinatura);
    }

    public function mudarPlano(Request $request, Escola $escola, AssinaturaService $service) {
        $data = $request->validate([
            "plano_id"     => "required|exists:planos,id",
            "preco_custom" => "nullable|numeric|min:0",
            "desconto_pct" => "nullable|numeric|min:0|max:100",
            "imediato"     => "boolean",
        ]);
        $plano = Plano::findOrFail($data["plano_id"]);
        $nova = $service->mudarPlano(
            $escola,
            $plano,
            $data["preco_custom"] ?? null,
            $data["desconto_pct"] ?? null,
            (bool) ($data["imediato"] ?? false)
        );
        return response()->json($nova->load("plano"));
    }

    public function suspender(Request $request, Assinatura $assinatura, AssinaturaService $service) {
        $a = $service->suspender($assinatura, $request->input("motivo"));
        return response()->json($a);
    }

    public function reactivar(Assinatura $assinatura, AssinaturaService $service) {
        $a = $service->reactivar($assinatura);
        return response()->json($a);
    }

    public function cancelar(Request $request, Assinatura $assinatura, AssinaturaService $service) {
        $data = $request->validate([
            "motivo"   => "required|string|max:500",
            "imediato" => "boolean",
        ]);
        $a = $service->cancelar($assinatura, $data["motivo"], (bool) ($data["imediato"] ?? false));
        return response()->json($a);
    }
}
