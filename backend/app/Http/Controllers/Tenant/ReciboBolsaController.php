<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Pagamento;
use App\Models\Tenant\ReciboBolsa;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class ReciboBolsaController extends Controller {
    public function index(Request $r) {
        $q = ReciboBolsa::query()->with(["financiador","aluno.user"]);
        if ($r->filled("financiador_id")) $q->where("financiador_id", $r->financiador_id);
        if ($r->filled("aluno_id"))       $q->where("aluno_id", $r->aluno_id);
        if ($r->filled("desde"))          $q->where("data_emissao", ">=", $r->desde);
        if ($r->filled("ate"))            $q->where("data_emissao", "<=", $r->ate);
        return response()->json($q->orderByDesc("data_emissao")->get());
    }

    public function show(ReciboBolsa $reciboBolsa) {
        $reciboBolsa->load(["financiador","aluno.user","bolsa","pagamentos.propina","pagamentos.emolumento"]);
        return response()->json($reciboBolsa);
    }

    /**
     * Emite um recibo de bolsa para os pagamentos do aluno num período,
     * agregando todas as parcelas pagas com bolsa do mesmo financiador.
     *
     * POST /recibos-bolsa/emitir
     *   { aluno_id, financiador_id, desde, ate, observacoes? }
     */
    public function emitir(Request $r) {
        $data = $r->validate([
            "aluno_id"       => "required|exists:alunos,id",
            "financiador_id" => "required|exists:financiadores,id",
            "desde"          => "required|date",
            "ate"            => "required|date|after_or_equal:desde",
            "observacoes"    => "nullable|string",
        ]);

        $pagamentos = Pagamento::where("aluno_id", $data["aluno_id"])
            ->where("bolsa_financiador_id", $data["financiador_id"])
            ->whereNull("recibo_bolsa_id")
            ->where("status", "pago")
            ->whereBetween("data_pagamento", [$data["desde"], $data["ate"]])
            ->where("bolsa_valor", ">", 0)
            ->orderBy("data_pagamento")->get();

        if ($pagamentos->isEmpty()) {
            return response()->json([
                "message" => "Não existem pagamentos com bolsa deste financiador no período seleccionado, ou já foram incluídos noutro recibo.",
            ], 422);
        }

        $valorTotal = $pagamentos->sum(fn($p) => (float)$p->bolsa_valor);

        return DB::transaction(function () use ($data, $pagamentos, $valorTotal, $r) {
            $ano = Carbon::parse($data["ate"])->year;
            $proximoNum = ReciboBolsa::whereYear("data_emissao", $ano)->count() + 1;
            $bolsa = $pagamentos->first()->bolsa;

            $recibo = ReciboBolsa::create([
                "financiador_id"      => $data["financiador_id"],
                "aluno_id"            => $data["aluno_id"],
                "bolsa_id"            => $bolsa?->id,
                "referencia"          => "RB {$ano}/" . $proximoNum,
                "data_emissao"        => Carbon::today()->toDateString(),
                "valor_total"         => $valorTotal,
                "observacoes"         => $data["observacoes"] ?? null,
                "emitido_por_user_id" => optional($r->user())->id,
            ]);

            Pagamento::whereIn("id", $pagamentos->pluck("id"))
                ->update(["recibo_bolsa_id" => $recibo->id]);

            $recibo->load(["financiador","aluno.user","pagamentos.propina","pagamentos.emolumento"]);
            return response()->json($recibo, 201);
        });
    }

    public function pdf(Request $r, ReciboBolsa $reciboBolsa) {
        $reciboBolsa->load([
            "financiador","aluno.user","bolsa",
            "pagamentos.propina","pagamentos.emolumento","pagamentos.multa",
        ]);
        $escola = (array) $r->attributes->get("escola", []);
        $pdf = Pdf::loadView("recibos.recibo_bolsa", [
            "recibo" => $reciboBolsa,
            "escola" => $escola,
        ])->setPaper("a4", "portrait");

        $nome = "recibo-bolsa-" . str_replace(["/", " "], "-", $reciboBolsa->referencia) . ".pdf";
        return $r->boolean("download") ? $pdf->download($nome) : $pdf->stream($nome);
    }
}
