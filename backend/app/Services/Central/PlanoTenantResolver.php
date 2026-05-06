<?php
namespace App\Services\Central;

use App\Models\Central\Assinatura;
use App\Models\Central\Escola;
use App\Models\Central\Plano;

/**
 * Resolve o plano em vigor para uma escola — fonte única para feature gating.
 * Pode ser usado tanto no fluxo central como dentro do tenant (basta ter o id da escola).
 */
class PlanoTenantResolver {
    public function paraEscola(string|Escola $escolaId): ?array {
        $escola = $escolaId instanceof Escola ? $escolaId : Escola::find($escolaId);
        if (!$escola) return null;

        $assinatura = Assinatura::where("escola_id", $escola->id)
            ->whereIn("estado", ["ativa", "trial"])
            ->orderByDesc("id")
            ->first();

        $plano = $assinatura?->plano
            ?? Plano::where("codigo", $escola->plano)->first()
            ?? Plano::where("codigo", "basico")->first();

        if (!$plano) return null;

        return [
            "codigo"        => $plano->codigo,
            "nome"          => $plano->nome,
            "preco_mensal"  => (float) $plano->preco_mensal,
            "max_alunos"    => (int) $plano->max_alunos,   // -1 = ilimitado
            "max_admins"    => (int) $plano->max_admins,   // -1 = ilimitado
            "feature_keys"  => $plano->feature_keys ?? [],
            "features"      => $plano->features ?? [],
            "estado_assinatura" => $assinatura?->estado ?? "ativa",
            "em_trial"      => $assinatura?->emTrial() ?? false,
            "data_fim_trial"=> $assinatura?->data_fim_trial?->toDateString(),
            "data_fim"      => $assinatura?->data_fim?->toDateString(),
            "proxima_renovacao" => $assinatura?->proxima_renovacao?->toDateString(),
        ];
    }

    public function temFeature(string|Escola $escolaId, string $featureKey): bool {
        $info = $this->paraEscola($escolaId);
        if (!$info) return false;
        return in_array($featureKey, $info["feature_keys"], true);
    }
}
