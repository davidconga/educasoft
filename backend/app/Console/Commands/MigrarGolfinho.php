<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MigrarGolfinho extends Command
{
    protected $signature   = 'migrar:golfinho {--fresh : Limpa escola_golfinho antes de migrar}';
    protected $description = 'Migra dados do sistema antigo Golfinho para o Educajá (escola_golfinho)';

    private array $mapCursos      = [];
    private array $mapClasses     = [];
    private array $mapDisciplinas = [];
    private array $mapTurnos      = [];
    private array $mapAlunos      = [];
    private array $mapProfessores = [];
    private array $mapTurmas      = [];

    private array $turnoHorarios = [
        'manha' => ['07:00:00', '12:30:00'],
        'tarde' => ['12:30:00', '18:00:00'],
        'noite' => ['18:00:00', '23:00:00'],
    ];

    private array $trimestreNomes = [
        1 => '1o Trimestre',
        2 => '2o Trimestre',
        3 => '3o Trimestre',
    ];

    public function handle(): int
    {
        $this->info('=== Migração Colégio Golfinho → Educajá ===');
        $this->info('Fonte: golfinho_source | Destino: escola_golfinho');
        $this->newLine();

        if ($this->option('fresh')) {
            $this->limpaBD();
        }

        $this->migrarCursos();
        $this->migrarClasses();
        $this->migrarDisciplinas();
        $this->migrarTurnos();
        $this->migrarAlunos();
        $this->migrarProfessores();
        $this->migrarTurmas();
        $this->migrarMatriculas();
        $this->migrarNotas();
        $this->migrarPagamentos();
        $this->migrarPrecario();

        $this->newLine();
        $this->info('✓ Migração concluída com sucesso!');
        return 0;
    }

    private function limpaBD(): void
    {
        $this->warn('A limpar escola_golfinho...');
        DB::connection('tenant')->statement('SET FOREIGN_KEY_CHECKS=0');
        foreach ([
            'presencas_professores', 'presencas', 'notas', 'pagamentos',
            'matriculas', 'turma_disciplina', 'turmas', 'professores', 'alunos',
            'users', 'disciplinas', 'curso_disciplinas', 'cursos', 'classes',
            'salas', 'turnos', 'precario_propinas', 'precario_emolumentos', 'precario_multas',
        ] as $t) {
            DB::connection('tenant')->table($t)->truncate();
        }
        DB::connection('tenant')->statement('SET FOREIGN_KEY_CHECKS=1');
    }

    // ------------------------------------------------------------------ CURSOS
    private function migrarCursos(): void
    {
        $this->info('[1/10] Cursos...');
        $rows = DB::connection('src')->table('cursos')->get();

        foreach ($rows as $r) {
            $id = DB::connection('tenant')->table('cursos')->insertGetId([
                'nome'       => $r->name,
                'codigo'     => $r->code ?? strtoupper(substr(preg_replace('/\s+/', '', $r->name), 0, 6)),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->mapCursos[$r->id] = $id;
        }
        $this->line("   → {$rows->count()} cursos");
    }

    // ----------------------------------------------------------------- CLASSES
    private function migrarClasses(): void
    {
        $this->info('[2/10] Classes...');

        // Golfinho: curso_id está na turma, não na classe.
        // Criamos uma classe por combinação (classe, curso) para preservar a relação.
        $combos = DB::connection('src')
            ->table('turmas as t')
            ->join('classes as c', 'c.id', '=', 't.classe_id')
            ->join('cursos as cu', 'cu.id', '=', 't.curso_id')
            ->select('t.classe_id', 't.curso_id', 'c.name as classe_nome', 'cu.name as curso_nome')
            ->distinct()
            ->orderBy('t.classe_id')
            ->get();

        foreach ($combos as $r) {
            $cursoId = $this->mapCursos[$r->curso_id] ?? null;
            $id = DB::connection('tenant')->table('classes')->insertGetId([
                'nome'       => $r->classe_nome,
                'nivel'      => $r->classe_nome,
                'ordem'      => $r->classe_id,
                'curso_id'   => $cursoId,
                'ativo'      => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->mapClasses[$r->classe_id . '_' . $r->curso_id] = $id;
        }
        $this->line("   → {$combos->count()} classes");
    }

    // --------------------------------------------------------------- DISCIPLINAS
    private function migrarDisciplinas(): void
    {
        $this->info('[3/10] Disciplinas...');
        $rows  = DB::connection('src')->table('disciplinas')->get();
        $count = 0;

        foreach ($rows as $r) {
            $codigo = $r->code ?? strtoupper(substr(preg_replace('/\s+/', '', $r->name), 0, 6));

            // codigo é UNIQUE — garante unicidade
            $base = $codigo;
            $n    = 1;
            while (DB::connection('tenant')->table('disciplinas')->where('codigo', $codigo)->exists()) {
                $codigo = $base . $n++;
            }

            $id = DB::connection('tenant')->table('disciplinas')->insertGetId([
                'nome'          => $r->name,
                'codigo'        => $codigo,
                'carga_horaria' => 0,
                'created_at'    => now(), 'updated_at' => now(),
            ]);
            $this->mapDisciplinas[$r->id] = $id;
            $count++;
        }
        $this->line("   → $count disciplinas");
    }

    // ------------------------------------------------------------------ TURNOS
    private function migrarTurnos(): void
    {
        $this->info('[4/10] Turnos...');
        $rows  = DB::connection('src')->table('turnos')->get();
        $slugMap = ['Manhã' => 'manha', 'Tarde' => 'tarde', 'Noite' => 'noite'];

        foreach ($rows as $r) {
            $codigo  = $slugMap[$r->name] ?? Str::slug($r->name);
            $horario = $this->turnoHorarios[$codigo] ?? ['08:00:00', '17:00:00'];

            $id = DB::connection('tenant')->table('turnos')->insertGetId([
                'nome'        => $r->name,
                'codigo'      => $codigo,
                'hora_inicio' => $horario[0],
                'hora_fim'    => $horario[1],
                'ativo'       => true,
                'created_at'  => now(), 'updated_at' => now(),
            ]);
            $this->mapTurnos[$r->id] = ['id' => $id, 'codigo' => $codigo];
        }
        $this->line("   → {$rows->count()} turnos");
    }

    // ------------------------------------------------------------------ ALUNOS
    private function migrarAlunos(): void
    {
        $this->info('[5/10] Alunos (1852)...');
        $rows  = DB::connection('src')->table('alunos')->get();
        $bar   = $this->output->createProgressBar($rows->count());
        $count = 0;

        foreach ($rows as $r) {
            $email = $r->num . '@egolfinho.ao';
            if (DB::connection('tenant')->table('users')->where('email', $email)->exists()) {
                $email = $r->num . '.' . $r->id . '@egolfinho.ao';
            }

            $userId = DB::connection('tenant')->table('users')->insertGetId([
                'nome'       => $r->name,
                'email'      => $email,
                'password'   => Hash::make($r->num),
                'telefone'   => $r->telefone ? (string)$r->telefone : null,
                'tipo'       => 'aluno',
                'ativo'      => true,
                'created_at' => $r->created_at ?? now(),
                'updated_at' => $r->updated_at ?? now(),
            ]);

            $alunoId = DB::connection('tenant')->table('alunos')->insertGetId([
                'user_id'         => $userId,
                'numero_aluno'    => $r->num,
                'data_nascimento' => $r->data_nasc ?: null,
                'genero'          => $r->sexo === 'M' ? 'masculino' : ($r->sexo === 'F' ? 'feminino' : null),
                'naturalidade'    => $r->naturalidade ?: null,
                'endereco'        => $r->morada ?: null,
                'created_at'      => $r->created_at ?? now(),
                'updated_at'      => $r->updated_at ?? now(),
            ]);

            $this->mapAlunos[$r->id] = $alunoId;
            $count++;
            $bar->advance();
        }
        $bar->finish();
        $this->line(" → $count alunos");
    }

    // --------------------------------------------------------------- PROFESSORES
    private function migrarProfessores(): void
    {
        $this->info('[6/10] Professores...');

        $rows = DB::connection('src')
            ->table('professors as p')
            ->join('funcionarios as f', 'f.id', '=', 'p.funcionario_id')
            ->select('p.funcionario_id', 'f.name', 'f.sexo', 'f.data_nasc')
            ->get();

        $bar = $this->output->createProgressBar($rows->count());
        $num = 1;

        foreach ($rows as $r) {
            $slug  = Str::slug($r->name, '.');
            $email = ($slug ?: 'prof' . $r->funcionario_id) . '@egolfinho.ao';
            if (DB::connection('tenant')->table('users')->where('email', $email)->exists()) {
                $email = 'prof.' . $r->funcionario_id . '@egolfinho.ao';
            }

            $userId = DB::connection('tenant')->table('users')->insertGetId([
                'nome'       => $r->name,
                'email'      => $email,
                'password'   => Hash::make('Golfinho@2024'),
                'tipo'       => 'professor',
                'ativo'      => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);

            $profId = DB::connection('tenant')->table('professores')->insertGetId([
                'user_id'          => $userId,
                'numero_professor' => 'PROF' . str_pad($num, 4, '0', STR_PAD_LEFT),
                'created_at'       => now(), 'updated_at' => now(),
            ]);

            $this->mapProfessores[$r->funcionario_id] = $profId;
            $num++;
            $bar->advance();
        }
        $bar->finish();
        $this->line(" → {$rows->count()} professores");
    }

    // ------------------------------------------------------------------ TURMAS
    private function migrarTurmas(): void
    {
        $this->info('[7/10] Turmas...');

        $rows = DB::connection('src')
            ->table('turmas as t')
            ->join('classes as c', 'c.id', '=', 't.classe_id')
            ->join('turnos as tu', 'tu.id', '=', 't.turno_id')
            ->join('cursos as cu', 'cu.id', '=', 't.curso_id')
            ->join('ano_lectivos as a', 'a.id', '=', 't.ano_lectivo_id')
            ->select('t.*', 'c.name as classe_nome', 'tu.name as turno_nome',
                     'cu.name as curso_nome', 'a.name as ano_nome')
            ->get();

        $bar = $this->output->createProgressBar($rows->count());

        foreach ($rows as $r) {
            $turnoInfo = $this->mapTurnos[$r->turno_id] ?? ['id' => null, 'codigo' => 'manha'];
            $classeId  = $this->mapClasses[$r->classe_id . '_' . $r->curso_id] ?? null;

            $id = DB::connection('tenant')->table('turmas')->insertGetId([
                'nome'       => "{$r->classe_nome} {$r->name} - {$r->curso_nome}",
                'nivel'      => $r->classe_nome,
                'classe_id'  => $classeId,
                'turno'      => $turnoInfo['codigo'],
                'turno_id'   => $turnoInfo['id'],
                'ano_letivo' => $r->ano_nome,
                'capacidade' => 40,
                'ativo'      => true,
                'created_at' => $r->created_at ?? now(),
                'updated_at' => $r->updated_at ?? now(),
            ]);

            $this->mapTurmas[$r->id] = $id;
            $bar->advance();
        }
        $bar->finish();
        $this->line(" → {$rows->count()} turmas");
    }

    // --------------------------------------------------------------- MATRÍCULAS
    private function migrarMatriculas(): void
    {
        $this->info('[8/10] Matrículas...');

        $rows = DB::connection('src')
            ->table('matriculas as m')
            ->join('ano_lectivos as a', 'a.id', '=', 'm.ano_lectivo_id')
            ->select('m.*', 'a.name as ano_nome')
            ->get();

        $bar   = $this->output->createProgressBar($rows->count());
        $count = 0;

        foreach ($rows as $r) {
            $alunoId = $this->mapAlunos[$r->aluno_id] ?? null;
            $turmaId = $this->mapTurmas[$r->turma_id] ?? null;

            if (!$alunoId || !$turmaId) { $bar->advance(); continue; }

            $existe = DB::connection('tenant')->table('matriculas')
                ->where('aluno_id', $alunoId)->where('turma_id', $turmaId)
                ->where('ano_letivo', $r->ano_nome)->exists();

            if (!$existe) {
                DB::connection('tenant')->table('matriculas')->insert([
                    'aluno_id'       => $alunoId,
                    'turma_id'       => $turmaId,
                    'ano_letivo'     => $r->ano_nome,
                    'status'         => 'activa',
                    'data_matricula' => $r->created_at
                        ? date('Y-m-d', strtotime($r->created_at))
                        : now()->toDateString(),
                    'created_at'     => $r->created_at ?? now(),
                    'updated_at'     => $r->updated_at ?? now(),
                ]);
                $count++;
            }
            $bar->advance();
        }
        $bar->finish();
        $this->line(" → $count matrículas");
    }

    // ------------------------------------------------------------------- NOTAS
    private function migrarNotas(): void
    {
        $this->info('[9/10] Notas...');

        $pautas = DB::connection('src')
            ->table('pautas as p')
            ->join('notas as n', 'n.id', '=', 'p.nota_id')
            ->select('p.aluno_id', 'p.turma_id', 'p.disciplina_id',
                     'p.ano_lectivo_id', 'n.trimestre_id', 'n.name as tipo', 'p.nota')
            ->get();

        // Agrupa por aluno+turma+disciplina+trimestre+ano
        $agrupado = [];
        foreach ($pautas as $p) {
            $chave = "{$p->aluno_id}_{$p->turma_id}_{$p->disciplina_id}_{$p->trimestre_id}_{$p->ano_lectivo_id}";
            $agrupado[$chave] ??= [
                'aluno_id'      => $p->aluno_id,
                'turma_id'      => $p->turma_id,
                'disciplina_id' => $p->disciplina_id,
                'trimestre_id'  => $p->trimestre_id,
                'ano_lectivo_id'=> $p->ano_lectivo_id,
            ];
            $tipo = strtoupper(trim($p->tipo));
            if ($tipo === 'MAC') $agrupado[$chave]['mac'] = $p->nota;
            if ($tipo === 'NPP') $agrupado[$chave]['npp'] = $p->nota;
            if ($tipo === 'NPT') $agrupado[$chave]['npt'] = $p->nota;
        }

        $anoMap = DB::connection('src')->table('ano_lectivos')->pluck('name', 'id')->toArray();

        $bar   = $this->output->createProgressBar(count($agrupado));
        $count = 0;

        foreach ($agrupado as $item) {
            $alunoId      = $this->mapAlunos[$item['aluno_id']] ?? null;
            $turmaId      = $this->mapTurmas[$item['turma_id']] ?? null;
            $disciplinaId = $this->mapDisciplinas[$item['disciplina_id']] ?? null;

            if (!$alunoId || !$turmaId || !$disciplinaId) { $bar->advance(); continue; }

            $mac = $item['mac'] ?? null;
            $npp = $item['npp'] ?? null;
            $npt = $item['npt'] ?? null;

            $vals  = array_filter([$mac, $npt], fn($v) => $v !== null);
            $media = count($vals) ? round(array_sum($vals) / count($vals), 2) : null;

            $resultado = 'pendente';
            if ($media !== null) $resultado = $media >= 10 ? 'aprovado' : 'reprovado';

            DB::connection('tenant')->table('notas')->insert([
                'aluno_id'      => $alunoId,
                'disciplina_id' => $disciplinaId,
                'turma_id'      => $turmaId,
                'periodo'       => $this->trimestreNomes[$item['trimestre_id']] ?? 'Trimestre ' . $item['trimestre_id'],
                'ano_letivo'    => $anoMap[$item['ano_lectivo_id']] ?? '2024-2025',
                'mac'           => $mac,
                'npp'           => $npp,
                'npt'           => $npt,
                'nota_continua' => $mac,
                'nota_exame'    => $npt,
                'media'         => $media,
                'resultado'     => $resultado,
                'created_at'    => now(), 'updated_at' => now(),
            ]);
            $count++;
            $bar->advance();
        }
        $bar->finish();
        $this->line(" → $count registos de notas");
    }

    // --------------------------------------------------------------- PREÇÁRIO
    private function migrarPrecario(): void
    {
        $this->info('[11/11] Preçário...');

        // Palavras-chave que identificam multas
        $keywordsMultas = ['falta', 'multa', 'folha de prova', 'justificação'];

        // Palavras-chave que identificam propinas
        $keywordsPropina = ['propina'];

        $services = DB::connection('src')->table('services')->get();

        // Mapa ano_lectivo_id → nome (para price_services)
        $anoMap = DB::connection('src')->table('ano_lectivos')->pluck('name', 'id')->toArray();

        // Preços por ano_lectivo via price_services (substituem o price base)
        $priceServices = DB::connection('src')->table('price_services')->get()
            ->groupBy('service_id');

        $contPropinas    = 0;
        $contEmolumentos = 0;
        $contMultas      = 0;

        foreach ($services as $s) {
            $nomeLower = strtolower($s->name);

            // Determina categoria
            $ehPropina = collect($keywordsPropina)->contains(fn($k) => str_contains($nomeLower, $k));
            $ehMulta   = collect($keywordsMultas)->contains(fn($k) => str_contains($nomeLower, $k));

            if ($ehPropina) {
                // Tenta criar uma entrada por ano_lectivo se existir em price_services
                $precos = $priceServices->get($s->id);

                if ($precos && $precos->count()) {
                    foreach ($precos as $ps) {
                        $anoLetivo = $anoMap[$ps->ano_lectivo_id] ?? null;
                        DB::connection('tenant')->table('precario_propinas')->insert([
                            'nome'        => $s->name,
                            'valor_mensal'=> $ps->price,
                            'ano_letivo'  => $anoLetivo,
                            'descricao'   => $s->description !== 'null' ? $s->description : null,
                            'created_at'  => now(), 'updated_at' => now(),
                        ]);
                        $contPropinas++;
                    }
                } else {
                    DB::connection('tenant')->table('precario_propinas')->insert([
                        'nome'        => $s->name,
                        'valor_mensal'=> $s->price,
                        'ano_letivo'  => null,
                        'descricao'   => $s->description !== 'null' ? $s->description : null,
                        'created_at'  => now(), 'updated_at' => now(),
                    ]);
                    $contPropinas++;
                }

            } elseif ($ehMulta) {
                DB::connection('tenant')->table('precario_multas')->insert([
                    'nome'         => $s->name,
                    'tipo_calculo' => 'fixo',
                    'valor'        => $s->price,
                    'dias_carencia'=> 0,
                    'aplicar_em'   => 'mensalidade',
                    'ativo'        => true,
                    'descricao'    => $s->description !== 'null' ? $s->description : null,
                    'created_at'   => now(), 'updated_at' => now(),
                ]);
                $contMultas++;

            } else {
                // Categorias especiais de emolumentos
                $categoria = 'Secretaria';
                if (str_contains($nomeLower, 'matrícula') || str_contains($nomeLower, 'matricula') || str_contains($nomeLower, 'inscrição')) {
                    $categoria = 'Matrícula';
                } elseif (str_contains($nomeLower, 'uniforme') || str_contains($nomeLower, 'bata') || str_contains($nomeLower, 'túnica') || str_contains($nomeLower, 'livro')) {
                    $categoria = 'Material';
                } elseif (str_contains($nomeLower, 'declaração') || str_contains($nomeLower, 'certificado') || str_contains($nomeLower, 'transferên')) {
                    $categoria = 'Secretaria';
                } elseif (str_contains($nomeLower, 'estágio') || str_contains($nomeLower, 'exame') || str_contains($nomeLower, 'época') || str_contains($nomeLower, 'juramento') || str_contains($nomeLower, 'gala') || str_contains($nomeLower, 'baptismo')) {
                    $categoria = 'Académico';
                }

                DB::connection('tenant')->table('precario_emolumentos')->insert([
                    'nome'       => trim($s->name),
                    'categoria'  => $categoria,
                    'valor'      => $s->price,
                    'obrigatorio'=> false,
                    'ano_letivo' => null,
                    'descricao'  => $s->description !== 'null' ? $s->description : null,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $contEmolumentos++;
            }
        }

        $this->line("   → $contPropinas propinas | $contEmolumentos emolumentos | $contMultas multas");
    }

    // --------------------------------------------------------------- PAGAMENTOS
    private function migrarPagamentos(): void
    {
        $this->info('[10/10] Pagamentos (movements)...');

        // Status: 2=pago, 0/1=pendente, 6=vencido, 3/-2=cancelado
        $statusMap = [
            2  => 'pago',
            0  => 'pendente',
            1  => 'pendente',
            6  => 'vencido',
            3  => 'cancelado',
            -2 => 'cancelado',
        ];

        $metodoMap = [
            'Numerario'     => 'dinheiro',
            'numerario'     => 'dinheiro',
            'Transferencia' => 'transferencia',
            'transferencia' => 'transferencia',
            'Multicaixa'    => 'multicaixa',
            'Cheque'        => 'transferencia',
        ];

        // service_id=1,8 → mensalidade; 5,6,18 → matricula; resto → emolumento
        $servicosMensalidade = [1, 8];
        $servicosMatricula   = [5, 6, 18];

        $metodoFormPay = [
            1 => 'multicaixa',
            2 => 'dinheiro',
            3 => 'transferencia',
            4 => 'transferencia',
            5 => 'transferencia',
        ];

        // Pré-carrega data de pagamento via payments (só para status=2)
        $formasPorMovement = DB::connection('src')
            ->table('payments as p')
            ->leftJoin('form_payments as fp', 'fp.id', '=', 'p.form_payment_id')
            ->whereNotNull('p.movement_id')
            ->select('p.movement_id', 'fp.name as forma_nome', 'p.date as data_pago')
            ->get()
            ->keyBy('movement_id');

        $rows = DB::connection('src')
            ->table('movements as m')
            ->leftJoin('services as s', 's.id', '=', 'm.service_id')
            ->leftJoin('months as mo', 'mo.id', '=', 'm.month_id')
            ->leftJoin('ano_lectivos as a', 'a.id', '=', 'm.ano_lectivo_id')
            ->whereNotNull('m.aluno_id')
            ->where('m.aluno_id', '>', 0)
            ->select('m.id', 'm.aluno_id', 'm.status', 'm.price', 'm.date_to_pay',
                     'm.created_at', 'm.updated_at', 'm.ano', 'm.service_id', 'm.forma_pay',
                     's.name as servico', 'mo.name as mes', 'a.name as ano_letivo')
            ->get();

        $bar   = $this->output->createProgressBar($rows->count());
        $count = 0;

        foreach ($rows as $r) {
            $alunoId = $this->mapAlunos[$r->aluno_id] ?? null;
            if (!$alunoId) { $bar->advance(); continue; }

            $referencia = 'MOV-' . str_pad($r->id, 8, '0', STR_PAD_LEFT);

            if (DB::connection('tenant')->table('pagamentos')->where('referencia', $referencia)->exists()) {
                $bar->advance();
                continue;
            }

            $status   = $statusMap[$r->status] ?? 'pendente';
            $pagInfo  = $formasPorMovement->get($r->id);
            $metodo   = $metodoMap[$pagInfo?->forma_nome ?? ''] ?? $metodoFormPay[$r->forma_pay ?? 0] ?? 'dinheiro';

            // Data de pagamento só se status = pago
            $dataPagamento = null;
            if ($status === 'pago' && $pagInfo?->data_pago) {
                $dataPagamento = date('Y-m-d', strtotime($pagInfo->data_pago));
            }

            // Tipo baseado no service_id
            if (in_array($r->service_id, $servicosMensalidade)) {
                $tipo = 'mensalidade';
            } elseif (in_array($r->service_id, $servicosMatricula)) {
                $tipo = 'matricula';
            } else {
                $tipo = 'emolumento';
            }

            // Mês de referência: "Setembro 2023", "Outubro 2023", etc.
            $mesRef = null;
            if ($r->mes) {
                $mesRef = $r->mes . ($r->ano ? ' ' . $r->ano : '');
            }

            DB::connection('tenant')->table('pagamentos')->insert([
                'aluno_id'          => $alunoId,
                'plano_id'          => null,
                'referencia'        => $referencia,
                'valor'             => $r->price,
                'tipo'              => $tipo,
                'metodo'            => $metodo,
                'status'            => $status,
                'mes_referencia'    => $mesRef,
                'data_vencimento'   => $r->date_to_pay ?: null,
                'data_pagamento'    => $dataPagamento,
                'observacao'        => $r->servico ? $r->servico : null,
                'created_at'        => $r->created_at ?? now(),
                'updated_at'        => $r->updated_at ?? now(),
            ]);
            $count++;
            $bar->advance();
        }
        $bar->finish();
        $this->line(" → $count pagamentos");
    }
}
