<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Escola;
use App\Models\Central\FacturaCentral;
use App\Services\Central\FacturaCentralService;
use App\Services\Central\PdfService;
use App\Services\Central\ReferenciaPagamentoGateway;
use App\Services\Central\VendusEmitter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class FacturaCentralController extends Controller {
    public function index(Request $request) {
        $q = FacturaCentral::with("escola:id,nome,codigo")->orderByDesc("data_emissao");
        if ($estado = $request->query("estado")) $q->where("estado", $estado);
        if ($escolaId = $request->query("escola_id")) $q->where("escola_id", $escolaId);
        if ($de = $request->query("de")) $q->whereDate("data_emissao", ">=", $de);
        if ($ate = $request->query("ate")) $q->whereDate("data_emissao", "<=", $ate);
        if ($s = $request->query("q")) {
            $q->where(function ($w) use ($s) {
                $w->where("numero", "like", "%{$s}%")
                  ->orWhere("cliente_nome", "like", "%{$s}%")
                  ->orWhere("cliente_nif", "like", "%{$s}%");
            });
        }

        $facturas = $q->paginate(20);

        // Enriquecer com flag vencida
        $facturas->getCollection()->transform(function ($f) {
            $f->vencida = $f->isVencida();
            return $f;
        });

        return response()->json([
            "facturas" => $facturas,
            "totais"   => [
                "pendente" => (float) FacturaCentral::where("estado", "pendente")->sum("total"),
                "pago_mes" => (float) FacturaCentral::where("estado", "paga")
                                ->whereMonth("paga_em", Carbon::now()->month)
                                ->whereYear("paga_em", Carbon::now()->year)
                                ->sum("total"),
                "vencidas" => FacturaCentral::where("estado", "pendente")
                                ->whereDate("data_vencimento", "<", Carbon::today())->count(),
            ],
        ]);
    }

    public function show(FacturaCentral $factura) {
        $factura->load("escola", "referencias", "comprovativo");
        $factura->vencida = $factura->isVencida();
        return response()->json($factura);
    }

    public function store(Request $request, FacturaCentralService $service) {
        $data = $request->validate([
            "escola_id" => "required|string|exists:tenants,id",
            "mes"       => "nullable|date_format:Y-m",
        ]);
        $escola = Escola::findOrFail($data["escola_id"]);
        $mes = isset($data["mes"]) ? Carbon::createFromFormat("Y-m-d", $data["mes"] . "-01") : Carbon::now()->startOfMonth();
        $factura = $service->gerarPara($escola, $mes);
        if (!$factura) {
            return response()->json(["message" => "Plano gratuito ou valor zero — sem factura emitida."], 422);
        }
        return response()->json($factura, 201);
    }

    public function marcarPaga(Request $request, FacturaCentral $factura, FacturaCentralService $service) {
        $data = $request->validate([
            "metodo"   => "nullable|string|max:30",
            "transacao_ref" => "nullable|string|max:80",
        ]);
        $f = $service->marcarPaga($factura, $data["metodo"] ?? "manual", $data["transacao_ref"] ?? null);
        return response()->json($f->load("comprovativo"));
    }

    public function anular(Request $request, FacturaCentral $factura) {
        if ($factura->estado === "paga") {
            return response()->json(["message" => "Não pode anular factura paga."], 422);
        }
        $factura->update(["estado" => "anulada", "notas" => trim(($factura->notas ?? "") . "\n[Anulada em " . now()->format("d/m/Y H:i") . "] " . ($request->motivo ?? ""))]);
        return response()->json($factura);
    }

    public function pdf(FacturaCentral $factura, PdfService $pdf) {
        return response($pdf->factura($factura))
            ->header("Content-Type", "application/pdf")
            ->header("Content-Disposition", 'inline; filename="' . str_replace(["/", " "], "_", $factura->numero) . '.pdf"');
    }

    public function gerarReferencia(FacturaCentral $factura, ReferenciaPagamentoGateway $gw) {
        if ($factura->estado === "paga") {
            return response()->json(["message" => "Factura já paga."], 422);
        }
        $ref = $gw->gerar($factura);
        return response()->json($ref);
    }

    public function emitirVendus(FacturaCentral $factura, VendusEmitter $emitter) {
        $r = $emitter->emitirFacturaCentral($factura);
        return response()->json([
            "ok"      => $r["ok"],
            "factura" => $r["factura"],
            "erro"    => $r["erro"],
        ], $r["ok"] ? 200 : 422);
    }
}
