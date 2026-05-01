<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Pagamento;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReciboPdfController extends Controller {
    /** GET /pagamentos/{pagamento}/recibo.pdf — devolve o PDF do recibo individual. */
    /** GET /pagamentos/lote/{loteId}/recibo.pdf — recibo consolidado de um lote (vários pagamentos). */
    public function lote(Request $request, string $loteId) {
        $pagamentos = Pagamento::where("lote_id", $loteId)
            ->with("aluno.user","aluno.matriculas.turma.classe.curso","aluno.matriculas.turma.turnoObj","propina","emolumento","plano","multa")
            ->orderBy("id")->get();
        if ($pagamentos->isEmpty()) abort(404, "Lote não encontrado.");

        // Para o recibo consolidado, usa o aluno do primeiro pagamento (assumimos que um lote é por aluno)
        $primeiro = $pagamentos->first();
        $alunoId  = $primeiro->aluno_id;

        $totalPago = (float) Pagamento::where("aluno_id", $alunoId)->where("status","pago")
            ->selectRaw("COALESCE(SUM(valor),0) + COALESCE(SUM(multa_valor),0) as total")->value("total");
        $totalPend = (float) Pagamento::where("aluno_id", $alunoId)->where("status","pendente")
            ->selectRaw("COALESCE(SUM(valor),0) + COALESCE(SUM(multa_valor),0) as total")->value("total");

        $valorTotalLote = $pagamentos->sum(fn($p) => (float)$p->valor + (float)($p->multa_valor ?? 0));
        $saldoAnterior  = ($totalPago - $valorTotalLote) - ($totalPend + $valorTotalLote);

        $matricula = $primeiro->aluno?->matriculas
            ?->sortByDesc(fn($m) => $m->status === "activa" ? 2 : ($m->status === "pendente" ? 1 : 0))
            ?->first();

        $pdf = Pdf::loadView("recibos.factura_lote", [
            "pagamentos" => $pagamentos,
            "aluno"      => $primeiro->aluno,
            "lote_id"    => $loteId,
            "escola"     => (array) $request->attributes->get("escola", []),
            "carteira"   => [
                "total_pago"     => $totalPago,
                "total_pendente" => $totalPend,
                "saldo"          => $totalPago - $totalPend,
                "saldo_anterior" => $saldoAnterior,
                "saldo_actual"   => $totalPago - $totalPend,
            ],
            "academico"  => [
                "curso"  => $matricula?->turma?->classe?->curso?->nome,
                "classe" => $matricula?->turma?->classe?->nome,
                "turno"  => $matricula?->turma?->turnoObj?->nome ?? $matricula?->turma?->turno,
                "turma"  => $matricula?->turma?->nome,
            ],
        ])->setPaper("a4", "portrait");

        return $request->boolean("download")
            ? $pdf->download("recibo-lote-{$loteId}.pdf")
            : $pdf->stream("recibo-lote-{$loteId}.pdf");
    }

    public function single(Request $request, Pagamento $pagamento) {
        $pagamento->load([
            "aluno.user",
            "aluno.matriculas" => fn($q) => $q->where("status","activa")->orWhereIn("status",["pendente","concluida"])->orderBy("status"),
            "aluno.matriculas.turma.classe.curso",
            "aluno.matriculas.turma.turnoObj",
            "propina","emolumento","plano","multa",
        ]);
        $escola = (array) $request->attributes->get("escola", []);

        // Carteira: agregados gerais
        $alunoId = $pagamento->aluno_id;
        $totalPago = (float) Pagamento::where("aluno_id", $alunoId)->where("status","pago")
            ->selectRaw("COALESCE(SUM(valor),0) + COALESCE(SUM(multa_valor),0) as total")->value("total");
        $totalPend = (float) Pagamento::where("aluno_id", $alunoId)->where("status","pendente")
            ->selectRaw("COALESCE(SUM(valor),0) + COALESCE(SUM(multa_valor),0) as total")->value("total");

        // Valor deste pagamento (base + multa)
        $valorEste = (float) $pagamento->valor + (float) ($pagamento->multa_valor ?? 0);

        // Saldo "anterior" (antes deste pagamento ter sido confirmado): este pagamento contava como pendente
        $saldoAnterior = ($totalPago - $valorEste) - ($totalPend + $valorEste);
        // Saldo actual (depois): este pagamento já está em pago
        $saldoActual   = $totalPago - $totalPend;

        $carteira = [
            "total_pago"     => $totalPago,
            "total_pendente" => $totalPend,
            "saldo"          => $saldoActual,
            "saldo_anterior" => $saldoAnterior,
            "saldo_actual"   => $saldoActual,
        ];

        // Info académica (matrícula activa preferida, fallback para a mais recente)
        $matricula = $pagamento->aluno?->matriculas
            ?->sortByDesc(fn($m) => $m->status === "activa" ? 2 : ($m->status === "pendente" ? 1 : 0))
            ?->first();

        $academico = [
            "curso"  => $matricula?->turma?->classe?->curso?->nome,
            "classe" => $matricula?->turma?->classe?->nome,
            "turno"  => $matricula?->turma?->turnoObj?->nome ?? $matricula?->turma?->turno,
            "turma"  => $matricula?->turma?->nome,
        ];

        $pdf = Pdf::loadView("recibos.factura", [
            "pagamento" => $pagamento,
            "escola"    => $escola,
            "carteira"  => $carteira,
            "academico" => $academico,
        ])->setPaper("a4", "portrait");

        $filename = "recibo-" . ($pagamento->referencia ?? $pagamento->id) . ".pdf";

        return $request->boolean("download")
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
