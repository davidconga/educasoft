<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class GuiaController extends Controller {
    public function rh(Request $request) {
        $escola = optional($request->attributes->get("escola"))->toArray() ?? [];
        $pdf = Pdf::loadView("guias.rh", [
            "escola" => $escola,
        ])->setPaper("a4", "portrait");

        return $request->boolean("download")
            ? $pdf->download("guia-rapido-rh.pdf")
            : $pdf->stream("guia-rapido-rh.pdf");
    }
}
