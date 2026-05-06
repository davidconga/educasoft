<?php
namespace App\Services\Central;

use App\Models\Central\Comprovativo;
use App\Models\Central\FacturaCentral;
use Illuminate\Support\Carbon;

class ComprovativoService {
    public function gerarPara(FacturaCentral $factura, string $metodo, ?string $transacao = null): Comprovativo {
        $existente = Comprovativo::where("factura_id", $factura->id)->first();
        if ($existente) return $existente;

        $ano    = (int) Carbon::now()->year;
        $proxN  = (Comprovativo::whereYear("created_at", $ano)->max("id") ?? 0) + 1;
        $numero = sprintf("RC %d/%05d", $ano, $proxN);

        $hash = substr(hash("sha256", $factura->numero . "|" . ($factura->total) . "|" . ($transacao ?? "")), 0, 4);
        $hash = strtoupper(substr($hash, 0, 1) . substr($hash, 1, 1) . substr($hash, 2, 1) . substr($hash, 3, 1));

        return Comprovativo::create([
            "factura_id"        => $factura->id,
            "numero"            => $numero,
            "data_emissao"      => Carbon::today()->toDateString(),
            "valor"             => $factura->total,
            "metodo_pagamento"  => $metodo,
            "transacao_ref"     => $transacao,
            "hash"              => $hash,
        ]);
    }
}
