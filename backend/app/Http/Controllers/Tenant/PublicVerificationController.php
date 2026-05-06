<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\CaixaSessao;
use App\Models\Tenant\Pagamento;
use App\Models\Tenant\ReciboBolsa;
use Illuminate\Http\Request;

/**
 * Verificação pública de documentos fiscais (sem autenticação).
 * Acessível via QR codes nos recibos/comprovativos.
 *
 * Devolve apenas informação não sensível, suficiente para:
 *   - confirmar que o documento foi mesmo emitido pela escola;
 *   - validar valor, data e hash;
 *   - identificar pagador.
 *
 * NÃO devolve: NIF completo, contactos, dados bancários, anexos.
 */
class PublicVerificationController extends Controller {

    public function recibo(Request $request, string $referencia) {
        $escola = $request->attributes->get("escola");
        $hashEsperado = (string) $request->query("h", "");

        $p = Pagamento::with("aluno.user", "propina", "emolumento")
            ->where("referencia", $referencia)
            ->first();

        if (!$p) {
            return response()->json(["valido" => false, "erro" => "Recibo não encontrado."], 404);
        }

        $hashOk = $hashEsperado === "" || hash_equals((string) $p->hash_factura, $hashEsperado);

        return response()->json([
            "valido"        => $hashOk && $p->status === "pago",
            "tipo"          => "recibo",
            "escola"        => ["nome" => $escola->nome, "codigo" => $escola->codigo, "logo" => $escola->logo],
            "referencia"    => $p->referencia,
            "estado"        => $p->status,
            "data_emissao"  => $p->assinada_em?->format("Y-m-d H:i") ?? optional($p->created_at)->format("Y-m-d H:i"),
            "data_pagamento"=> optional($p->data_pagamento)->format("Y-m-d"),
            "valor"         => (float) $p->valor,
            "multa"         => (float) ($p->multa_valor ?? 0),
            "bolsa"         => (float) ($p->bolsa_valor ?? 0),
            "total_pago"    => (float) $p->valor + (float) ($p->multa_valor ?? 0) - (float) ($p->bolsa_valor ?? 0),
            "metodo"        => $p->metodo,
            "descricao"     => $p->propina?->nome ?? $p->emolumento?->nome ?? $p->observacao ?? ucfirst((string) $p->tipo),
            "mes_referencia"=> $p->mes_referencia,
            "aluno"         => $p->aluno ? [
                "nome"         => $p->aluno->user?->nome,
                "numero_aluno" => $p->aluno->numero_aluno,
            ] : null,
            "hash"          => $p->hash_factura,
            "hash_match"    => $hashOk,
            "vendus_numero" => $p->vendus_numero,
            "lote_id"       => $p->lote_id,
        ]);
    }

    public function reciboBolsa(Request $request, string $referencia) {
        $escola = $request->attributes->get("escola");

        $r = ReciboBolsa::with(["bolsa.aluno.user", "bolsa.financiador"])
            ->where("referencia", $referencia)
            ->first();

        if (!$r) {
            return response()->json(["valido" => false, "erro" => "Recibo de bolsa não encontrado."], 404);
        }

        return response()->json([
            "valido"       => true,
            "tipo"         => "recibo_bolsa",
            "escola"       => ["nome" => $escola->nome, "codigo" => $escola->codigo, "logo" => $escola->logo],
            "referencia"   => $r->referencia,
            "data_emissao" => optional($r->data_emissao)->format("Y-m-d") ?? optional($r->created_at)->format("Y-m-d"),
            "valor"        => (float) ($r->valor ?? 0),
            "aluno"        => $r->bolsa?->aluno ? [
                "nome"         => $r->bolsa->aluno->user?->nome,
                "numero_aluno" => $r->bolsa->aluno->numero_aluno,
            ] : null,
            "financiador"  => $r->bolsa?->financiador?->nome,
            "observacoes"  => $r->observacoes,
        ]);
    }

    public function fechoCaixa(Request $request, string $codigo) {
        $escola = $request->attributes->get("escola");
        $s = CaixaSessao::where("codigo", $codigo)->first();
        if (!$s) {
            return response()->json(["valido" => false, "erro" => "Sessão de caixa não encontrada."], 404);
        }

        return response()->json([
            "valido"        => true,
            "tipo"          => "fecho_caixa",
            "escola"        => ["nome" => $escola->nome, "codigo" => $escola->codigo, "logo" => $escola->logo],
            "codigo"        => $s->codigo,
            "operador"      => $s->operador_nome,
            "estado"        => $s->status,
            "abriu_em"      => optional($s->abriu_em)->format("Y-m-d H:i"),
            "fechou_em"     => optional($s->fechou_em)->format("Y-m-d H:i"),
            "fundo_inicial" => (float) $s->fundo_inicial,
            "total_esperado"=> (float) $s->total_esperado,
            "total_contado" => $s->total_contado !== null ? (float) $s->total_contado : null,
            "diferenca"     => $s->diferenca !== null ? (float) $s->diferenca : null,
        ]);
    }
}
