<?php
namespace App\Services\Central;

use App\Models\Central\Assinatura;
use App\Models\Central\Escola;
use App\Models\Central\Plano;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AssinaturaService {
    /**
     * Cria a 1ª assinatura para uma escola (chamado no acto de registo/activação).
     */
    public function criarPara(Escola $escola, Plano $plano, ?int $diasTrial = null): Assinatura {
        $diasTrial = $diasTrial ?? (int) $plano->dias_trial;
        $hoje      = Carbon::today();

        $assinatura = Assinatura::create([
            "escola_id"         => $escola->id,
            "plano_id"          => $plano->id,
            "estado"            => $diasTrial > 0 ? "trial" : "ativa",
            "data_inicio"       => $hoje->toDateString(),
            "data_fim_trial"    => $diasTrial > 0 ? $hoje->copy()->addDays($diasTrial)->toDateString() : null,
            "preco_aplicado"    => $plano->preco_mensal,
            "desconto_pct"      => 0,
            "ciclo"             => "mensal",
            "auto_renovar"      => true,
            "proxima_renovacao" => $hoje->copy()->startOfMonth()->addMonth()->toDateString(),
        ]);

        $escola->update(["plano" => $plano->codigo]);
        return $assinatura;
    }

    /**
     * Devolve a assinatura activa de uma escola, ou null se nenhuma.
     */
    public function ativaDe(Escola $escola): ?Assinatura {
        return Assinatura::where("escola_id", $escola->id)
            ->whereIn("estado", ["ativa", "trial"])
            ->orderByDesc("id")
            ->first();
    }

    /**
     * Mudar de plano.
     *   - $imediato=false (default): assinatura actual fecha no fim do mês,
     *     nova arranca no 1º dia do mês seguinte (sem pro-rata).
     *   - $imediato=true: assinatura actual fecha hoje, nova arranca hoje.
     *     Útil para downgrade/upgrade que tem de aplicar já.
     */
    public function mudarPlano(Escola $escola, Plano $novoPlano, ?float $precoCustom = null, ?float $descontoPct = null, bool $imediato = false): Assinatura {
        return DB::transaction(function () use ($escola, $novoPlano, $precoCustom, $descontoPct, $imediato) {
            $actual = $this->ativaDe($escola);
            $hoje    = Carbon::today();
            $fimMes  = Carbon::now()->endOfMonth()->toDateString();
            $proxMes = Carbon::now()->startOfMonth()->addMonth()->toDateString();

            if ($actual) {
                $actual->update([
                    "data_fim"     => $imediato ? $hoje->toDateString() : $fimMes,
                    "auto_renovar" => false,
                    "estado"       => "expirada",
                    "notas"        => trim(($actual->notas ?? "") . "\n[Mudança para " . $novoPlano->codigo . " em " . now()->format("d/m/Y") . ($imediato ? " — imediata" : "") . "]"),
                ]);
            }

            $inicio = $imediato ? $hoje->toDateString() : $proxMes;
            $nova = Assinatura::create([
                "escola_id"         => $escola->id,
                "plano_id"          => $novoPlano->id,
                "estado"            => "ativa",
                "data_inicio"       => $inicio,
                "preco_aplicado"    => $precoCustom ?? $novoPlano->preco_mensal,
                "desconto_pct"      => $descontoPct ?? 0,
                "ciclo"             => "mensal",
                "auto_renovar"      => true,
                "proxima_renovacao" => Carbon::parse($inicio)->addMonth()->toDateString(),
            ]);

            $escola->update([
                "plano"        => $novoPlano->codigo,
                "valor_mensal" => $precoCustom,
                "desconto_pct" => $descontoPct ?? 0,
            ]);

            return $nova;
        });
    }

    public function suspender(Assinatura $a, ?string $motivo = null): Assinatura {
        $a->update([
            "estado"       => "suspensa",
            "auto_renovar" => false,
            "notas"        => trim(($a->notas ?? "") . "\n[Suspensa em " . now()->format("d/m/Y H:i") . "] " . ($motivo ?? "")),
        ]);
        $a->escola?->update(["ativo" => false]);
        return $a->fresh();
    }

    public function reactivar(Assinatura $a): Assinatura {
        $a->update([
            "estado"       => "ativa",
            "auto_renovar" => true,
            "notas"        => trim(($a->notas ?? "") . "\n[Reactivada em " . now()->format("d/m/Y H:i") . "]"),
        ]);
        $a->escola?->update(["ativo" => true]);
        return $a->fresh();
    }

    public function cancelar(Assinatura $a, string $motivo, bool $imediato = false): Assinatura {
        $fim = $imediato ? now()->toDateString() : Carbon::now()->endOfMonth()->toDateString();
        $a->update([
            "estado"               => "cancelada",
            "auto_renovar"         => false,
            "data_fim"             => $fim,
            "cancelada_em"         => now(),
            "motivo_cancelamento"  => $motivo,
        ]);
        if ($imediato) $a->escola?->update(["ativo" => false]);
        return $a->fresh();
    }
}
