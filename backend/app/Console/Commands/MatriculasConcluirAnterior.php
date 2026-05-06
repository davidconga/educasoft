<?php
namespace App\Console\Commands;

use App\Models\Central\Escola;
use App\Models\Tenant\Matricula;
use Illuminate\Console\Command;
use Stancl\Tenancy\Facades\Tenancy;

/**
 * Marca como `concluida` todas as matriculas cujo ano_letivo
 * NÃO seja o lectivo activo (por defeito 2025-2026), e estejam
 * em estados ainda em curso (activa, confirmada, pendente).
 *
 * Por defeito corre em DRY-RUN. Usar --force para gravar.
 */
class MatriculasConcluirAnterior extends Command {
    protected $signature = 'matriculas:concluir-anterior
        {--ano=2025-2026 : Ano lectivo a manter activo (regex tolerante: 2025[-/ ]2026)}
        {--tenant= : Código da escola (omitir = todas)}
        {--force : Executa de facto (sem isto, é dry-run)}';
    protected $description = 'Marca como concluida as matriculas que não pertençam ao ano lectivo activo';

    public function handle(): int {
        $dry  = !$this->option('force');
        $ano  = $this->option('ano');
        $cod  = $this->option('tenant');

        $this->info($dry ? '🔍 DRY-RUN (não escreve)' : '⚠️  EXECUÇÃO REAL');
        $this->line("Ano lectivo activo: {$ano}");
        $this->newLine();

        $escolas = $cod
            ? Escola::where('codigo', $cod)->get()
            : Escola::all();

        if ($escolas->isEmpty()) { $this->error('Nenhuma escola encontrada.'); return 1; }

        // Regex tolerante: aceita "2025-2026", "2025/2026", "2025 2026"
        [$y1, $y2] = explode('-', $ano);
        $regex = "/{$y1}[-\\/ ]{$y2}/";

        $totalGeral = 0;
        foreach ($escolas as $escola) {
            $this->line("🏫 {$escola->codigo} — {$escola->nome}");
            try {
                Tenancy::initialize($escola);

                $candidatas = Matricula::whereIn('status', ['activa', 'confirmada', 'pendente'])->get();
                $aFechar = $candidatas->filter(fn($m) => !preg_match($regex, (string) $m->ano_letivo));

                if ($aFechar->isEmpty()) {
                    $this->line("   ✓ nada a fazer ({$candidatas->count()} matriculas em curso, todas {$ano})");
                    Tenancy::end();
                    continue;
                }

                $porAno = $aFechar->groupBy('ano_letivo')->map->count()->sortKeys();
                foreach ($porAno as $a => $n) {
                    $this->line("   • " . ($a ?: '(sem ano)') . " → {$n} matricula(s)");
                }

                if (!$dry) {
                    $ids = $aFechar->pluck('id');
                    Matricula::whereIn('id', $ids)->update(['status' => 'concluida']);
                    $this->info("   ✓ {$aFechar->count()} matriculas marcadas como `concluida`");
                } else {
                    $this->comment("   → {$aFechar->count()} matriculas seriam marcadas como `concluida`");
                }

                $totalGeral += $aFechar->count();
                Tenancy::end();
            } catch (\Throwable $e) {
                $this->error("   ✗ falhou: " . $e->getMessage());
                try { Tenancy::end(); } catch (\Throwable $_) {}
            }
        }

        $this->newLine();
        $this->info(($dry ? '[DRY-RUN] ' : '') . "Total: {$totalGeral} matricula(s) " . ($dry ? 'seriam' : 'foram') . ' marcadas como concluida.');
        if ($dry) $this->warn('Re-executa com --force para gravar.');
        return 0;
    }
}
