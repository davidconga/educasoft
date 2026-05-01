<?php
namespace App\Jobs;

use App\Models\Tenant\LembreteConfig;
use App\Models\Tenant\LembretePagamento;
use App\Services\Tenant\MensagemTemplate;
use App\Services\Tenant\SmsGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;

class EnviarLembreteSmsJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public string $tenantCodigo,
        public int    $lembreteId
    ) {}

    public function handle(): void {
        TenantBootstrapper::run($this->tenantCodigo, function () {
            $lembrete = LembretePagamento::with(["pagamento.aluno.user"])->find($this->lembreteId);
            if (!$lembrete || $lembrete->status === "enviado") return;

            $pag   = $lembrete->pagamento;
            $aluno = $pag?->aluno;
            if (!$pag || !$aluno) {
                $lembrete->update(["status" => "falhou", "erro" => "Pagamento ou aluno em falta."]);
                return;
            }

            $cfg = LembreteConfig::current();
            $msg = MensagemTemplate::render("sms", $pag, $aluno, $cfg);

            $lembrete->increment("tentativas");
            $resultado = (new SmsGateway($cfg))->enviar($lembrete->destinatario, $msg);

            if ($resultado["ok"]) {
                $lembrete->update([
                    "status"     => "enviado",
                    "enviado_em" => Carbon::now(),
                    "mensagem"   => $msg,
                    "erro"       => null,
                ]);
            } else {
                $lembrete->update([
                    "status"   => "falhou",
                    "mensagem" => $msg,
                    "erro"     => $resultado["erro"] ?? "Falha desconhecida no gateway SMS.",
                ]);
                if ($lembrete->tentativas < $this->tries) {
                    throw new \RuntimeException($resultado["erro"] ?? "Falha SMS");
                }
            }
        });
    }
}
