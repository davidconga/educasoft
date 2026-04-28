<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\Presenca;
use App\Models\Tenant\Matricula;
use Illuminate\Http\Request;

class PresencaController extends Controller {

    /** GET /presencas?turma_id=X&disciplina_id=Y&data=YYYY-MM-DD */
    public function index(Request $request) {
        $request->validate([
            'turma_id' => 'required|exists:turmas,id',
            'data'     => 'required|date',
        ]);

        $alunos = Matricula::with('aluno.user')
            ->where('turma_id', $request->turma_id)
            ->where('status', 'activa')
            ->get()
            ->sortBy('aluno.user.nome')
            ->values();

        $discId    = $request->disciplina_id ?: null;
        $presencas = Presenca::where('turma_id', $request->turma_id)
            ->where('data', $request->data)
            ->when($discId,
                fn($q) => $q->where('disciplina_id', $discId),
                fn($q) => $q->whereNull('disciplina_id')
            )
            ->get()
            ->keyBy('aluno_id');

        $rows = $alunos->map(function ($m, $idx) use ($presencas) {
            $p = $presencas->get($m->aluno_id);
            return [
                'ord'        => $idx + 1,
                'aluno_id'   => $m->aluno_id,
                'nome'       => $m->aluno?->user?->nome,
                'estado'     => $p?->estado ?? 'presente',
                'observacao' => $p?->observacao ?? '',
            ];
        });

        return response()->json(['alunos' => $rows]);
    }

    /** POST /presencas/bulk */
    public function storeBulk(Request $request) {
        $request->validate([
            'turma_id'  => 'required|exists:turmas,id',
            'data'      => 'required|date',
            'presencas' => 'required|array',
        ]);

        $discId = $request->disciplina_id ?: null;

        foreach ($request->presencas as $item) {
            $existing = Presenca::where('aluno_id', $item['aluno_id'])
                ->where('turma_id', $request->turma_id)
                ->where('data', $request->data)
                ->when($discId,
                    fn($q) => $q->where('disciplina_id', $discId),
                    fn($q) => $q->whereNull('disciplina_id')
                )
                ->first();

            $values = [
                'estado'     => $item['estado'] ?? 'presente',
                'observacao' => $item['observacao'] ?? null,
            ];

            if ($existing) {
                $existing->update($values);
            } else {
                Presenca::create(array_merge($values, [
                    'aluno_id'      => $item['aluno_id'],
                    'turma_id'      => $request->turma_id,
                    'disciplina_id' => $discId,
                    'data'          => $request->data,
                ]));
            }
        }

        return response()->json(['message' => count($request->presencas) . ' presenças registadas.']);
    }

    /** GET /presencas/relatorio?turma_id=X&data_inicio=Y&data_fim=Z&disciplina_id=W */
    public function relatorio(Request $request) {
        $request->validate([
            'turma_id'    => 'required|exists:turmas,id',
            'data_inicio' => 'required|date',
            'data_fim'    => 'required|date',
        ]);

        $alunos = Matricula::with('aluno.user')
            ->where('turma_id', $request->turma_id)
            ->where('status', 'activa')
            ->get()
            ->sortBy('aluno.user.nome')
            ->values();

        $discId    = $request->disciplina_id ?: null;
        $presencas = Presenca::where('turma_id', $request->turma_id)
            ->whereBetween('data', [$request->data_inicio, $request->data_fim])
            ->when($discId, fn($q) => $q->where('disciplina_id', $discId))
            ->get()
            ->groupBy('aluno_id');

        $rows = $alunos->map(function ($m, $idx) use ($presencas) {
            $lista     = $presencas->get($m->aluno_id, collect());
            $total     = $lista->count();
            $presentes = $lista->where('estado', 'presente')->count();
            $fj        = $lista->where('estado', 'falta_justificada')->count();
            $fi        = $lista->where('estado', 'falta_injustificada')->count();
            return [
                'ord'           => $idx + 1,
                'aluno_id'      => $m->aluno_id,
                'nome'          => $m->aluno?->user?->nome,
                'total_aulas'   => $total,
                'presentes'     => $presentes,
                'faltas_just'   => $fj,
                'faltas_injust' => $fi,
                'percentagem'   => $total > 0 ? round($presentes / $total * 100, 1) : null,
            ];
        });

        return response()->json([
            'alunos'      => $rows,
            'data_inicio' => $request->data_inicio,
            'data_fim'    => $request->data_fim,
        ]);
    }
}
