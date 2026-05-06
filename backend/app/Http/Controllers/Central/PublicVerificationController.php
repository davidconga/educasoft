<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\Comprovativo;
use App\Models\Central\FacturaCentral;
use Illuminate\Http\Request;

/**
 * Verificação pública de documentos centrais (factura central, comprovativo).
 * Acessível via QR codes; sem autenticação.
 *
 * Devolve apenas informação suficiente para confirmar autenticidade,
 * sem expor dados sensíveis (NIF completo, contactos, etc.).
 */
class PublicVerificationController extends Controller {

    public function factura(Request $request, string $numero) {
        $hashEsperado = (string) $request->query("h", "");
        $f = FacturaCentral::with("escola:id,nome,codigo,logo")
            ->where("numero", $numero)
            ->first();

        if (!$f) {
            return response()->json(["valido" => false, "erro" => "Factura não encontrada."], 404);
        }

        $hashOk = $hashEsperado === "" || hash_equals((string) $f->hash, $hashEsperado);

        return response()->json([
            "valido"          => $hashOk && $f->estado !== "anulada",
            "tipo"            => "factura_central",
            "numero"          => $f->numero,
            "estado"          => $f->estado,
            "data_emissao"    => optional($f->data_emissao)->format("Y-m-d"),
            "data_vencimento" => optional($f->data_vencimento)->format("Y-m-d"),
            "periodo"         => [
                "inicio" => optional($f->periodo_inicio)->format("Y-m-d"),
                "fim"    => optional($f->periodo_fim)->format("Y-m-d"),
            ],
            "cliente"         => [
                "nome" => $f->cliente_nome,
                "logo" => $f->escola?->logo,
            ],
            "plano"           => $f->plano,
            "subtotal"        => (float) $f->subtotal,
            "iva_taxa"        => (float) $f->iva_taxa,
            "iva_valor"       => (float) $f->iva_valor,
            "total"           => (float) $f->total,
            "hash"            => $f->hash,
            "hash_match"      => $hashOk,
            "vendus_numero"   => $f->vendus_numero,
        ]);
    }

    public function comprovativo(Request $request, string $numero) {
        $hashEsperado = (string) $request->query("h", "");
        $c = Comprovativo::with("factura.escola:id,nome,codigo,logo")
            ->where("numero", $numero)
            ->first();

        if (!$c) {
            return response()->json(["valido" => false, "erro" => "Recibo não encontrado."], 404);
        }

        $hashOk = $hashEsperado === "" || hash_equals((string) $c->hash, $hashEsperado);

        return response()->json([
            "valido"          => $hashOk,
            "tipo"            => "comprovativo_central",
            "numero"          => $c->numero,
            "data_emissao"    => optional($c->data_emissao)->format("Y-m-d"),
            "valor"           => (float) $c->valor,
            "metodo"          => $c->metodo_pagamento,
            "transacao_ref"   => $c->transacao_ref,
            "cliente"         => [
                "nome" => $c->factura?->cliente_nome,
                "logo" => $c->factura?->escola?->logo,
            ],
            "factura_numero"  => $c->factura?->numero,
            "hash"            => $c->hash,
            "hash_match"      => $hashOk,
        ]);
    }
}
