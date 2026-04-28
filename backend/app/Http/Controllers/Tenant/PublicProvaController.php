<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\FolhaProva;
use Illuminate\Http\Request;

class PublicProvaController extends Controller
{
    public function show(Request $request, string $codigo)
    {
        $escola = $request->attributes->get('escola');

        $folha = FolhaProva::where('codigo', $codigo)->first();

        if (!$folha) {
            return response()->json(['valido' => false, 'message' => 'Código não encontrado. Este documento pode não ser oficial.'], 404);
        }

        return response()->json([
            'valido'      => true,
            'codigo'      => $folha->codigo,
            'disciplina'  => $folha->disciplina,
            'periodo'     => $folha->periodo,
            'data_prova'  => $folha->data_prova,
            'classe'      => $folha->classe,
            'turma'       => $folha->turma,
            'professor'   => $folha->professor,
            'ano_letivo'  => $folha->ano_letivo,
            'emitido_em'  => $folha->created_at,
            'escola'      => $escola ? [
                'nome'     => $escola->nome,
                'logo'     => $escola->logo,
                'endereco' => $escola->endereco,
                'telefone' => $escola->telefone,
            ] : null,
        ]);
    }

    public function registar(Request $request)
    {
        $request->validate([
            'folhas'              => 'required|array|min:1|max:60',
            'folhas.*.codigo'     => 'required|string|max:20',
            'folhas.*.disciplina' => 'required|string',
        ]);

        $now = now();
        $rows = array_map(fn($f) => array_merge([
            'disciplina' => '',
            'periodo'    => null,
            'data_prova' => null,
            'classe'     => null,
            'turma'      => null,
            'professor'  => null,
            'ano_letivo' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ], $f), $request->folhas);

        // Ignora duplicados (se re-imprimir)
        FolhaProva::upsert($rows, ['codigo'], ['disciplina','periodo','data_prova','classe','turma','professor','ano_letivo','updated_at']);

        return response()->json(['message' => count($rows) . ' folha(s) registada(s).', 'count' => count($rows)]);
    }
}
