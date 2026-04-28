<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\PresencaProfessor;
use App\Models\Tenant\Professor;
use Illuminate\Http\Request;

class PresencaProfessorController extends Controller {

    /** GET /presencas/professores?data=YYYY-MM-DD */
    public function index(Request $request) {
        $request->validate(['data' => 'required|date']);

        $professores = Professor::with('user')->get()->sortBy('user.nome')->values();
        $presencas   = PresencaProfessor::where('data', $request->data)->get()->keyBy('professor_id');

        $rows = $professores->map(function ($prof, $idx) use ($presencas) {
            $p = $presencas->get($prof->id);
            return [
                'ord'          => $idx + 1,
                'professor_id' => $prof->id,
                'nome'         => $prof->user?->nome,
                'numero'       => $prof->numero_professor,
                'estado'       => $p?->estado ?? 'presente',
                'observacao'   => $p?->observacao ?? '',
            ];
        });

        return response()->json(['professores' => $rows]);
    }

    /** POST /presencas/professores/bulk */
    public function storeBulk(Request $request) {
        $request->validate([
            'data'      => 'required|date',
            'presencas' => 'required|array',
        ]);

        foreach ($request->presencas as $item) {
            PresencaProfessor::updateOrCreate(
                ['professor_id' => $item['professor_id'], 'data' => $request->data],
                ['estado' => $item['estado'] ?? 'presente', 'observacao' => $item['observacao'] ?? null]
            );
        }

        return response()->json(['message' => count($request->presencas) . ' presenças registadas.']);
    }

    /** GET /presencas/professores/relatorio?data_inicio=Y&data_fim=Z */
    public function relatorio(Request $request) {
        $request->validate(['data_inicio' => 'required|date', 'data_fim' => 'required|date']);

        $professores = Professor::with('user')->get()->sortBy('user.nome')->values();
        $presencas   = PresencaProfessor::whereBetween('data', [$request->data_inicio, $request->data_fim])
            ->get()->groupBy('professor_id');

        $rows = $professores->map(function ($prof, $idx) use ($presencas) {
            $lista     = $presencas->get($prof->id, collect());
            $total     = $lista->count();
            $presentes = $lista->where('estado', 'presente')->count();
            return [
                'ord'           => $idx + 1,
                'professor_id'  => $prof->id,
                'nome'          => $prof->user?->nome,
                'numero'        => $prof->numero_professor,
                'total_dias'    => $total,
                'presentes'     => $presentes,
                'faltas_just'   => $lista->where('estado', 'falta_justificada')->count(),
                'faltas_injust' => $lista->where('estado', 'falta_injustificada')->count(),
                'percentagem'   => $total > 0 ? round($presentes / $total * 100, 1) : null,
            ];
        });

        return response()->json([
            'professores' => $rows,
            'data_inicio' => $request->data_inicio,
            'data_fim'    => $request->data_fim,
        ]);
    }
}
