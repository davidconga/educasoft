<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\FolhaPagamento;
use App\Models\Tenant\Funcionario;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FolhaPagamentoController extends Controller {
    private static $MESES = ["", "Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    public function index(Request $request) {
        $q = FolhaPagamento::with('funcionario');
        if ($request->ano)             $q->where('ano', $request->ano);
        if ($request->mes)             $q->where('mes', $request->mes);
        if ($request->estado)          $q->where('estado', $request->estado);
        if ($request->funcionario_id)  $q->where('funcionario_id', $request->funcionario_id);
        return response()->json($q->orderByDesc('ano')->orderByDesc('mes')->paginate($request->per_page ?? 50));
    }

    public function show(FolhaPagamento $folha) {
        return response()->json($folha->load('funcionario'));
    }

    public function store(Request $request) {
        $request->validate([
            'funcionario_id' => 'required|exists:funcionarios,id',
            'mes'            => 'required|integer|between:1,12',
            'ano'            => 'required|integer|min:2020|max:2100',
        ]);

        $func = Funcionario::findOrFail($request->funcionario_id);
        $folha = $this->criarOuAchar($func, (int)$request->mes, (int)$request->ano, $request->all());
        return response()->json([
            'message' => 'Folha gerada.',
            'folha'   => $folha->fresh()->load('funcionario'),
        ], 201);
    }

    public function update(Request $request, FolhaPagamento $folha) {
        if ($folha->estado === 'paga') {
            return response()->json(['message' => 'Folha já paga — não pode ser editada.'], 422);
        }
        $data = $request->validate([
            'salario_base'   => 'nullable|numeric|min:0',
            'subsidios'      => 'nullable|array',
            'subsidios.*.nome'  => 'required_with:subsidios|string|max:100',
            'subsidios.*.valor' => 'required_with:subsidios|numeric|min:0',
            'descontos'      => 'nullable|array',
            'descontos.*.nome'  => 'required_with:descontos|string|max:100',
            'descontos.*.valor' => 'required_with:descontos|numeric|min:0',
            'observacao'     => 'nullable|string',
        ]);
        $folha->fill($data);
        $this->recalcular($folha);
        $folha->save();
        return response()->json(['message' => 'Folha actualizada.', 'folha' => $folha->fresh()->load('funcionario')]);
    }

    public function processar(FolhaPagamento $folha) {
        if ($folha->estado === 'paga') {
            return response()->json(['message' => 'Folha já paga.'], 422);
        }
        $folha->update(['estado' => 'processada']);
        return response()->json(['message' => 'Folha processada.', 'folha' => $folha->fresh()]);
    }

    public function pagar(Request $request, FolhaPagamento $folha) {
        $request->validate([
            'metodo'             => 'required|in:dinheiro,transferencia,multicaixa,cheque',
            'data_pagamento'     => 'required|date',
            'referencia_externa' => 'nullable|string|max:100',
        ]);
        $folha->update([
            'estado'             => 'paga',
            'metodo'             => $request->metodo,
            'data_pagamento'     => $request->data_pagamento,
            'referencia_externa' => $request->referencia_externa,
        ]);
        return response()->json(['message' => 'Folha marcada como paga.', 'folha' => $folha->fresh()]);
    }

    public function anular(Request $request, FolhaPagamento $folha) {
        $folha->update(['estado' => 'anulada', 'observacao' => trim(($folha->observacao ?? '') . ' [ANULADA: ' . ($request->motivo ?? 'sem motivo') . ']')]);
        return response()->json(['message' => 'Folha anulada.', 'folha' => $folha->fresh()]);
    }

    public function destroy(FolhaPagamento $folha) {
        if ($folha->estado === 'paga') {
            return response()->json(['message' => 'Folha paga não pode ser eliminada — anula em vez disso.'], 422);
        }
        $folha->delete();
        return response()->json(['message' => 'Folha removida.']);
    }

    /** POST /folhas-pagamento/gerar-mes — gera folhas para todos os funcionários activos. */
    public function gerarMes(Request $request) {
        $request->validate([
            'mes' => 'required|integer|between:1,12',
            'ano' => 'required|integer|min:2020|max:2100',
        ]);
        $mes = (int)$request->mes;
        $ano = (int)$request->ano;

        $funcionarios = Funcionario::where('estado', 'activo')->get();
        $criadas = 0; $existentes = 0;

        foreach ($funcionarios as $f) {
            if (FolhaPagamento::where('funcionario_id', $f->id)->where('mes', $mes)->where('ano', $ano)->exists()) {
                $existentes++; continue;
            }
            $this->criarOuAchar($f, $mes, $ano);
            $criadas++;
        }

        return response()->json([
            'message'   => "Geradas {$criadas} folha(s). {$existentes} já existiam.",
            'criadas'   => $criadas,
            'existentes'=> $existentes,
        ]);
    }

    public function reciboPdf(FolhaPagamento $folha, Request $request) {
        $folha->load('funcionario');
        $escola = $request->attributes->get('escola');
        $pdf = Pdf::loadView('rh.recibo_salario', [
            'folha'     => $folha,
            'escola'    => $escola ? ['nome' => $escola->nome, 'logo' => $escola->logo, 'endereco' => $escola->endereco, 'nif' => $escola->nif, 'telefone' => $escola->telefone, 'email' => $escola->email] : ['nome' => 'Escola'],
            'mesNome'   => self::$MESES[$folha->mes] ?? '',
        ])->setPaper('a4');
        return $pdf->download("recibo-salario-{$folha->referencia}.pdf");
    }

    /* Helpers */

    private function criarOuAchar(Funcionario $func, int $mes, int $ano, array $extra = []): FolhaPagamento {
        return FolhaPagamento::firstOrCreate(
            ['funcionario_id' => $func->id, 'mes' => $mes, 'ano' => $ano],
            array_merge([
                'referencia'      => 'FOLHA-' . strtoupper(Str::random(8)),
                'salario_base'    => $func->salario_base,
                'subsidios'       => [],
                'descontos'       => [],
                'total_subsidios' => 0,
                'total_descontos' => 0,
                'liquido'         => $func->salario_base,
                'estado'          => 'rascunho',
            ], array_intersect_key($extra, array_flip(['observacao'])))
        );
    }

    private function recalcular(FolhaPagamento $folha): void {
        $totSub = collect($folha->subsidios ?? [])->sum(fn($x) => (float)($x['valor'] ?? 0));
        $totDes = collect($folha->descontos ?? [])->sum(fn($x) => (float)($x['valor'] ?? 0));
        $folha->total_subsidios = $totSub;
        $folha->total_descontos = $totDes;
        $folha->liquido = (float)$folha->salario_base + $totSub - $totDes;
    }
}
