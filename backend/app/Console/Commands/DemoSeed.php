<?php
namespace App\Console\Commands;

use App\Models\Central\Escola;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Stancl\Tenancy\Facades\Tenancy;

/**
 * Popula a escola "demo" com dados realistas para demonstrações comerciais:
 * 150 alunos, 15 professores, 5 funcionários, matrículas, propinas pagas/pendentes,
 * notas, presenças, horários, caixa, bolsas.
 *
 * Idempotente — limpa as tabelas antes de reseed. Use `--codigo=outro` para outro tenant.
 */
class DemoSeed extends Command
{
    protected $signature = "demo:seed {--codigo=demo : Código do tenant}";
    protected $description = "Popula um tenant com dataset de demonstração completo";

    private const ANO_LECTIVO = "2025-2026";
    private const ADMIN_EMAIL = "demo@educaja.ao";
    private const ADMIN_PASSWORD = "Educaja@2026!";

    // Nomes próprios e apelidos angolanos para gerar população realista.
    private array $nomesM = [
        "João", "Pedro", "Manuel", "António", "Eduardo", "Carlos", "Domingos", "Augusto",
        "Mateus", "Sebastião", "Joaquim", "Rafael", "Bento", "Quintino", "Felisberto",
        "Cassinda", "Tomás", "Adérito", "Filipe", "Hélder", "Osvaldo", "Cristiano",
        "Daniel", "Miguel", "Nelson", "Gerson", "Eurico", "Wilson", "Adilson", "Hermes"
    ];
    private array $nomesF = [
        "Maria", "Ana", "Helena", "Filomena", "Sónia", "Lucinda", "Beatriz", "Felisbela",
        "Joana", "Antónia", "Manuela", "Esperança", "Domingas", "Teresa", "Cristina",
        "Fernanda", "Catarina", "Isabel", "Patrícia", "Cláudia", "Vânia", "Eliana",
        "Yara", "Tâmara", "Luísa", "Edna", "Marisa", "Mara", "Zaida", "Olívia"
    ];
    private array $apelidos = [
        "Pereira", "Sebastião", "Cassule", "Tchindandi", "Capemba", "Domingos", "Coelho",
        "Quissinde", "Catito", "Mavinga", "Cabral", "Vieira", "Cordeiro", "Henrique",
        "Manuel", "Bento", "Sousa", "Tomás", "Cassinda", "Mateus", "Lopes", "Silva",
        "Fernandes", "Neto", "Carvalho", "Mendes", "Gomes", "Lourenço", "Mussunda", "Cangamba"
    ];

    public function handle(): int
    {
        $codigo = $this->option("codigo");
        $escola = Escola::where("codigo", $codigo)->first();
        if (!$escola) {
            $this->error("Tenant '{$codigo}' não encontrado.");
            return 1;
        }

        $this->info("A inicializar tenant {$codigo} ({$escola->id})...");
        Tenancy::initialize($escola);

        try {
            // Não envolver em transação: TRUNCATE em MySQL é DDL e faz auto-commit,
            // quebrando qualquer transacção aberta.
            $this->wipe();
            $this->seedReferencias();
            [$adminId, $profIds, $funcIds] = $this->seedPessoal();
            $turmaIds = $this->seedTurmas($profIds);
            $alunoIds = $this->seedAlunos();
            [$propinaPorClasse, $emolumentos, $multaId] = $this->seedPrecario();
            $matriculaIds = $this->seedMatriculas($alunoIds, $turmaIds);
            $this->seedPagamentos($alunoIds, $turmaIds, $propinaPorClasse, $emolumentos);
            $this->seedNotas($alunoIds, $turmaIds);
            $this->seedHorarios($turmaIds, $profIds);
            $this->seedPresencas($alunoIds, $turmaIds);
            $this->seedCaixa($adminId);
            $this->seedBolsas($alunoIds);
            $this->seedFolhasPagamento($funcIds);
            $this->seedDocumentos($alunoIds);
            DB::commit();

            $this->info("");
            $this->info("✅ Dataset de demonstração criado com sucesso!");
            $this->table(["Tabela","Total"], [
                ["users", DB::table("users")->count()],
                ["alunos", DB::table("alunos")->count()],
                ["professores", DB::table("professores")->count()],
                ["funcionarios", DB::table("funcionarios")->count()],
                ["turmas", DB::table("turmas")->count()],
                ["matriculas", DB::table("matriculas")->count()],
                ["pagamentos", DB::table("pagamentos")->count()],
                ["notas", DB::table("notas")->count()],
                ["horarios", DB::table("horarios")->count()],
                ["presencas", DB::table("presencas")->count()],
                ["bolsas", DB::table("bolsas")->count()],
                ["folhas_pagamento", DB::table("folhas_pagamento")->count()],
            ]);
            $this->info("");
            $this->info("Login: " . self::ADMIN_EMAIL . " / " . self::ADMIN_PASSWORD);
            $this->info("URL:   https://{$codigo}.educaja.ao");
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error("Falha: " . $e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        } finally {
            Tenancy::end();
        }
        return 0;
    }

    private function wipe(): void
    {
        $this->info("A limpar tabelas...");
        // Ordem inversa de dependências.
        $tabs = [
            "presencas_funcionarios","presencas_professores","presencas",
            "folhas_pagamento","caixa_movimentos","caixa_sessoes",
            "recibos_bolsa","bolsas","financiadores",
            "notas","horarios","materiais","aulas_remotas",
            "pagamentos","planos_pagamento","precario_multas","precario_emolumentos","precario_propinas",
            "matriculas","aluno_documento_entregas","aluno_documentos","tipos_documento",
            "alunos","turmas","curso_disciplinas","disciplinas",
            "salas","turnos","classes","cursos",
            "funcionarios","professores",
            "users",
        ];
        DB::statement("SET FOREIGN_KEY_CHECKS=0");
        foreach ($tabs as $t) {
            try { DB::table($t)->truncate(); } catch (\Throwable) {}
        }
        DB::statement("SET FOREIGN_KEY_CHECKS=1");
    }

    private function seedReferencias(): void
    {
        $this->info("A criar referências (curso, classes, turnos, salas, disciplinas)...");

        // Cursos
        $cursoId = DB::table("cursos")->insertGetId([
            "nome" => "Ensino Geral — Ciências Físicas e Biológicas",
            "codigo" => "EGCFB",
            "area" => "Ciências",
            "nivel_ensino" => "Secundário",
            "duracao_anos" => 3,
            "descricao" => "Curso geral do II ciclo do ensino secundário, área de Ciências Físicas e Biológicas.",
            "ativo" => 1,
            "created_at" => now(), "updated_at" => now(),
        ]);
        DB::table("cursos")->insert([
            "nome" => "Ensino Geral — Ciências Económicas e Jurídicas",
            "codigo" => "EGCEJ", "area" => "Económicas",
            "nivel_ensino" => "Secundário", "duracao_anos" => 3,
            "ativo" => 1, "created_at" => now(), "updated_at" => now(),
        ]);

        // Classes
        $classes = [
            ["10ª Classe", "Secundário", 10, $cursoId],
            ["11ª Classe", "Secundário", 11, $cursoId],
            ["12ª Classe", "Secundário", 12, $cursoId],
        ];
        $classeIds = [];
        foreach ($classes as $i => [$nome, $nivel, $ordem, $curso]) {
            $classeIds[$ordem] = DB::table("classes")->insertGetId([
                "nome" => $nome, "nivel" => $nivel, "ordem" => $ordem,
                "curso_id" => $curso, "ativo" => 1,
                "created_at" => now(), "updated_at" => now(),
            ]);
        }
        $this->classeIds = $classeIds;

        // Turnos
        DB::table("turnos")->insert([
            ["nome" => "Manhã", "codigo" => "manha", "hora_inicio" => "07:00:00", "hora_fim" => "12:30:00", "ativo" => 1, "created_at" => now(), "updated_at" => now()],
            ["nome" => "Tarde", "codigo" => "tarde", "hora_inicio" => "13:00:00", "hora_fim" => "18:30:00", "ativo" => 1, "created_at" => now(), "updated_at" => now()],
        ]);
        $this->turnoIds = DB::table("turnos")->pluck("id", "codigo")->toArray();

        // Salas
        for ($i = 1; $i <= 8; $i++) {
            DB::table("salas")->insert([
                "nome" => "Sala $i", "tipo" => "Sala de Aula", "capacidade" => 30,
                "localizacao" => "Bloco " . (ceil($i / 4)), "ativo" => 1,
                "created_at" => now(), "updated_at" => now(),
            ]);
        }
        $this->salaIds = DB::table("salas")->pluck("id")->toArray();

        // Disciplinas
        $disciplinas = [
            ["Português", "PORT", 4], ["Matemática", "MAT", 4], ["Inglês", "ING", 3],
            ["Física", "FIS", 3], ["Química", "QUI", 3], ["Biologia", "BIO", 3],
            ["Geografia", "GEO", 2], ["História", "HIST", 2], ["Filosofia", "FIL", 2],
            ["Educação Física", "EF", 2], ["TIC", "TIC", 2], ["Empreendedorismo", "EMP", 2],
        ];
        foreach ($disciplinas as [$nome, $cod, $ch]) {
            DB::table("disciplinas")->insert([
                "nome" => $nome, "codigo" => $cod, "carga_horaria" => $ch,
                "created_at" => now(), "updated_at" => now(),
            ]);
        }
        $this->disciplinaIds = DB::table("disciplinas")->pluck("id", "codigo")->toArray();

        // Curso x Disciplina (vincula todas as disciplinas ao curso principal e a cada classe)
        foreach ($this->disciplinaIds as $codDisc => $_) {
            $row = collect($disciplinas)->first(fn($d) => $d[1] === $codDisc);
            foreach ($classeIds as $ordem => $classeId) {
                DB::table("curso_disciplinas")->insert([
                    "curso_id" => $cursoId,
                    "classe_id" => $classeId,
                    "nome" => $row[0],
                    "codigo" => $row[1],
                    "carga_horaria" => $row[2],
                    "ano" => $ordem - 9,
                    "obrigatoria" => 1,
                    "created_at" => now(), "updated_at" => now(),
                ]);
            }
        }
    }

    private function seedPessoal(): array
    {
        $this->info("A criar admin, professores e funcionários...");

        // Admin
        $adminId = DB::table("users")->insertGetId([
            "nome" => "Administrador Demo",
            "email" => self::ADMIN_EMAIL,
            "password" => Hash::make(self::ADMIN_PASSWORD),
            "tipo" => "admin",
            "telefone" => "923 000 000",
            "ativo" => 1,
            "created_at" => now(), "updated_at" => now(),
        ]);

        // Professores (15) — cada um com user próprio
        $profSpec = [
            ["Carlos Manuel Sebastião", "M", "MAT", "Licenciatura em Matemática"],
            ["Beatriz Lopes Tomás", "F", "PORT", "Licenciatura em Letras"],
            ["Augusto Domingos Quissinde", "M", "FIS", "Licenciatura em Física"],
            ["Felisbela Antónia Cassule", "F", "QUI", "Licenciatura em Química"],
            ["Mateus Mavinga Bento", "M", "BIO", "Licenciatura em Biologia"],
            ["Sónia Filomena Capemba", "F", "GEO", "Licenciatura em Geografia"],
            ["Domingos Sebastião Cassinda", "M", "HIST", "Licenciatura em História"],
            ["Lucinda Mateus Catito", "F", "ING", "Licenciatura em Inglês"],
            ["Fernanda Maria Tchindandi", "F", "FIL", "Licenciatura em Filosofia"],
            ["Pedro Bento Manuel", "M", "TIC", "Engenharia Informática"],
            ["Rafael Quintino Sousa", "M", "EF", "Licenciatura em Educação Física"],
            ["Joana Sebastião Cordeiro", "F", "EMP", "Licenciatura em Gestão"],
            ["Eduardo Fernandes Coelho", "M", "MAT", "Mestrado em Matemática"],
            ["Antónia Cabral Silva", "F", "PORT", "Mestrado em Linguística"],
            ["Manuela Catito Henrique", "F", "ING", "Licenciatura em Inglês"],
        ];
        $profIds = [];
        foreach ($profSpec as $i => [$nome, $genero, $codDisc, $habil]) {
            $email = "prof" . ($i + 1) . "@demo.educaja.ao";
            $uid = DB::table("users")->insertGetId([
                "nome" => $nome, "email" => $email,
                "password" => Hash::make("Demo@2026!"),
                "tipo" => "professor",
                "telefone" => "92" . random_int(0, 9) . " " . str_pad(random_int(0,999999), 6, "0", STR_PAD_LEFT),
                "ativo" => 1, "created_at" => now(), "updated_at" => now(),
            ]);
            $pid = DB::table("professores")->insertGetId([
                "user_id" => $uid,
                "numero_professor" => "P" . str_pad($i + 1, 4, "0", STR_PAD_LEFT),
                "especialidade" => collect([
                    "MAT"=>"Matemática","PORT"=>"Português","FIS"=>"Física","QUI"=>"Química",
                    "BIO"=>"Biologia","GEO"=>"Geografia","HIST"=>"História","ING"=>"Inglês",
                    "FIL"=>"Filosofia","TIC"=>"TIC","EF"=>"Educação Física","EMP"=>"Empreendedorismo"
                ])[$codDisc],
                "habilitacoes" => $habil,
                "data_admissao" => now()->subYears(random_int(1, 8))->toDateString(),
                "created_at" => now(), "updated_at" => now(),
            ]);
            $profIds[] = ["id" => $pid, "user_id" => $uid, "disciplina" => $codDisc, "nome" => $nome];
        }

        // Funcionários (5)
        $funcSpec = [
            ["Joaquim Eduardo Pereira", "M", "Director Pedagógico", "Direcção", 350000, "director"],
            ["Helena Domingos Santos", "F", "Secretária Geral", "Secretaria", 120000, "secretaria"],
            ["Maria José Cabral", "F", "Tesoureira", "Tesouraria", 180000, "tesouraria"],
            ["António Mateus Vieira", "M", "Segurança", "Manutenção", 80000, null],
            ["Teresa Manuela Coelho", "F", "Auxiliar de Limpeza", "Manutenção", 60000, null],
        ];
        $funcIds = [];
        foreach ($funcSpec as $i => [$nome, $genero, $cargo, $dep, $salario, $tipoUser]) {
            $uid = null;
            if ($tipoUser) {
                $email = strtolower(str_replace(" ", ".", explode(" ", $nome)[0])) . "@demo.educaja.ao";
                $uid = DB::table("users")->insertGetId([
                    "nome" => $nome, "email" => $email,
                    "password" => Hash::make("Demo@2026!"),
                    "tipo" => $tipoUser,
                    "telefone" => "92" . random_int(0,9) . " " . str_pad(random_int(0,999999),6,"0",STR_PAD_LEFT),
                    "ativo" => 1, "created_at" => now(), "updated_at" => now(),
                ]);
            }
            $fid = DB::table("funcionarios")->insertGetId([
                "user_id" => $uid,
                "nome" => $nome,
                "bi" => str_pad(random_int(0, 999999999), 9, "0", STR_PAD_LEFT) . "BA04" . random_int(0,9),
                "nif" => "00" . random_int(10000000, 99999999),
                "telefone" => "92" . random_int(0,9) . " " . str_pad(random_int(0,999999),6,"0",STR_PAD_LEFT),
                "email" => $uid ? "func{$i}@demo.educaja.ao" : null,
                "morada" => "Rua " . $i . ", Bairro Compão, Benguela",
                "genero" => $genero === "M" ? "masculino" : "feminino",
                "data_nascimento" => now()->subYears(random_int(28, 55))->toDateString(),
                "naturalidade" => "Benguela",
                "estado_civil" => random_int(0,1) ? "casado" : "solteiro",
                "cargo" => $cargo, "departamento" => $dep,
                "tipo_contrato" => "efectivo",
                "data_admissao" => now()->subYears(random_int(1, 10))->toDateString(),
                "salario_base" => $salario,
                "iban" => "AO06" . str_pad(random_int(0, 99999999999999999), 17, "0", STR_PAD_LEFT) . "0",
                "banco" => collect(["BAI","BFA","BIC","BPC","BCI"])->random(),
                "estado" => "activo",
                "created_at" => now(), "updated_at" => now(),
            ]);
            $funcIds[] = $fid;
        }

        return [$adminId, $profIds, $funcIds];
    }

    private array $classeIds = [];
    private array $turnoIds = [];
    private array $salaIds = [];
    private array $disciplinaIds = [];
    private array $turmaInfo = []; // id => ["classe_ordem"=>10/11/12, "turno"=>"manha"]

    private function seedTurmas(array $profIds): array
    {
        $this->info("A criar turmas...");
        // 6 turmas: 10ª A (manhã), 10ª B (tarde), 11ª A, 11ª B, 12ª A, 12ª B
        $defs = [
            [10, "A", "manha", 0], [10, "B", "tarde", 1],
            [11, "A", "manha", 2], [11, "B", "tarde", 3],
            [12, "A", "manha", 4], [12, "B", "tarde", 5],
        ];
        $turmaIds = [];
        foreach ($defs as [$ordem, $letra, $turno, $salaIdx]) {
            // Director de turma: um dos professores
            $diretor = $profIds[array_rand($profIds)]["id"];
            $tid = DB::table("turmas")->insertGetId([
                "nome" => "{$ordem}ª {$letra}",
                "nivel" => "Secundário",
                "turno" => $turno,
                "ano_letivo" => self::ANO_LECTIVO,
                "capacidade" => 30,
                "classe_id" => $this->classeIds[$ordem],
                "turno_id" => $this->turnoIds[$turno] ?? null,
                "sala_id" => $this->salaIds[$salaIdx] ?? null,
                "diretor_turma_id" => $diretor,
                "ativo" => 1,
                "created_at" => now(), "updated_at" => now(),
            ]);
            $turmaIds[] = $tid;
            $this->turmaInfo[$tid] = ["classe_ordem" => $ordem, "turno" => $turno];
        }
        return $turmaIds;
    }

    private array $alunoUserIds = [];

    private function seedAlunos(): array
    {
        $this->info("A criar 150 alunos...");
        $alunoIds = [];
        for ($i = 1; $i <= 150; $i++) {
            $genero = $i % 2 === 0 ? "F" : "M";
            $nomeProprio = $genero === "M" ? $this->nomesM[array_rand($this->nomesM)] : $this->nomesF[array_rand($this->nomesF)];
            $apelido1 = $this->apelidos[array_rand($this->apelidos)];
            $apelido2 = $this->apelidos[array_rand($this->apelidos)];
            $nome = "{$nomeProprio} {$apelido1} {$apelido2}";

            $email = strtolower($nomeProprio) . "." . strtolower($apelido2) . $i . "@demo.educaja.ao";
            $uid = DB::table("users")->insertGetId([
                "nome" => $nome, "email" => $email,
                "password" => Hash::make("aluno123"),
                "tipo" => "aluno", "ativo" => 1,
                "created_at" => now(), "updated_at" => now(),
            ]);
            $this->alunoUserIds[$i] = $uid;

            $aid = DB::table("alunos")->insertGetId([
                "user_id" => $uid,
                "numero_aluno" => "A" . str_pad($i, 5, "0", STR_PAD_LEFT),
                "data_nascimento" => now()->subYears(random_int(14, 18))->subDays(random_int(0,360))->toDateString(),
                "genero" => $genero === "M" ? "masculino" : "feminino",
                "naturalidade" => collect(["Benguela","Lobito","Catumbela","Baía Farta","Cubal"])->random(),
                "nacionalidade" => "Angolana",
                "bi" => str_pad(random_int(0, 999999999), 9, "0", STR_PAD_LEFT) . "BA04" . random_int(0,9),
                "nome_pai" => $this->nomesM[array_rand($this->nomesM)] . " " . $apelido2,
                "nome_mae" => $this->nomesF[array_rand($this->nomesF)] . " " . $apelido1,
                "telefone_responsavel" => "92" . random_int(0,9) . " " . str_pad(random_int(0,999999),6,"0",STR_PAD_LEFT),
                "email_responsavel" => "enc.{$nomeProprio}{$i}@gmail.com",
                "endereco" => "Bairro " . collect(["Compão","Mar Mar","Calumbira","Cavaco","Restinga"])->random() . ", Benguela",
                "dados_academicos_verificados_em" => now()->subDays(random_int(10, 90)),
                "created_at" => now(), "updated_at" => now(),
            ]);
            $alunoIds[] = $aid;
        }
        return $alunoIds;
    }

    private function seedPrecario(): array
    {
        $this->info("A criar preçário...");
        // Propinas por classe
        $valores = [10 => 25000, 11 => 27500, 12 => 30000];
        $propinaPorClasse = [];
        foreach ($valores as $ord => $valor) {
            $propinaPorClasse[$ord] = DB::table("precario_propinas")->insertGetId([
                "nome" => "Propina {$ord}ª Classe",
                "nivel" => "Secundário",
                "turno" => null,
                "valor_mensal" => $valor,
                "ano_letivo" => self::ANO_LECTIVO,
                "descricao" => "Mensalidade da {$ord}ª classe — ano lectivo " . self::ANO_LECTIVO,
                "created_at" => now(), "updated_at" => now(),
            ]);
        }

        // Emolumentos
        $emolDefs = [
            ["Matrícula", "Secretaria", 15000, 1],
            ["Certificado de Frequência", "Secretaria", 5000, 0],
            ["Declaração de Notas", "Secretaria", 2500, 0],
            ["Exame Especial", "Pedagógica", 5000, 0],
            ["Livro Escolar", "Material", 12000, 0],
        ];
        $emolumentos = [];
        foreach ($emolDefs as [$nome, $cat, $valor, $obrig]) {
            $id = DB::table("precario_emolumentos")->insertGetId([
                "nome" => $nome, "categoria" => $cat, "valor" => $valor,
                "obrigatorio" => $obrig, "ano_letivo" => self::ANO_LECTIVO,
                "created_at" => now(), "updated_at" => now(),
            ]);
            $emolumentos[$nome] = $id;
        }

        // Multa
        $multaId = DB::table("precario_multas")->insertGetId([
            "nome" => "Multa por atraso",
            "tipo_calculo" => "percentagem",
            "valor" => 5,
            "dias_carencia" => 5,
            "aplicar_em" => "mensalidade",
            "ativo" => 1,
            "ano_letivo" => self::ANO_LECTIVO,
            "created_at" => now(), "updated_at" => now(),
        ]);

        return [$propinaPorClasse, $emolumentos, $multaId];
    }

    private function seedMatriculas(array $alunoIds, array $turmaIds): array
    {
        $this->info("A criar matrículas...");
        // 25 alunos por turma, 6 turmas
        $matriculaIds = [];
        $i = 0;
        foreach ($turmaIds as $tid) {
            for ($j = 0; $j < 25 && $i < count($alunoIds); $j++, $i++) {
                $matriculaIds[$alunoIds[$i]] = [
                    "id" => DB::table("matriculas")->insertGetId([
                        "aluno_id" => $alunoIds[$i],
                        "turma_id" => $tid,
                        "ano_letivo" => self::ANO_LECTIVO,
                        "tipo" => "nova",
                        "status" => "activa",
                        "data_matricula" => "2025-09-01",
                        "created_at" => now(), "updated_at" => now(),
                    ]),
                    "turma_id" => $tid,
                ];
            }
        }
        return $matriculaIds;
    }

    private function seedPagamentos(array $alunoIds, array $turmaIds, array $propinaPorClasse, array $emolumentos): void
    {
        $this->info("A criar pagamentos (matrícula + 8 meses)...");
        // 8 meses: Set 2025 a Abr 2026
        $meses = [
            ["09", 2025, "Setembro"], ["10", 2025, "Outubro"], ["11", 2025, "Novembro"], ["12", 2025, "Dezembro"],
            ["01", 2026, "Janeiro"], ["02", 2026, "Fevereiro"], ["03", 2026, "Março"], ["04", 2026, "Abril"],
        ];
        $matriculaEmol = $emolumentos["Matrícula"];
        $insertBatch = [];
        $hoje = now();

        // Mapa aluno → turma → classe_ordem
        $alunoTurma = DB::table("matriculas")
            ->whereIn("aluno_id", $alunoIds)
            ->where("ano_letivo", self::ANO_LECTIVO)
            ->pluck("turma_id", "aluno_id")->toArray();

        foreach ($alunoIds as $aid) {
            $tid = $alunoTurma[$aid] ?? null;
            if (!$tid) continue;
            $ordem = $this->turmaInfo[$tid]["classe_ordem"];
            $propinaId = $propinaPorClasse[$ordem];

            // Emolumento de matrícula — sempre pago
            $insertBatch[] = $this->payRow($aid, $matriculaEmol, null, "matricula", 15000, "pago", "2025-08-25", "2025-08-25", null);

            $valorPropina = [10 => 25000, 11 => 27500, 12 => 30000][$ordem];
            foreach ($meses as [$m, $ano, $nome]) {
                $venc = "$ano-$m-10";
                $r = random_int(1, 100);
                if ($r <= 70) {
                    // pago a tempo
                    $pago = date("Y-m-d", strtotime("$venc -" . random_int(1, 7) . " days"));
                    $insertBatch[] = $this->payRow($aid, null, $propinaId, "mensalidade", $valorPropina, "pago", $venc, $pago, $nome);
                } elseif ($r <= 90) {
                    $insertBatch[] = $this->payRow($aid, null, $propinaId, "mensalidade", $valorPropina, "pendente", $venc, null, $nome);
                } else {
                    // vencido só se data passada
                    $estado = strtotime($venc) < strtotime($hoje->toDateString()) ? "vencido" : "pendente";
                    $insertBatch[] = $this->payRow($aid, null, $propinaId, "mensalidade", $valorPropina, $estado, $venc, null, $nome);
                }
            }

            if (count($insertBatch) >= 500) {
                DB::table("pagamentos")->insert($insertBatch);
                $insertBatch = [];
            }
        }
        if (!empty($insertBatch)) DB::table("pagamentos")->insert($insertBatch);
    }

    private function payRow(int $alunoId, ?int $emolId, ?int $propId, string $tipo, int $valor, string $status, ?string $venc, ?string $pago, ?string $mesRef): array
    {
        $metodo = collect(["dinheiro","transferencia","multicaixa","referencia"])->random();
        return [
            "aluno_id" => $alunoId,
            "plano_id" => null,
            "propina_id" => $propId,
            "emolumento_id" => $emolId,
            "referencia" => "PAG-" . Str::upper(Str::random(10)),
            "valor" => $valor,
            "tipo" => $tipo,
            "mes_referencia" => $mesRef,
            "metodo" => $status === "pago" ? $metodo : "dinheiro",
            "status" => $status,
            "data_vencimento" => $venc,
            "data_pagamento" => $pago,
            "created_at" => now(),
            "updated_at" => now(),
        ];
    }

    private function seedNotas(array $alunoIds, array $turmaIds): void
    {
        $this->info("A lançar notas do 1º trimestre...");
        $alunoTurma = DB::table("matriculas")
            ->whereIn("aluno_id", $alunoIds)
            ->where("ano_letivo", self::ANO_LECTIVO)
            ->pluck("turma_id", "aluno_id")->toArray();
        $disciplinas = array_values($this->disciplinaIds);

        $batch = [];
        foreach ($alunoIds as $aid) {
            $tid = $alunoTurma[$aid] ?? null;
            if (!$tid) continue;
            foreach ($disciplinas as $did) {
                $mac = random_int(80, 200) / 10;
                $npp = random_int(80, 200) / 10;
                $npt = random_int(80, 200) / 10;
                $media = round(($mac + $npp + $npt) / 3, 2);
                $resultado = $media >= 10 ? "aprovado" : ($media >= 8 ? "em_exame" : "reprovado");
                $batch[] = [
                    "aluno_id" => $aid, "disciplina_id" => $did, "turma_id" => $tid,
                    "periodo" => "1º Trimestre", "ano_letivo" => self::ANO_LECTIVO,
                    "mac" => $mac, "npp" => $npp, "npt" => $npt, "media" => $media,
                    "resultado" => $resultado,
                    "falta_justificada" => random_int(0, 2),
                    "falta_injustificada" => random_int(0, 3),
                    "created_at" => now(), "updated_at" => now(),
                ];
                if (count($batch) >= 500) { DB::table("notas")->insert($batch); $batch = []; }
            }
        }
        if (!empty($batch)) DB::table("notas")->insert($batch);
    }

    private function seedHorarios(array $turmaIds, array $profIds): void
    {
        $this->info("A criar horários...");
        $dias = ["segunda","terca","quarta","quinta","sexta"];
        $slots = [
            ["07:00:00","08:30:00"],
            ["08:30:00","10:00:00"],
            ["10:15:00","11:45:00"],
            ["13:00:00","14:30:00"],
            ["14:30:00","16:00:00"],
        ];
        $disciplinaCodes = array_keys($this->disciplinaIds);

        foreach ($turmaIds as $tid) {
            $disc = $disciplinaCodes;
            shuffle($disc);
            $i = 0;
            foreach ($dias as $dia) {
                $turno = $this->turmaInfo[$tid]["turno"];
                $slotsTurno = $turno === "manha" ? array_slice($slots, 0, 3) : array_slice($slots, 3);
                foreach ($slotsTurno as [$ini, $fim]) {
                    if (!isset($disc[$i])) break;
                    $codDisc = $disc[$i++];
                    $didFinal = $this->disciplinaIds[$codDisc];
                    // Encontra professor da disciplina
                    $prof = collect($profIds)->where("disciplina", $codDisc)->first() ?? $profIds[0];
                    DB::table("horarios")->insert([
                        "turma_id" => $tid, "disciplina_id" => $didFinal,
                        "professor_id" => $prof["id"],
                        "dia_semana" => $dia, "hora_inicio" => $ini, "hora_fim" => $fim,
                        "sala" => "Sala " . random_int(1, 8),
                        "created_at" => now(), "updated_at" => now(),
                    ]);
                }
            }
        }
    }

    private function seedPresencas(array $alunoIds, array $turmaIds): void
    {
        $this->info("A criar presenças (últimos 5 dias)...");
        $alunoTurma = DB::table("matriculas")
            ->whereIn("aluno_id", $alunoIds)
            ->where("ano_letivo", self::ANO_LECTIVO)
            ->pluck("turma_id", "aluno_id")->toArray();
        $batch = [];
        for ($d = 1; $d <= 5; $d++) {
            $data = now()->subDays($d)->toDateString();
            if (now()->subDays($d)->isWeekend()) continue;
            foreach ($alunoIds as $aid) {
                $tid = $alunoTurma[$aid] ?? null;
                if (!$tid) continue;
                $estado = random_int(1, 100) <= 92 ? "presente" : (random_int(0,1) ? "falta_justificada" : "falta_injustificada");
                $batch[] = [
                    "aluno_id" => $aid, "turma_id" => $tid, "data" => $data,
                    "estado" => $estado, "created_at" => now(), "updated_at" => now(),
                ];
                if (count($batch) >= 500) { DB::table("presencas")->insert($batch); $batch = []; }
            }
        }
        if (!empty($batch)) DB::table("presencas")->insert($batch);
    }

    private function seedCaixa(int $adminId): void
    {
        $this->info("A criar sessões de caixa...");
        // Sessão fechada (ontem)
        $sid = DB::table("caixa_sessoes")->insertGetId([
            "codigo" => "CX-" . Str::upper(Str::random(8)),
            "operador_id" => $adminId,
            "operador_nome" => "Administrador Demo",
            "nome_caixa" => "Caixa Principal",
            "fundo_inicial" => 50000,
            "total_esperado" => 287500,
            "total_contado" => 287500,
            "diferenca" => 0,
            "abriu_em" => now()->subDay()->setTime(8, 0),
            "fechou_em" => now()->subDay()->setTime(17, 30),
            "status" => "fechada",
            "created_at" => now(), "updated_at" => now(),
        ]);
        // Sessão aberta (hoje)
        DB::table("caixa_sessoes")->insert([
            "codigo" => "CX-" . Str::upper(Str::random(8)),
            "operador_id" => $adminId,
            "operador_nome" => "Administrador Demo",
            "nome_caixa" => "Caixa Principal",
            "fundo_inicial" => 50000,
            "abriu_em" => now()->setTime(8, 0),
            "status" => "aberta",
            "created_at" => now(), "updated_at" => now(),
        ]);
    }

    private function seedBolsas(array $alunoIds): void
    {
        $this->info("A criar bolsas...");
        $fid = DB::table("financiadores")->insertGetId([
            "nome" => "Fundação Educar Angola",
            "tipo" => "fundacao",
            "nif" => "00" . random_int(10000000, 99999999),
            "email" => "bolsas@educarangola.ao",
            "telefone" => "923 100 200",
            "endereco" => "Luanda",
            "contacto_responsavel" => "Direcção de Bolsas",
            "activo" => 1,
            "created_at" => now(), "updated_at" => now(),
        ]);
        $fidInt = DB::table("financiadores")->insertGetId([
            "nome" => "Bolsa Interna — Mérito Académico",
            "tipo" => "interno",
            "activo" => 1,
            "created_at" => now(), "updated_at" => now(),
        ]);

        // 5 bolsas externas + 3 internas
        $beneficiarios = collect($alunoIds)->random(8);
        $tipos = [
            [50, "percentagem", $fid, true, true, true],
            [100, "percentagem", $fid, true, true, true],
            [75, "percentagem", $fid, true, true, true],
            [50, "percentagem", $fid, true, true, true],
            [25, "percentagem", $fid, true, false, true],
            [15000, "valor_fixo", $fidInt, true, false, false],
            [50, "percentagem", $fidInt, true, true, true],
            [30, "percentagem", $fidInt, true, false, true],
        ];
        foreach ($beneficiarios->values() as $i => $aid) {
            [$valor, $tipo, $fin, $cp, $ce, $cm] = $tipos[$i];
            DB::table("bolsas")->insert([
                "aluno_id" => $aid, "financiador_id" => $fin,
                "tipo" => $tipo, "valor" => $valor,
                "cobre_propinas" => $cp, "cobre_emolumentos" => $ce, "cobre_matricula" => $cm,
                "data_inicio" => "2025-09-01", "status" => "activa",
                "created_at" => now(), "updated_at" => now(),
            ]);
        }
    }

    private function seedFolhasPagamento(array $funcIds): void
    {
        $this->info("A criar folhas de pagamento (Abril 2026)...");
        $salarios = DB::table("funcionarios")->whereIn("id", $funcIds)->pluck("salario_base", "id");
        foreach ($funcIds as $fid) {
            $base = (float) $salarios[$fid];
            $subTransp = round($base * 0.07, 2);
            $subAlim = 25000;
            $totalSub = $subTransp + $subAlim;
            $irt = round(($base + $totalSub) * 0.10, 2);
            $inss = round($base * 0.03, 2);
            $totalDesc = $irt + $inss;
            $liquido = $base + $totalSub - $totalDesc;
            DB::table("folhas_pagamento")->insert([
                "funcionario_id" => $fid, "mes" => 4, "ano" => 2026,
                "referencia" => "FOLHA-" . Str::upper(Str::random(8)),
                "salario_base" => $base,
                "subsidios" => json_encode([
                    ["nome" => "Subsídio de Transporte", "valor" => $subTransp],
                    ["nome" => "Subsídio de Alimentação", "valor" => $subAlim],
                ]),
                "descontos" => json_encode([
                    ["nome" => "IRT", "valor" => $irt],
                    ["nome" => "INSS (3%)", "valor" => $inss],
                ]),
                "total_subsidios" => $totalSub,
                "total_descontos" => $totalDesc,
                "liquido" => $liquido,
                "estado" => "paga",
                "data_pagamento" => "2026-04-28",
                "metodo" => "transferencia",
                "created_at" => now(), "updated_at" => now(),
            ]);
        }
    }

    private function seedDocumentos(array $alunoIds): void
    {
        $this->info("A criar tipos de documento e entregas...");
        $docs = [
            ["Bilhete de Identidade", true, false, 1],
            ["Certidão de Nascimento", true, true, 2],
            ["Fotografia tipo passe", true, false, 3],
            ["Carta Médica", false, false, 4],
            ["Boletim do ano anterior", false, false, 5],
        ];
        $tipoIds = [];
        foreach ($docs as [$nome, $obrig, $bloq, $ordem]) {
            $tipoIds[] = DB::table("tipos_documento")->insertGetId([
                "nome" => $nome, "obrigatorio" => $obrig,
                "bloqueia_matricula" => $bloq,
                "aceita_upload" => 1, "ativo" => 1, "ordem" => $ordem,
                "created_at" => now(), "updated_at" => now(),
            ]);
        }
        // Para cada aluno, entrega aleatória dos obrigatórios
        $batch = [];
        foreach ($alunoIds as $aid) {
            foreach ($tipoIds as $tid) {
                $entregue = random_int(1, 100) <= 75;
                $batch[] = [
                    "aluno_id" => $aid, "tipo_documento_id" => $tid,
                    "entregue" => $entregue,
                    "data_entrega" => $entregue ? now()->subDays(random_int(10, 60))->toDateString() : null,
                    "created_at" => now(), "updated_at" => now(),
                ];
                if (count($batch) >= 500) { DB::table("aluno_documento_entregas")->insert($batch); $batch = []; }
            }
        }
        if (!empty($batch)) DB::table("aluno_documento_entregas")->insert($batch);
    }
}
