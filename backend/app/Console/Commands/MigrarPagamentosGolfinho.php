<?php
namespace App\Console\Commands;

use App\Models\Central\Escola;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Facades\Tenancy;

/**
 * Migração diferencial de pagamentos da escola Golfinho.
 *
 * Source:  golfinho_source.movements (+ payments, alunos, services, months)
 * Destino: tenant `escola_golfinho`.pagamentos
 *
 * Chave: pagamentos.referencia = 'MOV-' + LPAD(movements.id, 8, '0')
 *
 * Por defeito corre em DRY-RUN. Usar --force para gravar.
 */
class MigrarPagamentosGolfinho extends Command {
    protected $signature = 'golfinho:migrar-pagamentos
        {--force : Executa de facto (sem isto, é dry-run)}
        {--limit=0 : Limitar nº de movements a processar (0 = sem limite)}';
    protected $description = 'Migração diferencial de pagamentos do source legado para o tenant Golfinho';

    private array $servicePropina   = [1, 8];                                 // → tipo='mensalidade'
    private array $serviceMatricula = [5, 6];                                 // → tipo='matricula'
    private array $statusMap = [
        2  => 'pago',
        1  => 'pendente',
        0  => 'pendente',
        3  => 'pendente',
        6  => 'vencido',
        -2 => 'cancelado',
    ];
    // Limitado aos valores do ENUM `metodo`: dinheiro, transferencia, multicaixa, referencia
    private array $formaPayMap = [
        1 => 'multicaixa',
        2 => 'dinheiro',
        3 => 'transferencia',
        4 => 'referencia',
        5 => 'transferencia',
    ];

    private function limparRef(?string $ref): ?string {
        if (!$ref) return null;
        $ref = trim($ref);
        // Não-referências: imagens base64, URLs longas, payloads de upload
        if (str_starts_with($ref, 'data:') || strlen($ref) > 100) return null;
        return $ref;
    }

    private function dataValida($d): ?string {
        if (!$d) return null;
        $s = is_string($d) ? $d : (string) $d;
        if (str_starts_with($s, '0000-00-00')) return null;
        return substr($s, 0, 10);
    }

    public function handle(): int {
        $dryRun = !$this->option('force');
        $limit  = (int) $this->option('limit');

        $this->info($dryRun ? '🔍 DRY-RUN (não escreve)' : '⚠️  EXECUÇÃO REAL');
        $this->newLine();

        // 1. Inicializar tenant
        $escola = Escola::where('codigo', 'golfinho')->first();
        if (!$escola) { $this->error('Escola golfinho não encontrada.'); return 1; }
        Tenancy::initialize($escola);

        // 2. Pré-carregar mapeamentos
        $this->line('📚 A carregar mapeamentos...');
        $alunosByNum    = DB::connection('tenant')->table('alunos')->pluck('id', 'numero_aluno')->toArray();
        $sourceAlunoNum = DB::connection('mysql')->table('golfinho_source.alunos')->pluck('num', 'id')->toArray();
        $mesesById      = DB::connection('tenant')->table('meses')->pluck('nome', 'id')->toArray();

        // payments → indexed by num_payment_id (lote). movement_id está sempre = 1 (lixo).
        // Cada lote tem 1 payment com aluno_id, form_payment_id e num_ref.
        $payments = DB::connection('mysql')->table('golfinho_source.payments as p')
            ->leftJoin('golfinho_source.alunos as a', 'a.id', '=', 'p.aluno_id')
            ->select('p.num_payment_id', 'a.num as aluno_num', 'p.form_payment_id', 'p.num_ref', 'p.hash')
            ->get()
            ->keyBy('num_payment_id');

        // referências já existentes no destino: ref → [id, updated_at]
        $existing = DB::connection('tenant')->table('pagamentos')
            ->where('referencia', 'like', 'MOV-%')
            ->select('id', 'referencia')
            ->get()
            ->keyBy('referencia');

        $this->line(sprintf('  · alunos novo:   %d', count($alunosByNum)));
        $this->line(sprintf('  · alunos source: %d', count($sourceAlunoNum)));
        $this->line(sprintf('  · meses:         %d', count($mesesById)));
        $this->line(sprintf('  · payments src:  %d', $payments->count()));
        $this->line(sprintf('  · refs MOV existentes: %d', $existing->count()));

        // 3. Iterar movements
        $stats = ['inserted' => 0, 'updated' => 0, 'skipped_aluno' => 0, 'skipped_status' => 0, 'skipped_zero' => 0];
        $skippedSamples = [];

        $q = DB::connection('mysql')->table('golfinho_source.movements')->orderBy('id');
        if ($limit > 0) $q->limit($limit);

        $totalCount = $limit > 0 ? $limit : DB::connection('mysql')->table('golfinho_source.movements')->count();
        $bar = $this->output->createProgressBar($totalCount);
        $bar->start();

        $q->chunk(2000, function ($rows) use (&$stats, &$skippedSamples, $alunosByNum, $sourceAlunoNum, $payments, $mesesById, $existing, $dryRun, $bar) {
            $insertBatch = [];
            foreach ($rows as $m) {
                $bar->advance();

                $tipoStatus = $this->statusMap[$m->status] ?? null;
                if ($tipoStatus === null) { $stats['skipped_status']++; continue; }

                // Resolver aluno_id no destino — via lote (num_payment_id), fallback reference_id
                $sp = $m->num_payment_id ? ($payments[$m->num_payment_id] ?? null) : null;
                $alunoNum = $sp?->aluno_num
                    ?? ($m->reference_id > 0 ? ($sourceAlunoNum[$m->reference_id] ?? null) : null);
                $alunoId = $alunoNum ? ($alunosByNum[$alunoNum] ?? null) : null;
                if (!$alunoId) {
                    $stats['skipped_aluno']++;
                    if (count($skippedSamples) < 5) $skippedSamples[] = "id={$m->id} status={$m->status} ref_id={$m->reference_id}";
                    continue;
                }

                $valor = round(((float) $m->qty) * ((float) $m->price) - ((float) ($m->desc ?? 0)), 2);
                if ($valor <= 0 && $tipoStatus !== 'cancelado') { $stats['skipped_zero']++; continue; }

                $tipo = in_array($m->service_id, $this->servicePropina, true) ? 'mensalidade'
                      : (in_array($m->service_id, $this->serviceMatricula, true) ? 'matricula' : 'emolumento');

                $mesNome = $mesesById[$m->month_id] ?? null;
                $mesRef  = $mesNome ? ($mesNome . ' ' . $m->ano) : null;

                $metodo  = $sp?->form_payment_id ? ($this->formaPayMap[$sp->form_payment_id] ?? 'dinheiro') : 'dinheiro';
                $numRef  = $this->limparRef($sp?->num_ref ?: null);

                $ref     = 'MOV-' . str_pad((string) $m->id, 8, '0', STR_PAD_LEFT);
                $loteId  = $m->num_payment_id ? ('LT-' . $m->num_payment_id) : null;

                $payload = [
                    'aluno_id'              => $alunoId,
                    'tipo'                  => $tipo,
                    'valor'                 => $valor,
                    'multa_valor'           => (float) ($m->multa ?? 0),
                    'mes_referencia'        => $mesRef,
                    'metodo'                => $metodo,
                    'num_referencia_externa'=> $numRef,
                    'status'                => $tipoStatus,
                    'data_vencimento'       => $this->dataValida($m->date_to_pay),
                    'data_pagamento'        => ($tipoStatus === 'pago') ? $this->dataValida($m->date) : null,
                    'lote_id'               => $loteId,
                    'observacao'            => 'Importado',
                    'updated_at'            => now(),
                ];

                if (isset($existing[$ref])) {
                    $stats['updated']++;
                    if (!$dryRun) {
                        DB::connection('tenant')->table('pagamentos')
                            ->where('id', $existing[$ref]->id)
                            ->update($payload);
                    }
                } else {
                    $stats['inserted']++;
                    $insertBatch[] = array_merge($payload, [
                        'referencia' => $ref,
                        'created_at' => $m->created_at ?: now(),
                    ]);
                }
            }

            if (!$dryRun && $insertBatch) {
                DB::connection('tenant')->table('pagamentos')->insert($insertBatch);
            }
        });

        $bar->finish();
        $this->newLine(2);

        // 4. Resumo
        $this->info('=== Resultado ===');
        $this->table(['Acção', 'Quantidade'], [
            ['Inserir',                  number_format($stats['inserted'])],
            ['Actualizar',               number_format($stats['updated'])],
            ['Skipped (sem aluno)',      number_format($stats['skipped_aluno'])],
            ['Skipped (status fora map)',number_format($stats['skipped_status'])],
            ['Skipped (valor 0)',        number_format($stats['skipped_zero'])],
        ]);

        if ($skippedSamples) {
            $this->warn('Amostra de movements sem aluno mapeado:');
            foreach ($skippedSamples as $s) $this->line('  · ' . $s);
        }

        if ($dryRun) {
            $this->newLine();
            $this->warn('Foi um DRY-RUN. Para gravar, corra: php artisan golfinho:migrar-pagamentos --force');
        } else {
            $this->info('✅ Concluído.');
        }

        return 0;
    }
}
