<?php
namespace App\Services\Tenant;

use App\Models\Tenant\LembreteConfig;
use App\Models\Tenant\LembretePagamento;
use App\Models\Tenant\Pagamento;
use Illuminate\Support\Carbon;

/**
 * Selecciona candidatos a lembrete e regista-os em `lembretes_pagamento`
 * com status "pendente". Não envia — apenas marca o que deve ser enviado.
 *
 * Idempotente: se já existe lembrete para (pagamento, canal, gatilho, dias_offset)
 * com status `enviado`, não cria duplicado.
 */
class LembreteScheduler {
    public function __construct(private LembreteConfig $config) {}

    public static function fromConfig(): self {
        return new self(LembreteConfig::current());
    }

    /**
     * Gera lembretes pendentes para a data fornecida (default: hoje).
     * @return array{candidatos:int, criados:int, ja_existiam:int}
     */
    public function gerar(?Carbon $hoje = null): array {
        $hoje = $hoje ?? Carbon::today();
        $cfg  = $this->config;

        $diasAntes  = collect($cfg->dias_antes  ?? [])->map(fn($d) => -1 * abs((int)$d));
        $diasDepois = collect($cfg->dias_depois ?? [])->map(fn($d) => abs((int)$d));
        $offsets    = $diasAntes->merge($diasDepois)->unique()->values();

        if ($offsets->isEmpty()) {
            return ["candidatos" => 0, "criados" => 0, "ja_existiam" => 0];
        }

        $candidatos = 0;
        $criados = 0;
        $jaExistiam = 0;

        foreach ($offsets as $offset) {
            // dataAlvo = hoje - offset
            //   offset = -3 (3d antes do venc) → procuramos vencimentos em (hoje + 3)
            //   offset =  7 (7d depois)        → procuramos vencimentos em (hoje - 7)
            $dataAlvo = $hoje->copy()->subDays($offset);
            $gatilho  = $offset < 0 ? "antes" : "depois";

            $pagamentos = Pagamento::with("aluno.user")
                ->whereIn("status", ["pendente","vencido"])
                ->where("tipo", "mensalidade")
                ->whereDate("data_vencimento", $dataAlvo->toDateString())
                ->get();

            foreach ($pagamentos as $pag) {
                $candidatos++;
                $aluno = $pag->aluno;
                if (!$aluno) continue;

                if ($cfg->email_activo) {
                    $email = $aluno->email_responsavel ?: $aluno->user?->email;
                    if ($email) {
                        if ($this->criarSeNovo($pag, $aluno, "email", $email, $gatilho, $offset)) {
                            $criados++;
                        } else {
                            $jaExistiam++;
                        }
                    }
                }

                if ($cfg->sms_activo) {
                    $tel = $aluno->telefone_responsavel ?: $aluno->user?->telefone;
                    if ($tel) {
                        if ($this->criarSeNovo($pag, $aluno, "sms", $tel, $gatilho, $offset)) {
                            $criados++;
                        } else {
                            $jaExistiam++;
                        }
                    }
                }
            }
        }

        return ["candidatos" => $candidatos, "criados" => $criados, "ja_existiam" => $jaExistiam];
    }

    private function criarSeNovo(Pagamento $pag, \App\Models\Tenant\Aluno $aluno, string $canal, string $destinatario, string $gatilho, int $offset): bool {
        $existe = LembretePagamento::where("pagamento_id", $pag->id)
            ->where("canal", $canal)
            ->where("gatilho", $gatilho)
            ->where("dias_offset", $offset)
            ->whereIn("status", ["enviado","pendente"])
            ->exists();
        if ($existe) return false;

        LembretePagamento::create([
            "pagamento_id" => $pag->id,
            "aluno_id"     => $aluno->id,
            "canal"        => $canal,
            "destinatario" => $destinatario,
            "gatilho"      => $gatilho,
            "dias_offset"  => $offset,
            "mensagem"     => MensagemTemplate::render($canal, $pag, $aluno, $this->config),
            "status"       => "pendente",
        ]);
        return true;
    }
}
