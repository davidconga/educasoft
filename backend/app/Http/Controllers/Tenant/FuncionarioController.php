<?php
namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\FolhaPagamento;
use App\Models\Tenant\Funcionario;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FuncionarioController extends Controller {
    public function index(Request $request) {
        $q = Funcionario::with('professor.user');
        if ($request->search) {
            $q->where(function ($x) use ($request) {
                $term = '%'.$request->search.'%';
                $x->where('nome', 'like', $term)
                  ->orWhere('bi', 'like', $term)
                  ->orWhere('nif', 'like', $term)
                  ->orWhere('email', 'like', $term)
                  ->orWhere('cargo', 'like', $term);
            });
        }
        if ($request->estado)        $q->where('estado', $request->estado);
        if ($request->cargo)         $q->where('cargo', $request->cargo);
        if ($request->departamento)  $q->where('departamento', $request->departamento);
        if ($request->tipo_contrato) $q->where('tipo_contrato', $request->tipo_contrato);

        return response()->json($q->orderBy('nome')->paginate($request->per_page ?? 50));
    }

    public function show(Funcionario $funcionario) {
        return response()->json($funcionario->load('folhas', 'professor.user'));
    }

    public function store(Request $request) {
        $data = $this->validar($request);
        $funcionario = Funcionario::create($data);
        return response()->json([
            'message' => 'Funcionário criado.',
            'funcionario' => $funcionario,
        ], 201);
    }

    public function update(Request $request, Funcionario $funcionario) {
        $data = $this->validar($request, $funcionario->id);
        $funcionario->update($data);
        return response()->json([
            'message' => 'Funcionário actualizado.',
            'funcionario' => $funcionario->fresh(),
        ]);
    }

    public function destroy(Funcionario $funcionario) {
        if ($funcionario->foto) Storage::disk('public')->delete($funcionario->foto);
        $funcionario->delete();
        return response()->json(['message' => 'Funcionário removido.']);
    }

    public function uploadFoto(Request $request, Funcionario $funcionario) {
        $request->validate(['foto' => 'required|image|max:2048']);
        if ($funcionario->foto) Storage::disk('public')->delete($funcionario->foto);
        $path = $request->file('foto')->store('fotos/funcionarios', 'public');
        $funcionario->update(['foto' => $path]);
        return response()->json(['foto_url' => "/storage/{$path}"]);
    }

    /** Lista professores que ainda não têm registo de funcionário associado. */
    public function professoresSemFuncionario(Request $request) {
        $professores = \App\Models\Tenant\Professor::with('user')
            ->whereDoesntHave('funcionario')
            ->whereHas('user')
            ->get()
            ->map(fn($p) => [
                'id'                => $p->id,
                'numero_professor'  => $p->numero_professor,
                'nome'              => $p->user?->nome,
                'email'             => $p->user?->email,
                'telefone'          => $p->user?->telefone,
                'foto'              => $p->foto ?? $p->user?->foto,
                'especialidade'     => $p->especialidade,
                'habilitacoes'      => $p->habilitacoes,
                'data_admissao'     => $p->data_admissao,
            ])
            ->sortBy('nome')
            ->values();
        return response()->json($professores);
    }

    /** Cria um Funcionario a partir de um Professor existente, copiando os dados pessoais. */
    public function criarDeProfessor(Request $request) {
        $request->validate([
            'professor_id'  => 'required|exists:professores,id',
            'cargo'         => 'nullable|string|max:100',
            'departamento'  => 'nullable|string|max:100',
            'tipo_contrato' => 'nullable|in:efectivo,temporario,estagiario,tarefeiro',
            'salario_base'  => 'required|numeric|min:0',
        ]);

        $professor = \App\Models\Tenant\Professor::with('user')->findOrFail($request->professor_id);

        if (Funcionario::where('professor_id', $professor->id)->exists()) {
            return response()->json(['message' => 'Este professor já tem um funcionário associado.'], 422);
        }

        $func = Funcionario::create([
            'professor_id'   => $professor->id,
            'user_id'        => $professor->user_id,
            'nome'           => $professor->user?->nome ?? 'Professor',
            'email'          => $professor->user?->email,
            'telefone'       => $professor->user?->telefone,
            'foto'           => $professor->foto ?? $professor->user?->foto,
            'cargo'          => $request->cargo ?: 'Professor',
            'departamento'   => $request->departamento,
            'tipo_contrato'  => $request->tipo_contrato ?: 'efectivo',
            'data_admissao'  => $professor->data_admissao ?? now()->toDateString(),
            'salario_base'   => $request->salario_base,
            'estado'         => 'activo',
            'observacao'     => 'Importado do registo de Professor #' . $professor->id,
        ]);

        return response()->json([
            'message'     => 'Funcionário criado a partir do professor.',
            'funcionario' => $func->fresh()->load('professor.user'),
        ], 201);
    }

    public function dashboard() {
        $hoje = Carbon::now();
        $inicioMes = $hoje->copy()->startOfMonth();

        $total      = Funcionario::count();
        $activos    = Funcionario::where('estado', 'activo')->count();
        $suspensos  = Funcionario::where('estado', 'suspenso')->count();
        $demitidos  = Funcionario::where('estado', 'demitido')->count();

        $admissoesMes = Funcionario::where('data_admissao', '>=', $inicioMes)->count();

        $aniversariantesMes = Funcionario::whereNotNull('data_nascimento')
            ->whereMonth('data_nascimento', $hoje->month)
            ->orderByRaw('DAY(data_nascimento) ASC')
            ->get(['id', 'nome', 'foto', 'cargo', 'data_nascimento']);

        $porCargo = Funcionario::where('estado', 'activo')
            ->selectRaw('cargo, COUNT(*) as total')
            ->groupBy('cargo')
            ->orderByDesc('total')
            ->get();

        $porDepartamento = Funcionario::where('estado', 'activo')
            ->whereNotNull('departamento')
            ->selectRaw('departamento, COUNT(*) as total')
            ->groupBy('departamento')
            ->orderByDesc('total')
            ->get();

        $folhasMes = FolhaPagamento::where('mes', $hoje->month)->where('ano', $hoje->year)->get();
        $totalSalariosMes = (float) $folhasMes->sum('liquido');
        $folhasPagas      = $folhasMes->where('estado', 'paga')->count();
        $folhasPendentes  = $folhasMes->whereIn('estado', ['rascunho', 'processada'])->count();

        return response()->json([
            'total'              => $total,
            'activos'            => $activos,
            'suspensos'          => $suspensos,
            'demitidos'          => $demitidos,
            'admissoes_mes'      => $admissoesMes,
            'aniversariantes_mes'=> $aniversariantesMes,
            'por_cargo'          => $porCargo,
            'por_departamento'   => $porDepartamento,
            'folha_mes'          => [
                'mes'        => $hoje->month,
                'ano'        => $hoje->year,
                'total'      => $folhasMes->count(),
                'pagas'      => $folhasPagas,
                'pendentes'  => $folhasPendentes,
                'valor_total'=> $totalSalariosMes,
            ],
            'cargos_distintos'   => Funcionario::distinct()->pluck('cargo')->filter()->values(),
            'departamentos'      => Funcionario::distinct()->pluck('departamento')->filter()->values(),
        ]);
    }

    private function validar(Request $request, $id = null): array {
        return $request->validate([
            'nome'           => 'required|string|max:255',
            'bi'             => 'nullable|string|max:30',
            'nif'            => 'nullable|string|max:30',
            'telefone'       => 'nullable|string|max:30',
            'email'          => 'nullable|email|max:255',
            'morada'         => 'nullable|string|max:255',
            'genero'         => 'nullable|in:masculino,feminino,outro',
            'data_nascimento'=> 'nullable|date',
            'naturalidade'   => 'nullable|string|max:100',
            'estado_civil'   => 'nullable|string|max:30',
            'cargo'          => 'required|string|max:100',
            'departamento'   => 'nullable|string|max:100',
            'tipo_contrato'  => 'nullable|in:efectivo,temporario,estagiario,tarefeiro',
            'data_admissao'  => 'required|date',
            'data_fim'       => 'nullable|date|after_or_equal:data_admissao',
            'salario_base'   => 'required|numeric|min:0',
            'iban'           => 'nullable|string|max:50',
            'banco'          => 'nullable|string|max:100',
            'estado'         => 'nullable|in:activo,suspenso,demitido,reformado',
            'data_demissao'  => 'nullable|date',
            'motivo_demissao'=> 'nullable|string|max:255',
            'observacao'     => 'nullable|string',
            'user_id'        => 'nullable|exists:users,id',
        ]);
    }
}
