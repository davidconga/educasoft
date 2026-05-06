<?php
namespace App\Services\Central;

use App\Models\Central\Comprovativo;
use App\Models\Central\FacturaCentral;
use Barryvdh\DomPDF\Facade\Pdf;

class PdfService {
    public function factura(FacturaCentral $factura): string {
        $factura->loadMissing("escola", "referencias");
        $pdf = Pdf::loadView("pdf.factura-central", ["f" => $factura])->setPaper("A4");
        return $pdf->output();
    }

    public function comprovativo(Comprovativo $c): string {
        $c->loadMissing("factura.escola");
        $pdf = Pdf::loadView("pdf.comprovativo-central", ["c" => $c])->setPaper("A4");
        return $pdf->output();
    }
}
