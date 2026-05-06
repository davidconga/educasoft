<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Funcionario;
use App\Models\Tenant\PresencaFuncionario;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PresencaFuncionarioController extends Controller {

    public function index(Request $request) {
        $q = PresencaFuncionario::with('funcionario');
        if ($request->funcionario_id) $q->where('funcionario_id', $request->funcionario_id);
        if ($request->data)           $q->whereDate('data', $request->data);
        if ($request->desde)          $q->where('data', '>=', $request->desde);
        if ($request->ate)            $q->where('data', '<=', $request->ate);
        if ($request->estado)         $q->where('estado', $request->estado);
        if ($request->mes && $request->ano) {
            $q->whereYear('data', $request->ano)->whereMonth('data', $request->mes);
        }
        return response()->json($q->orderByDesc('data')->orderBy('funcionario_id')->paginate($request->per_page ?? 200));
    }

    public function store(Request $request) {
        $data = $this->validar($request);
        $data['horas_trabalhadas'] = $this->calcularHoras($data);
        $data['registado_por'] = $request->attributes->get('auth_user')?->nome;
        $p = PresencaFuncionario::updateOrCreate(
            ['funcionario_id' => $data['funcionario_id'], 'data' => $data['data']],
            $data
        );
        return response()->json(['message' => 'Presença registada.', 'presenca' => $p->load('funcionario')], 201);
    }

    public function update(Request $request, PresencaFuncionario $presenca) {
        $data = $this->validar($request, $presenca->id);
        $data['horas_trabalhadas'] = $this->calcularHoras($data);
        $presenca->update($data);
        return response()->json(['message' => 'Presença actualizada.', 'presenca' => $presenca->fresh()->load('funcionario')]);
    }

    public function destroy(PresencaFuncionario $presenca) {
        $presenca->delete();
        return response()->json(['message' => 'Presença eliminada.']);
    }

    /** POST /presencas-funcionarios/clock-in — regista entrada com hora actual. */
    public function clockIn(Request $request) {
        $request->validate(['funcionario_id' => 'required|exists:funcionarios,id']);
        $hoje = Carbon::today();
        $agora = Carbon::now();

        $existente = PresencaFuncionario::where('funcionario_id', $request->funcionario_id)
            ->whereDate('data', $hoje)->first();
        if ($existente && $existente->entrada) {
            return response()->json(['message' => 'Entrada já registada às ' . $existente->entrada], 422);
        }

        $p = PresencaFuncionario::updateOrCreate(
            ['funcionario_id' => $request->funcionario_id, 'data' => $hoje],
            [
                'entrada'      => $agora->format('H:i:s'),
                'estado'       => 'presente',
                'registado_por'=> $request->attributes->get('auth_user')?->nome,
            ]
        );
        return response()->json(['message' => "Entrada registada às {$p->entrada}", 'presenca' => $p->load('funcionario')]);
    }

    /** POST /presencas-funcionarios/clock-out — regista saída com hora actual. */
    public function clockOut(Request $request) {
        $request->validate(['funcionario_id' => 'required|exists:funcionarios,id']);
        $hoje = Carbon::today();

        $p = PresencaFuncionario::where('funcionario_id', $request->funcionario_id)
            ->whereDate('data', $hoje)->first();
        if (!$p || !$p->entrada) {
            return response()->json(['message' => 'Sem entrada registada hoje. Marca entrada primeiro.'], 422);
        }
        if ($p->saida) {
            return response()->json(['message' => 'Saída já registada às ' . $p->saida], 422);
        }

        $p->saida = Carbon::now()->format('H:i:s');
        $p->horas_trabalhadas = $this->calcularHoras($p->only(['entrada', 'saida']));
        $p->save();

        return response()->json(['message' => "Saída registada às {$p->saida} ({$p->horas_trabalhadas}h)", 'presenca' => $p->fresh()->load('funcionario')]);
    }

    /** GET /presencas-funcionarios/dashboard — KPIs de hoje/mês. */
    public function dashboard(Request $request) {
        $hoje = Carbon::today();

        $hojePresencas = PresencaFuncionario::whereDate('data', $hoje)->get();
        $totalActivos  = Funcionario::where('estado', 'activo')->count();

        $presentesHoje = $hojePresencas->whereIn('estado', ['presente', 'atrasado'])->count();
        $atrasadosHoje = $hojePresencas->where('estado', 'atrasado')->count();
        $ausentesHoje  = $hojePresencas->where('estado', 'ausente')->count();
        $semRegistoHoje= max(0, $totalActivos - $hojePresencas->count());

        $mes = $request->mes ?? $hoje->month;
        $ano = $request->ano ?? $hoje->year;
        $mesPresencas = PresencaFuncionario::whereYear('data', $ano)->whereMonth('data', $mes)->get();

        $faltasMes      = $mesPresencas->where('estado', 'ausente')->count();
        $atrasosMes     = $mesPresencas->where('estado', 'atrasado')->count();
        $justificadasMes= $mesPresencas->where('estado', 'falta_justificada')->count();
        $totalHorasMes  = (float) $mesPresencas->sum('horas_trabalhadas');

        return response()->json([
            'hoje' => [
                'data'         => $hoje->toDateString(),
                'total_activos'=> $totalActivos,
                'presentes'    => $presentesHoje,
                'atrasados'    => $atrasadosHoje,
                'ausentes'     => $ausentesHoje,
                'sem_registo'  => $semRegistoHoje,
            ],
            'mes' => [
                'mes'          => (int)$mes,
                'ano'          => (int)$ano,
                'faltas'       => $faltasMes,
                'atrasos'      => $atrasosMes,
                'justificadas' => $justificadasMes,
                'total_horas'  => $totalHorasMes,
            ],
        ]);
    }

    /** GET /presencas-funcionarios/grelha-mes?mes=X&ano=Y — vista matricial: linha=funcionario, coluna=dia. */
    public function grelhaMes(Request $request) {
        $request->validate([
            'mes' => 'required|integer|between:1,12',
            'ano' => 'required|integer|min:2020|max:2100',
        ]);
        $mes = (int)$request->mes;
        $ano = (int)$request->ano;
        $diasNoMes = Carbon::create($ano, $mes, 1)->daysInMonth;

        $funcionarios = Funcionario::where('estado', 'activo')->orderBy('nome')->get(['id', 'nome', 'cargo']);
        $presencas = PresencaFuncionario::whereYear('data', $ano)->whereMonth('data', $mes)
            ->whereIn('funcionario_id', $funcionarios->pluck('id'))
            ->get()
            ->groupBy('funcionario_id');

        $grelha = $funcionarios->map(function ($f) use ($presencas, $diasNoMes, $mes, $ano) {
            $byDay = ($presencas[$f->id] ?? collect())->keyBy(fn($p) => Carbon::parse($p->data)->day);
            $dias = [];
            for ($d = 1; $d <= $diasNoMes; $d++) {
                $p = $byDay->get($d);
                $dias[$d] = $p ? [
                    'estado'   => $p->estado,
                    'entrada'  => $p->entrada,
                    'saida'    => $p->saida,
                    'horas'    => $p->horas_trabalhadas,
                    'id'       => $p->id,
                ] : null;
            }
            $totHoras = ($presencas[$f->id] ?? collect())->sum('horas_trabalhadas');
            $faltas   = ($presencas[$f->id] ?? collect())->where('estado', 'ausente')->count();
            $atrasos  = ($presencas[$f->id] ?? collect())->where('estado', 'atrasado')->count();
            return [
                'id'      => $f->id,
                'nome'    => $f->nome,
                'cargo'   => $f->cargo,
                'dias'    => $dias,
                'totais'  => ['horas' => (float)$totHoras, 'faltas' => $faltas, 'atrasos' => $atrasos],
            ];
        });

        return response()->json([
            'mes'           => $mes,
            'ano'           => $ano,
            'dias_no_mes'   => $diasNoMes,
            'funcionarios'  => $grelha,
        ]);
    }

    /* Helpers */

    private function validar(Request $request, $id = null): array {
        return $request->validate([
            'funcionario_id' => 'required|exists:funcionarios,id',
            'data'           => 'required|date',
            'entrada'        => 'nullable|date_format:H:i,H:i:s',
            'saida'          => 'nullable|date_format:H:i,H:i:s',
            'estado'         => 'required|in:presente,ausente,atrasado,falta_justificada,ferias,baixa_medica,folga',
            'justificacao'   => 'nullable|string|max:500',
            'observacao'     => 'nullable|string|max:500',
        ]);
    }

    private function calcularHoras(array $data): ?float {
        if (empty($data['entrada']) || empty($data['saida'])) return null;
        $h1 = Carbon::createFromTimeString($data['entrada']);
        $h2 = Carbon::createFromTimeString($data['saida']);
        if ($h2->lt($h1)) return null;
        return round($h2->diffInMinutes($h1) / 60, 2);
    }
}
