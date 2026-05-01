<?php
namespace App\Console\Commands;

use App\Jobs\EnviarLembreteEmailJob;
use App\Jobs\EnviarLembreteSmsJob;
use App\Jobs\TenantBootstrapper;
use App\Models\Central\Escola;
use App\Models\Tenant\LembreteConfig;
use App\Models\Tenant\LembretePagamento;
use App\Services\Tenant\LembreteScheduler;
use Illuminate\Console\Command;

class LembretesEnviarCommand extends Command {
    protected $signature   = "lembretes:enviar {--tenant= : Código da escola; omitir para todas} {--apenas-gerar : Não despacha jobs, só gera registos}";
    protected $description = "Gera e despacha lembretes de pagamento de propina (email/SMS) para escolas activas.";

    public function handle(): int {
        $escolas = $this->option("tenant")
            ? Escola::where("codigo", $this->option("tenant"))->where("ativo", true)->get()
            : Escola::where("ativo", true)->get();

        if ($escolas->isEmpty()) {
            $this->warn("Nenhuma escola activa encontrada.");
            return self::SUCCESS;
        }

        $totalCriados = 0;
        $totalDespachados = 0;
        $totalFalhas = 0;

        foreach ($escolas as $escola) {
            $this->line("→ Processando <info>{$escola->codigo}</info> ({$escola->nome})");
            try {
                TenantBootstrapper::run($escola->codigo, function () use ($escola, &$totalCriados, &$totalDespachados) {
                    $cfg = LembreteConfig::current();
                    if (!$cfg->email_activo && !$cfg->sms_activo) {
                        $this->warn("   Lembretes desactivados nesta escola — ignorando.");
                        return;
                    }

                    $r = LembreteScheduler::fromConfig()->gerar();
                    $totalCriados += $r["criados"];
                    $this->line("   Candidatos: {$r['candidatos']} · novos: {$r['criados']} · já existiam: {$r['ja_existiam']}");

                    if ($this->option("apenas-gerar")) return;

                    $pendentes = LembretePagamento::where("status", "pendente")->get();
                    foreach ($pendentes as $l) {
                        if ($l->canal === "email") {
                            EnviarLembreteEmailJob::dispatch($escola->codigo, $l->id);
                        } else {
                            EnviarLembreteSmsJob::dispatch($escola->codigo, $l->id);
                        }
                        $totalDespachados++;
                    }
                });
            } catch (\Throwable $e) {
                $totalFalhas++;
                $this->error("   Erro em {$escola->codigo}: " . $e->getMessage());
            }
        }

        $this->info("Concluído. Novos lembretes: {$totalCriados} · jobs despachados: {$totalDespachados} · escolas com erro: {$totalFalhas}");
        return self::SUCCESS;
    }
}
