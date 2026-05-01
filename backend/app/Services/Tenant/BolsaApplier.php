<?php
namespace App\Services\Tenant;

use App\Models\Tenant\Aluno;
use App\Models\Tenant\Bolsa;
use App\Models\Tenant\Matricula;
use App\Models\Tenant\Pagamento;

/**
 * Aplica bolsas activas a pagamentos do aluno.
 *
 * Regras (definidas pelo utilizador):
 *   • 1.c — bolsa em % ou valor fixo
 *   • 2.c — pode cobrir propinas, emolumentos e matrícula
 *   • 3.b — vigência enquanto a matrícula está activa
 *   • 4.c — financiador interno (escola) ou externo (govt/empresa/fundação)
 *   • 5.c — factura ao aluno fica com valor CHEIO; bolsa_valor regista quanto
 *          o financiador cobriu. Recibo de bolsa emitido separadamente.
 *
 * O valor a entregar pelo aluno em Tesouraria = valor + multa − bolsa_valor.
 * O valor fiscal (factura SAFT) mantém-se cheio para preservar a integridade
 * da contabilidade fiscal.
 */
class BolsaApplier {
    /**
     * Procura a bolsa activa que cobre o tipo de pagamento dado, para o aluno.
     * Devolve null se não houver bolsa aplicável.
     */
    public static function bolsaParaTipo(int $alunoId, string $tipo): ?Bolsa {
        return Bolsa::where("aluno_id", $alunoId)
            ->where("status", "activa")
            ->whereHas("matricula", fn($q) => $q->where("status", "confirmada"))
            ->get()
            ->first(fn(Bolsa $b) => $b->cobre($tipo));
    }

    /**
     * Aplica bolsa a um Pagamento (ainda não persistido ou recém-criado).
     * Devolve o desconto aplicado (0 se nada). Atualiza in-place os campos
     * bolsa_id, bolsa_financiador_id, bolsa_valor.
     *
     * Se já tiver bolsa associada, recalcula com base no valor actual.
     */
    public static function aplicar(Pagamento $pag): float {
        // Pagamentos pagos não devem ser recalculados (factura já assinada)
        if ($pag->status === "pago") return (float) ($pag->bolsa_valor ?? 0);

        $bolsa = $pag->bolsa
            ?? self::bolsaParaTipo((int)$pag->aluno_id, (string)$pag->tipo);

        if (!$bolsa) {
            $pag->bolsa_id              = null;
            $pag->bolsa_financiador_id  = null;
            $pag->bolsa_valor           = 0;
            return 0;
        }
        if (!$bolsa->cobre((string)$pag->tipo)) return 0;

        $desconto = $bolsa->calcularDesconto((float)$pag->valor);
        $pag->bolsa_id             = $bolsa->id;
        $pag->bolsa_financiador_id = $bolsa->financiador_id; // null se interna
        $pag->bolsa_valor          = $desconto;
        return $desconto;
    }

    /**
     * Aplica bolsa a uma colecção de pagamentos in-place e persiste.
     * Útil ao gerar propinas anuais, lote de emolumentos, etc.
     */
    public static function aplicarColeccao($pagamentos): int {
        $contador = 0;
        foreach ($pagamentos as $p) {
            $desc = self::aplicar($p);
            if ($desc > 0.009) {
                $p->save();
                $contador++;
            }
        }
        return $contador;
    }
}
