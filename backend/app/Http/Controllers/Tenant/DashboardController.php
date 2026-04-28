<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\{Aluno, Professor, Turma, Pagamento, AulaRemota};
use Illuminate\Http\Request;

class DashboardController extends Controller {
    public function index(Request $request) {
        $escola = $request->attributes->get("escola");
        return response()->json([
            "escola" => $escola ? ["id"=>$escola->id,"nome"=>$escola->nome,"logo"=>$escola->logo,"email"=>$escola->email] : null,
            "total_alunos" => Aluno::count(),
            "total_professores" => Professor::count(),
            "total_turmas" => Turma::count(),
            "receita_mes" => Pagamento::where("status","pago")->whereMonth("data_pagamento", now()->month)->sum("valor"),
            "pagamentos_pendentes" => Pagamento::where("status","pendente")->count(),
            "aulas_hoje" => AulaRemota::whereDate("data_inicio", today())->where("status","agendada")->count(),
            "proximas_aulas" => AulaRemota::with("turma","disciplina")->where("data_inicio",">=",now())->where("status","agendada")->orderBy("data_inicio")->take(5)->get(),
        ]);
    }
}
