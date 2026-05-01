<?php
namespace App\Services\Tenant;

use App\Models\Tenant\Aluno;
use App\Models\Tenant\LembreteConfig;
use App\Models\Tenant\Pagamento;
use Illuminate\Support\Carbon;

/**
 * Renderiza placeholders dos templates de email/SMS.
 *
 * Placeholders suportados:
 *   {aluno}, {numero_aluno}, {mes}, {valor}, {vencimento},
 *   {referencia}, {escola}, {dias_atraso}.
 */
class MensagemTemplate {
    public static function render(string $canal, Pagamento $pag, Aluno $aluno, LembreteConfig $cfg): string {
        $template = $canal === "sms"
            ? ($cfg->sms_template ?? "Pagamento {referencia} de {valor} AOA vence a {vencimento}.")
            : ($cfg->email_template ?? "Pagamento {referencia} de {valor} AOA vence a {vencimento}.");

        return strtr($template, self::vars($pag, $aluno));
    }

    public static function renderAssunto(Pagamento $pag, Aluno $aluno, LembreteConfig $cfg): string {
        $assunto = $cfg->email_assunto ?: "Lembrete de pagamento de propina";
        return strtr($assunto, self::vars($pag, $aluno));
    }

    public static function vars(Pagamento $pag, Aluno $aluno): array {
        $venc = $pag->data_vencimento ? Carbon::parse($pag->data_vencimento) : null;
        $hoje = Carbon::today();
        $dias = $venc ? (int) $hoje->diffInDays($venc, false) : 0;
        $escola = app()->bound("escola") ? app("escola")->nome : "Escola";
        return [
            "{aluno}"        => $aluno->user?->nome ?? "—",
            "{numero_aluno}" => (string)($aluno->numero_aluno ?? ""),
            "{mes}"          => (string)($pag->mes_referencia ?? ""),
            "{valor}"        => number_format((float)$pag->valor, 2, ",", "."),
            "{vencimento}"   => $venc ? $venc->format("d/m/Y") : "—",
            "{referencia}"   => (string)($pag->referencia ?? ""),
            "{escola}"       => $escola,
            "{dias_atraso}"  => (string)max(0, -$dias),
        ];
    }
}
