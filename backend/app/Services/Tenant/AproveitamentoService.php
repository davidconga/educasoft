<?php
namespace App\Services\Tenant;

use App\Models\Tenant\Matricula;
use App\Models\Tenant\Nota;
use App\Models\Tenant\RegraAproveitamento;
use Illuminate\Support\Collection;

/**
 * Calcula o aproveitamento (passou/reprovou) de um aluno num ano lectivo
 * aplicando a regra configurada que melhor se encaixa no escopo
 * (classe > curso > nivel_ensino > geral, com tiebreak por prioridade).
 *
 * Estrutura esperada de RegraAproveitamento.config (JSON):
 * {
 *   "calculo_media_disciplina": {
 *     "metodo": "media_aritmetica" | "media_ponderada",
 *     "pesos_periodos": {"1":1,"2":1,"3":1},      // p/ ponderada
 *     "incluir_exame": true|false                  // (média_periodos + exame) / 2
 *   },
 *   "calculo_media_geral": {
 *     "metodo": "media_aritmetica" | "media_ponderada_por_disciplina",
 *     "pesos_disciplinas": {"<disciplina_id>": peso}
 *   },
 *   "criterios_aprovacao": {
 *     "media_geral_minima": 10,
 *     "media_disciplina_minima": 8,
 *     "max_disciplinas_reprovadas": 2,
 *     "disciplinas_criticas": [{"disciplina_id":5,"media_minima":10}]
 *   },
 *   "comportamento_reprovado": "repete" | "rejeita" | "pendente_admin"
 * }
 */
class AproveitamentoService {

    public function resolverRegra(?int $cursoId, ?int $classeId, ?string $nivelEnsino, ?string $anoLetivo): ?RegraAproveitamento {
        $candidatas = RegraAproveitamento::where("ativa", true)->get()->filter(function ($r) use ($cursoId, $classeId, $nivelEnsino, $anoLetivo) {
            return ($r->classe_id    === null || $r->classe_id    == $classeId)
                && ($r->curso_id     === null || $r->curso_id     == $cursoId)
                && ($r->nivel_ensino === null || $r->nivel_ensino === $nivelEnsino)
                && ($r->ano_letivo   === null || $r->ano_letivo   === $anoLetivo);
        });
        if ($candidatas->isEmpty()) return null;
        return $candidatas->sortByDesc(fn($r) => $r->especificidade() * 1000 + $r->prioridade)->first();
    }

    /**
     * Calcula o aproveitamento de um aluno num ano lectivo.
     * Retorna array com status (aprovado|reprovado|sem_regra|sem_notas), médias e detalhes.
     */
    public function calcular(int $alunoId, string $anoLetivo, ?int $turmaId = null): array {
        $matriculaQuery = Matricula::with("turma.classe.curso")
            ->where("aluno_id", $alunoId)
            ->where("ano_letivo", $anoLetivo);
        if ($turmaId) $matriculaQuery->where("turma_id", $turmaId);
        $matricula = $matriculaQuery->latest("id")->first();

        if (!$matricula) {
            return ["status" => "sem_matricula", "aluno_id" => $alunoId, "ano_letivo" => $anoLetivo];
        }

        $turma       = $matricula->turma;
        $classe      = $turma?->classe;
        $curso       = $classe?->curso;
        $nivelEnsino = $curso?->nivel_ensino;

        $regra = $this->resolverRegra($curso?->id, $classe?->id, $nivelEnsino, $anoLetivo);
        if (!$regra) {
            return [
                "status"      => "sem_regra",
                "matricula_id"=> $matricula->id,
                "escopo"      => compact("nivelEnsino") + ["curso_id" => $curso?->id, "classe_id" => $classe?->id],
            ];
        }

        $config = $regra->config ?? [];

        $notas = Nota::where("aluno_id", $alunoId)->where("ano_letivo", $anoLetivo)->get();
        if ($notas->isEmpty()) {
            return [
                "status"        => "sem_notas",
                "matricula_id"  => $matricula->id,
                "regra_aplicada"=> ["id" => $regra->id, "nome" => $regra->nome],
            ];
        }

        $mediasPorDisciplina = $this->mediasPorDisciplina($notas, $config["calculo_media_disciplina"] ?? []);
        $mediaGeral          = $this->mediaGeral($mediasPorDisciplina, $config["calculo_media_geral"] ?? []);

        $reprovacoes = $this->avaliarCriterios(
            $mediaGeral,
            $mediasPorDisciplina,
            $config["criterios_aprovacao"] ?? []
        );

        return [
            "status"               => empty($reprovacoes) ? "aprovado" : "reprovado",
            "matricula_id"         => $matricula->id,
            "media_geral"          => $mediaGeral,
            "medias_disciplinas"   => $mediasPorDisciplina,
            "reprovacoes"          => $reprovacoes,
            "regra_aplicada"       => ["id" => $regra->id, "nome" => $regra->nome],
            "comportamento_reprovado" => $config["comportamento_reprovado"] ?? "pendente_admin",
        ];
    }

    /** Map [disciplina_id => media_anual]. */
    private function mediasPorDisciplina(Collection $notas, array $cfg): array {
        $metodo        = $cfg["metodo"] ?? "media_aritmetica";
        $pesosPeriodos = $cfg["pesos_periodos"] ?? [];
        $incluirExame  = (bool)($cfg["incluir_exame"] ?? false);

        $out = [];
        foreach ($notas->groupBy("disciplina_id") as $disciplinaId => $rows) {
            // 1 média por período (a mais recente, se houver múltiplas)
            $porPeriodo = $rows->groupBy("periodo")->map(fn($g) => $g->sortByDesc("id")->first()->media)->filter(fn($v) => $v !== null);
            if ($porPeriodo->isEmpty()) { $out[$disciplinaId] = null; continue; }

            if ($metodo === "media_ponderada" && !empty($pesosPeriodos)) {
                $somaPond = 0; $somaPesos = 0;
                foreach ($porPeriodo as $periodo => $m) {
                    $peso = (float)($pesosPeriodos[(string)$periodo] ?? $pesosPeriodos[$periodo] ?? 1);
                    $somaPond += $m * $peso;
                    $somaPesos += $peso;
                }
                $base = $somaPesos > 0 ? $somaPond / $somaPesos : null;
            } else {
                $base = $porPeriodo->avg();
            }

            if ($incluirExame) {
                $exame = $rows->whereNotNull("nota_exame")->sortByDesc("id")->first()?->nota_exame;
                if ($exame !== null && $base !== null) {
                    $base = ($base + $exame) / 2;
                }
            }

            $out[$disciplinaId] = $base !== null ? round($base, 2) : null;
        }
        return $out;
    }

    private function mediaGeral(array $medias, array $cfg): ?float {
        $metodo = $cfg["metodo"] ?? "media_aritmetica";
        $pesos  = $cfg["pesos_disciplinas"] ?? [];
        $valores = array_filter($medias, fn($v) => $v !== null);
        if (empty($valores)) return null;

        if ($metodo === "media_ponderada_por_disciplina" && !empty($pesos)) {
            $somaPond = 0; $somaPesos = 0;
            foreach ($valores as $dId => $m) {
                $peso = (float)($pesos[(string)$dId] ?? $pesos[$dId] ?? 1);
                $somaPond += $m * $peso;
                $somaPesos += $peso;
            }
            return $somaPesos > 0 ? round($somaPond / $somaPesos, 2) : null;
        }
        return round(array_sum($valores) / count($valores), 2);
    }

    private function avaliarCriterios(?float $mediaGeral, array $mediasDisc, array $crit): array {
        $reprovacoes = [];
        $minGeral    = $crit["media_geral_minima"] ?? null;
        $minDisc     = $crit["media_disciplina_minima"] ?? null;
        $maxRepr     = $crit["max_disciplinas_reprovadas"] ?? null;
        $criticas    = $crit["disciplinas_criticas"] ?? [];

        if ($minGeral !== null && ($mediaGeral === null || $mediaGeral < $minGeral)) {
            $reprovacoes[] = "Média geral " . ($mediaGeral ?? "n/a") . " < {$minGeral}";
        }

        if ($minDisc !== null) {
            $reprovadas = collect($mediasDisc)->filter(fn($m) => $m === null || $m < $minDisc);
            if ($maxRepr !== null && $reprovadas->count() > $maxRepr) {
                $reprovacoes[] = "Reprovado em {$reprovadas->count()} disciplinas (máx: {$maxRepr})";
            } elseif ($maxRepr === null && $reprovadas->isNotEmpty()) {
                foreach ($reprovadas as $dId => $m) {
                    $reprovacoes[] = "Disciplina #{$dId} média " . ($m ?? "n/a") . " < {$minDisc}";
                }
            }
        }

        foreach ($criticas as $c) {
            $dId = $c["disciplina_id"] ?? null;
            $min = $c["media_minima"] ?? null;
            if ($dId === null || $min === null) continue;
            $m = $mediasDisc[$dId] ?? null;
            if ($m === null || $m < $min) {
                $reprovacoes[] = "Disciplina crítica #{$dId} média " . ($m ?? "n/a") . " < {$min}";
            }
        }

        return $reprovacoes;
    }
}
