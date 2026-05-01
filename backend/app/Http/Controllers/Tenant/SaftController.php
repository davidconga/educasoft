<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\Tenant\SaftAoExporter;
use Illuminate\Http\Request;

class SaftController extends Controller {
    /**
     * GET /api/tenant/saft?ano=2025&mes=01  (mes opcional → ano inteiro)
     * Devolve o XML SAFT-AO como download.
     */
    public function exportar(Request $request) {
        $request->validate([
            "ano" => "required|integer|min:2000|max:2100",
            "mes" => "nullable|integer|min:1|max:12",
        ]);
        $escola = $request->attributes->get("escola");
        if (!$escola) abort(400, "Escola não identificada.");

        $exporter = new SaftAoExporter($escola, (int)$request->ano, $request->mes ? (int)$request->mes : null);
        $xml = $exporter->gerarXml();

        $sufixo = $request->mes ? sprintf("%04d-%02d", $request->ano, $request->mes) : (string)$request->ano;
        $filename = "SAFT-AO_" . preg_replace("/[^a-z0-9]/i", "_", $escola->codigo ?? "escola") . "_{$sufixo}.xml";

        return response($xml, 200, [
            "Content-Type"        => "application/xml; charset=utf-8",
            "Content-Disposition" => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
