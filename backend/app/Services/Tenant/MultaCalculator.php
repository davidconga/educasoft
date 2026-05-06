<?php
namespace App\Services\Tenant;

use App\Models\Tenant\Pagamento;
use App\Models\Tenant\PrecarioMulta;
use Carbon\Carbon;

/**
 * Calcula a multa por atraso para pagamentos pendentes/vencidos.
 *
 * Atribui $pag->multa_valor e $pag->multa_id em memória (não persiste).
 * A persistência fica a cargo de quem chamar (controller no momento da cobrança).
 *
 * Regras consultadas via PrecarioMulta:
 *   - aplicar_em: tipo de pagamento ('mensalidade' | 'matricula' | ... | null = todos)
 *   - dias_carencia: dias após vencimento sem multa
 *   - tipo_calculo: 'percentagem' ou 'valor'
 *   - valor: percentagem ou valor fixo
 */
class MultaCalculator {
    /**
     * @param iterable<Pagamento> $pagamentos
     */
    public static function aplicar(iterable $pagamentos): void {
        // Ordena por dias_carencia DESC — escolhemos sempre a regra MAIS agravada
        // que ainda seja aplicável ao número de dias em atraso.
        $multas = PrecarioMulta::where("ativo", true)
            ->orderByDesc("dias_carencia")
            ->get();
        if ($multas->isEmpty()) return;

        $hoje = Carbon::today();

        foreach ($pagamentos as $pag) {
            if (in_array($pag->status, ["pago", "cancelado", "estornado"], true)) continue;
            if (!$pag->data_vencimento) continue;

            $dv = Carbon::parse($pag->data_vencimento);
            $diasAtraso = $hoje->diffInDays($dv, false) * -1; // positivo = em atraso
            if ($diasAtraso <= 0) continue;

            $multa = $multas->first(function ($m) use ($pag, $diasAtraso) {
                if ($m->aplicar_em && $m->aplicar_em !== $pag->tipo) return false;
                if ($diasAtraso < (int) ($m->dias_carencia ?? 0)) return false;
                return true;
            });
            if (!$multa) continue;

            $valor = strtolower((string) $multa->tipo_calculo) === "percentagem"
                ? round((float) $pag->valor * (float) $multa->valor / 100, 2)
                : (float) $multa->valor;

            $pag->multa_valor = $valor;
            $pag->multa_id    = $multa->id;
            $pag->setRelation("multa", $multa);
        }
    }
}
