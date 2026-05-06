<?php
namespace App\Services\Central;

use App\Models\Central\Assinatura;
use App\Models\Central\Escola;
use App\Models\Central\FacturaCentral;
use App\Models\Central\Plano;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Geração de facturas mensais para clientes Educajá (escolas).
 *
 * Fontes do preço aplicado, por ordem:
 *   1. Assinatura activa (preco_aplicado + desconto_pct snapshotted no momento)
 *   2. Override em tenants.valor_mensal
 *   3. Plano (planos.preco_mensal)
 */
class FacturaCentralService {
    public const IVA_TAXA = 14.00;

    public function gerarPara(Escola $escola, ?Carbon $mes = null): ?FacturaCentral {
        $mes ??= Carbon::now()->startOfMonth();
        $inicio = $mes->copy()->startOfMonth();
        $fim    = $mes->copy()->endOfMonth();

        // Idempotência: já existe factura para este período?
        $existente = FacturaCentral::where("escola_id", $escola->id)
            ->whereDate("periodo_inicio", $inicio)
            ->first();
        if ($existente) return $existente;

        $assinatura = $this->assinaturaParaPeriodo($escola, $inicio);

        // Não emitir se assinatura cancelada/suspensa antes do início do período
        if ($assinatura && in_array($assinatura->estado, ["suspensa", "cancelada"], true)) {
            return null;
        }
        // Trial activo: não factura
        if ($assinatura?->emTrial()) return null;

        [$valorBase, $descontoPct] = $this->precoAplicavel($escola, $assinatura);
        if ($valorBase <= 0) return null;

        $descontoValor = round($valorBase * $descontoPct / 100, 2);
        $subtotal      = round($valorBase - $descontoValor, 2);
        $ivaValor      = round($subtotal * self::IVA_TAXA / 100, 2);
        $total         = round($subtotal + $ivaValor, 2);

        $diaVenc = max(1, min(28, (int) ($escola->dia_vencimento ?? 5)));
        $vencimento = $inicio->copy()->day($diaVenc);
        if ($vencimento->lessThan(Carbon::today())) {
            $vencimento = Carbon::today()->addDays(7);
        }

        return DB::transaction(function () use ($escola, $inicio, $fim, $valorBase, $descontoPct, $descontoValor, $ivaValor, $total, $vencimento) {
            $ano    = $inicio->year;
            $proxN  = (FacturaCentral::where("ano", $ano)->where("serie", "FT")->max("id") ?? 0) + 1;
            $numero = sprintf("FT %d/%05d", $ano, $proxN);

            $factura = FacturaCentral::create([
                "escola_id"        => $escola->id,
                "numero"           => $numero,
                "serie"            => "FT",
                "ano"              => $ano,
                "plano"            => $escola->plano,
                "periodo_inicio"   => $inicio->toDateString(),
                "periodo_fim"      => $fim->toDateString(),
                "data_emissao"     => Carbon::today()->toDateString(),
                "data_vencimento"  => $vencimento->toDateString(),
                "cliente_nome"     => $escola->nome,
                "cliente_nif"      => $escola->nif,
                "cliente_email"    => $escola->email_facturacao ?? $escola->email,
                "cliente_morada"   => $escola->endereco,
                "subtotal"         => $valorBase,
                "desconto_pct"     => $descontoPct,
                "desconto_valor"   => $descontoValor,
                "iva_taxa"         => self::IVA_TAXA,
                "iva_valor"        => $ivaValor,
                "total"            => $total,
                "estado"           => "pendente",
            ]);

            (new FacturaCentralSigner())->assinar($factura);

            // Auto-emissão Vendus (best-effort; falhas só ficam registadas em vendus_erro/log)
            try {
                (new VendusEmitter())->emitirFacturaCentral($factura);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Vendus auto-emissão (factura central) falhou: " . $e->getMessage(), ["factura_id" => $factura->id]);
            }

            return $factura->fresh();
        });
    }

    public function valorMensalDe(Escola $escola): float {
        $assinatura = $escola->relationLoaded("assinaturaAtiva")
            ? $escola->assinaturaAtiva
            : $this->assinaturaParaPeriodo($escola, Carbon::now()->startOfMonth());
        [$valor] = $this->precoAplicavel($escola, $assinatura);
        return $valor;
    }

    public function marcarPaga(FacturaCentral $factura, string $metodo = "manual", ?string $transacao = null): FacturaCentral {
        if ($factura->estado === "paga") return $factura;
        $factura->update([
            "estado"           => "paga",
            "paga_em"          => now(),
            "metodo_pagamento" => $metodo,
            "transacao_ref"    => $transacao,
        ]);
        (new ComprovativoService())->gerarPara($factura, $metodo, $transacao);
        return $factura->fresh();
    }

    /** Devolve a assinatura aplicável a um dado mês (a que estiver activa nesse início de mês). */
    private function assinaturaParaPeriodo(Escola $escola, Carbon $inicio): ?Assinatura {
        return Assinatura::where("escola_id", $escola->id)
            ->whereDate("data_inicio", "<=", $inicio)
            ->where(function ($q) use ($inicio) {
                $q->whereNull("data_fim")->orWhereDate("data_fim", ">=", $inicio);
            })
            ->whereNotIn("estado", ["expirada"])
            ->orderByDesc("data_inicio")
            ->first()
            ?? Assinatura::where("escola_id", $escola->id)->orderByDesc("id")->first();
    }

    /** [valor base AOA, desconto %] aplicáveis. */
    private function precoAplicavel(Escola $escola, ?Assinatura $assinatura): array {
        if ($assinatura) {
            $valor = (float) $assinatura->preco_aplicado;
            if ($valor <= 0) {
                $plano = $assinatura->plano ?? Plano::find($assinatura->plano_id);
                $valor = (float) ($plano->preco_mensal ?? 0);
            }
            return [$valor, (float) $assinatura->desconto_pct];
        }
        if ($escola->valor_mensal !== null && (float) $escola->valor_mensal > 0) {
            return [(float) $escola->valor_mensal, (float) ($escola->desconto_pct ?? 0)];
        }
        $plano = Plano::where("codigo", $escola->plano)->first();
        return [(float) ($plano->preco_mensal ?? 0), (float) ($escola->desconto_pct ?? 0)];
    }
}
