<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Comprovativo;
use App\Services\Central\PdfService;
use Illuminate\Http\Request;

class ComprovativoController extends Controller {
    public function index(Request $request) {
        $q = Comprovativo::with("factura:id,numero,escola_id,cliente_nome")->orderByDesc("data_emissao");
        if ($s = $request->query("q")) {
            $q->where(function ($w) use ($s) {
                $w->where("numero", "like", "%{$s}%")
                  ->orWhereHas("factura", fn ($f) => $f->where("numero", "like", "%{$s}%")->orWhere("cliente_nome", "like", "%{$s}%"));
            });
        }
        return response()->json($q->paginate(20));
    }

    public function pdf(Comprovativo $comprovativo, PdfService $pdf) {
        return response($pdf->comprovativo($comprovativo))
            ->header("Content-Type", "application/pdf")
            ->header("Content-Disposition", 'inline; filename="' . str_replace(["/", " "], "_", $comprovativo->numero) . '.pdf"');
    }
}
