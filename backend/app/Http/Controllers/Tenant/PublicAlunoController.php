<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicAlunoController extends Controller
{
    public function show(Request $request, string $numero)
    {
        $escola = $request->attributes->get("escola");

        $aluno = DB::connection("tenant")
            ->table("alunos as a")
            ->join("users as u", "u.id", "=", "a.user_id")
            ->where("a.numero_aluno", $numero)
            ->select("a.id", "a.numero_aluno", "a.data_nascimento", "a.genero", "a.foto",
                     "u.nome", "u.email")
            ->first();

        if (!$aluno) {
            return response()->json(["message" => "Aluno não encontrado."], 404);
        }

        // Matrícula activa mais recente
        $matricula = DB::connection("tenant")
            ->table("matriculas as m")
            ->join("turmas as t", "t.id", "=", "m.turma_id")
            ->leftJoin("classes as c", "c.id", "=", "t.classe_id")
            ->leftJoin("cursos as cu", "cu.id", "=", "c.curso_id")
            ->where("m.aluno_id", $aluno->id)
            ->where("m.status", "activa")
            ->select("m.ano_letivo", "t.nome as turma", "c.nome as classe", "cu.nome as curso")
            ->orderByDesc("m.ano_letivo")
            ->first();

        // Pagamentos do ano activo (últimos 12 meses de mensalidades)
        $anoLetivo = $matricula?->ano_letivo ?? date("Y");
        preg_match_all('/\d{4}/', $anoLetivo, $m);
        $anos = $m[0] ?? [date("Y")];

        $pagamentos = DB::connection("tenant")
            ->table("pagamentos")
            ->where("aluno_id", $aluno->id)
            ->where("tipo", "mensalidade")
            ->where(function ($q) use ($anoLetivo, $anos) {
                $q->where("mes_referencia", "like", $anoLetivo . "-%");
                foreach ($anos as $ano) {
                    $q->orWhere("mes_referencia", "like", "% " . $ano);
                }
            })
            ->select("mes_referencia", "status", "valor", "data_pagamento")
            ->orderBy("mes_referencia")
            ->get();

        // Resumo de propinas
        $totalPago    = $pagamentos->where("status", "pago")->count();
        $totalPendente= $pagamentos->where("status", "pendente")->count();
        $valorEmDivida= $pagamentos->whereIn("status", ["pendente","vencido"])->sum("valor");

        // Notas do ano activo
        $notas = DB::connection("tenant")
            ->table("notas as n")
            ->join("disciplinas as d", "d.id", "=", "n.disciplina_id")
            ->where("n.aluno_id", $aluno->id)
            ->where("n.ano_letivo", $anoLetivo)
            ->select("d.nome as disciplina", "n.periodo", "n.media", "n.resultado")
            ->orderBy("d.nome")
            ->orderBy("n.periodo")
            ->get();

        // Média geral
        $medias = $notas->pluck("media")->filter();
        $mediaGeral = $medias->count() ? round($medias->avg(), 1) : null;

        return response()->json([
            "escola"    => $escola ? [
                "nome"  => $escola->nome,
                "logo"  => $escola->logo,
                "email" => $escola->email,
                "telefone" => $escola->telefone,
            ] : null,
            "aluno"     => [
                "nome"          => $aluno->nome,
                "numero_aluno"  => $aluno->numero_aluno,
                "foto"          => $aluno->foto,
                "data_nascimento"=> $aluno->data_nascimento,
            ],
            "matricula" => $matricula,
            "pagamentos"=> [
                "lista"       => $pagamentos,
                "total_pago"  => $totalPago,
                "total_pendente" => $totalPendente,
                "valor_em_divida"=> $valorEmDivida,
            ],
            "notas"     => [
                "lista"       => $notas,
                "media_geral" => $mediaGeral,
            ],
        ]);
    }
}
