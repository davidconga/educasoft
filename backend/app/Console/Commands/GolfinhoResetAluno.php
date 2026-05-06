<?php
namespace App\Console\Commands;

use App\Models\Central\Escola;
use App\Models\Tenant\Aluno;
use Illuminate\Console\Command;
use Stancl\Tenancy\Facades\Tenancy;

/**
 * Limpa a flag `dados_academicos_verificados_em` de um aluno
 * para forçar a reabertura do modal de verificação académica.
 *
 * Útil para testar o fluxo várias vezes com o mesmo aluno.
 */
class GolfinhoResetAluno extends Command {
    protected $signature = 'golfinho:reset-aluno {aluno_id : ID do aluno no tenant Golfinho}';
    protected $description = 'Limpa a flag de verificação académica para forçar reabertura do modal';

    public function handle(): int {
        $alunoId = (int) $this->argument('aluno_id');

        $escola = Escola::where('codigo', 'golfinho')->first();
        if (!$escola) { $this->error('Escola golfinho não encontrada.'); return 1; }

        Tenancy::initialize($escola);

        try {
            $aluno = Aluno::with('user')->find($alunoId);
            if (!$aluno) {
                $this->error("Aluno #{$alunoId} não existe no tenant golfinho.");
                Tenancy::end();
                return 1;
            }

            $antes = $aluno->dados_academicos_verificados_em;
            $aluno->update(['dados_academicos_verificados_em' => null]);

            $this->info("✓ Aluno #{$aluno->id} — {$aluno->user->nome}");
            $this->line("  Antes: " . ($antes ?? '(já era null)'));
            $this->line("  Agora: null — modal vai abrir na próxima selecção.");
        } finally {
            Tenancy::end();
        }
        return 0;
    }
}
