<?php
namespace App\Jobs;

use App\Models\Central\Escola;
use App\Services\Central\WhatsappGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class NotificarAdesaoEscolaJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(public string $escolaId) {}

    public function handle(): void {
        $escola = Escola::find($this->escolaId);
        if (!$escola) return;

        $gateway = WhatsappGateway::fromEnv();
        if (!$gateway->configurado()) return;

        // Mensagem para o admin da escola (se tiver telefone)
        if ($escola->telefone) {
            $msgAdmin = $this->mensagemEscola($escola);
            $gateway->enviar(
                telefone:   $this->normalizar($escola->telefone),
                mensagem:   $msgAdmin,
                contexto:   "adesao_escola",
                referencia: $escola->id
            );
        }

        // Mensagem para super-admin
        $superNumero = env("SUPER_ADMIN_WHATSAPP");
        if ($superNumero) {
            $msgSuper = $this->mensagemSuperAdmin($escola);
            $gateway->enviar(
                telefone:   $this->normalizar($superNumero),
                mensagem:   $msgSuper,
                contexto:   "adesao_escola_super",
                referencia: $escola->id
            );
        }
    }

    private function mensagemEscola(Escola $e): string {
        return "Olá {$e->admin_nome}!\n\n" .
               "Recebemos o cadastro da escola *{$e->nome}* na plataforma Educajá. " .
               "A nossa equipa irá rever e activar o vosso acesso em breve.\n\n" .
               "Plano escolhido: " . ucfirst($e->plano) . "\n" .
               "Código: {$e->codigo}\n\n" .
               "Para qualquer dúvida, responda a esta mensagem ou escreva para contact@educaja.com.\n\n" .
               "Equipa Educajá";
    }

    private function mensagemSuperAdmin(Escola $e): string {
        return "🆕 Nova adesão Educajá\n\n" .
               "Escola: {$e->nome}\n" .
               "Código: {$e->codigo}\n" .
               "Plano: " . ucfirst($e->plano) . "\n" .
               "Email: {$e->email}\n" .
               "Telefone: " . ($e->telefone ?: "—") . "\n" .
               "Admin: {$e->admin_nome} <{$e->admin_email}>\n\n" .
               "Activar em: " . rtrim(env("SUPER_ADMIN_URL", "https://app.educaja.com/super-admin"), "/") . "/escolas";
    }

    private function normalizar(string $numero): string {
        $n = preg_replace("/[^0-9+]/", "", $numero);
        if (str_starts_with($n, "+")) return $n;
        if (strlen($n) === 9 && str_starts_with($n, "9")) return "+244" . $n;
        return $n;
    }
}
