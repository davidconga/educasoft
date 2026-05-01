<?php
namespace App\Http\Controllers\Tenant;
use App\Http\Controllers\Controller;
use App\Models\Tenant\PresencaProfessor;
use App\Models\Tenant\Horario;
use Illuminate\Http\Request;

class PresencaProfessorController extends Controller {

    private static array $DIA_MAP = [
        1 => 'segunda', 2 => 'terca', 3 => 'quarta',
        4 => 'quinta',  5 => 'sexta', 6 => 'sabado', 7 => 'domingo',
    ];

    private function minutosEntre(string $inicio, string $fim): int {
        [$hi, $mi] = array_map('intval', explode(':', $inicio));
        [$hf, $mf] = array_map('intval', explode(':', $fim));
        return max(0, ($hf * 60 + $mf) - ($hi * 60 + $mi));
    }

    private function hhmm(string $t): string {
        return substr($t, 0, 5);
    }

    /** GET /presencas/professores?data=YYYY-MM-DD */
    public function index(Request $request) {
        $request->validate(['data' => 'required|date']);

        $diaN    = (int) date('N', strtotime($request->data));
        $diaSem  = self::$DIA_MAP[$diaN] ?? null;

        $horarios = $diaSem
            ? Horario::with('professor.user', 'disciplina', 'turma')
                ->where('dia_semana', $diaSem)
                ->orderBy('hora_inicio')
                ->get()
            : collect();

        $presencas = PresencaProfessor::where('data', $request->data)
            ->whereNotNull('horario_id')
            ->get()
            ->keyBy('horario_id');

        $aulas = $horarios->map(function ($h) use ($presencas) {
            $p = $presencas->get($h->id);
            return [
                'horario_id'       => $h->id,
                'professor_id'     => $h->professor_id,
                'professor_nome'   => $h->professor?->user?->nome,
                'professor_numero' => $h->professor?->numero_professor,
                'disciplina'       => $h->disciplina?->nome,
                'turma'            => $h->turma?->nome,
                'hora_inicio'      => $h->hora_inicio,
                'hora_fim'         => $h->hora_fim,
                'minutos'          => $this->minutosEntre($h->hora_inicio, $h->hora_fim),
                'estado'           => $p?->estado ?? 'presente',
                'observacao'       => $p?->observacao ?? '',
            ];
        })->values();

        return response()->json([
            'data'       => $request->data,
            'dia_semana' => $diaSem,
            'aulas'      => $aulas,
        ]);
    }

    /** POST /presencas/professores/bulk */
    public function storeBulk(Request $request) {
        $request->validate([
            'data'               => 'required|date',
            'presencas'          => 'required|array',
            'presencas.*.professor_id' => 'required|exists:professores,id',
            'presencas.*.horario_id'   => 'required|exists:horarios,id',
            'presencas.*.estado'       => 'required|in:presente,falta_justificada,falta_injustificada',
        ]);

        foreach ($request->presencas as $item) {
            $estado    = $item['estado'];
            $hiInicio  = $item['hora_inicio'] ?? null;
            $hiFim     = $item['hora_fim']    ?? null;
            $minutos   = ($estado === 'presente' && $hiInicio && $hiFim)
                ? $this->minutosEntre($hiInicio, $hiFim)
                : 0;

            PresencaProfessor::updateOrCreate(
                ['professor_id' => $item['professor_id'], 'horario_id' => $item['horario_id'], 'data' => $request->data],
                [
                    'estado'             => $estado,
                    'hora_inicio'        => $hiInicio,
                    'hora_fim'           => $hiFim,
                    'minutos_lecionados' => $minutos,
                    'observacao'         => $item['observacao'] ?? null,
                ]
            );
        }

        return response()->json(['message' => count($request->presencas) . ' presenças registadas.']);
    }

    /** GET /presencas/professores/relatorio?data_inicio=Y&data_fim=Z */
    public function relatorio(Request $request) {
        $request->validate(['data_inicio' => 'required|date', 'data_fim' => 'required|date']);

        $presencas = PresencaProfessor::with('professor.user')
            ->whereBetween('data', [$request->data_inicio, $request->data_fim])
            ->whereNotNull('horario_id')
            ->get()
            ->groupBy('professor_id');

        $rows = $presencas->map(function ($lista, $profId) {
            $prof      = $lista->first()?->professor;
            $total     = $lista->count();
            $presentes = $lista->where('estado', 'presente')->count();
            return [
                'professor_id'      => $profId,
                'nome'              => $prof?->user?->nome,
                'numero'            => $prof?->numero_professor,
                'total_aulas'       => $total,
                'presentes'         => $presentes,
                'faltas_just'       => $lista->where('estado', 'falta_justificada')->count(),
                'faltas_injust'     => $lista->where('estado', 'falta_injustificada')->count(),
                'minutos_lecionados'=> (int) $lista->sum('minutos_lecionados'),
                'percentagem'       => $total > 0 ? round($presentes / $total * 100, 1) : null,
            ];
        })->sortBy('nome')->values();

        // add ord
        $rows = $rows->values()->map(function ($r, $i) {
            return array_merge(['ord' => $i + 1], $r);
        });

        return response()->json([
            'professores' => $rows,
            'data_inicio' => $request->data_inicio,
            'data_fim'    => $request->data_fim,
        ]);
    }
}
