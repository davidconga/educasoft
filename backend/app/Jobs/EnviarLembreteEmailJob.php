<?php
namespace App\Jobs;

use App\Mail\LembretePagamentoMail;
use App\Models\Central\Escola;
use App\Models\Tenant\LembreteConfig;
use App\Models\Tenant\LembretePagamento;
use App\Services\Tenant\MensagemTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class EnviarLembreteEmailJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 120;

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

            $cfg     = LembreteConfig::current();
            $assunto = MensagemTemplate::renderAssunto($pag, $aluno, $cfg);
            $corpo   = MensagemTemplate::render("email", $pag, $aluno, $cfg);
            $escola  = app("escola");
            $logoUrl = $escola->logo ? Storage::disk("public")->url($escola->logo) : null;

            $lembrete->increment("tentativas");
            try {
                Mail::to($lembrete->destinatario)->send(new LembretePagamentoMail(
                    assunto:    $assunto,
                    corpo:      $corpo,
                    alunoNome:  $aluno->user?->nome ?? "—",
                    escolaNome: $escola->nome ?? "Escola",
                    logoUrl:    $logoUrl,
                ));
                $lembrete->update([
                    "status"     => "enviado",
                    "enviado_em" => Carbon::now(),
                    "mensagem"   => $corpo,
                    "erro"       => null,
                ]);
            } catch (\Throwable $e) {
                $lembrete->update(["status" => "falhou", "erro" => substr($e->getMessage(), 0, 1000)]);
                throw $e;
            }
        });
    }
}
