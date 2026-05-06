<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Escola;
use App\Models\Central\FacturaCentral;
use App\Services\Central\FacturaCentralService;
use Illuminate\Http\Request;

/**
 * Visão de "cliente" sobre uma escola — dados de facturação e histórico de facturas.
 */
class ClienteController extends Controller {
    public function index(Request $request) {
        $q = Escola::query()->orderBy("nome");
        if ($s = $request->query("q")) {
            $q->where(function ($w) use ($s) {
                $w->where("nome", "like", "%{$s}%")
                  ->orWhere("nif", "like", "%{$s}%")
                  ->orWhere("codigo", "like", "%{$s}%")
                  ->orWhere("email", "like", "%{$s}%");
            });
        }
        if ($plano = $request->query("plano")) $q->where("plano", $plano);
        if ($request->query("apenas_ativos")) $q->where("ativo", true);

        $clientes = $q->paginate(20);

        // Enriquecer com totais facturados/pendentes
        $ids = $clientes->pluck("id");
        $stats = FacturaCentral::selectRaw("escola_id, COUNT(*) as total, SUM(CASE WHEN estado='pendente' THEN total ELSE 0 END) as pendente, SUM(CASE WHEN estado='paga' THEN total ELSE 0 END) as pago")
            ->whereIn("escola_id", $ids)
            ->groupBy("escola_id")
            ->get()
            ->keyBy("escola_id");

        $clientes->getCollection()->transform(function ($e) use ($stats) {
            $e->facturas_total    = (int) ($stats[$e->id]->total ?? 0);
            $e->valor_pendente    = (float) ($stats[$e->id]->pendente ?? 0);
            $e->valor_pago        = (float) ($stats[$e->id]->pago ?? 0);
            $e->valor_mensal_real = (new FacturaCentralService())->valorMensalDe($e);
            return $e;
        });

        return response()->json($clientes);
    }

    public function show(Escola $escola) {
        $facturas = FacturaCentral::where("escola_id", $escola->id)
            ->orderByDesc("data_emissao")
            ->limit(24)
            ->get();

        $escola->load(["assinaturaAtiva.plano", "assinaturas.plano" => fn ($q) => $q->select("id", "codigo", "nome", "preco_mensal")]);

        return response()->json([
            "cliente"           => $escola,
            "assinatura_ativa"  => $escola->assinaturaAtiva,
            "historico_assinaturas" => $escola->assinaturas()->with("plano:id,codigo,nome,preco_mensal")->orderByDesc("data_inicio")->limit(10)->get(),
            "valor_mensal"      => (new FacturaCentralService())->valorMensalDe($escola),
            "facturas"          => $facturas,
            "totais" => [
                "facturado_total" => $facturas->sum("total"),
                "pago_total"      => $facturas->where("estado", "paga")->sum("total"),
                "pendente_total"  => $facturas->where("estado", "pendente")->sum("total"),
                "vencidas"        => $facturas->where("estado", "pendente")->filter(fn ($f) => $f->isVencida())->count(),
            ],
        ]);
    }

    public function update(Request $request, Escola $escola) {
        $data = $request->validate([
            "nif"                    => "nullable|string|max:30",
            "endereco"               => "nullable|string|max:500",
            "telefone"               => "nullable|string|max:50",
            "email_facturacao"       => "nullable|email|max:255",
            "responsavel_facturacao" => "nullable|string|max:255",
            "dia_vencimento"         => "nullable|integer|min:1|max:28",
            "valor_mensal"           => "nullable|numeric|min:0",
            "desconto_pct"           => "nullable|numeric|min:0|max:100",
            "notas_facturacao"       => "nullable|string|max:5000",
        ]);
        $escola->update($data);
        return response()->json($escola->fresh());
    }
}
