<?php
namespace App\Jobs;

use App\Models\Central\Escola;
use App\Services\Central\FacturaCentralService;
use App\Services\Central\ReferenciaPagamentoGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Gera as facturas mensais de todas as escolas activas com plano pago.
 * Agenda em routes/console.php para o dia 1 de cada mês.
 */
class GerarFacturasMensaisJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public ?string $mesYm = null) {}

    public function handle(FacturaCentralService $service, ReferenciaPagamentoGateway $gw): void {
        $mes = $this->mesYm
            ? Carbon::createFromFormat("Y-m-d", $this->mesYm . "-01")
            : Carbon::now()->startOfMonth();

        $count = ["geradas" => 0, "saltadas" => 0, "erros" => 0];

        Escola::where("ativo", true)->chunk(50, function ($escolas) use ($service, $gw, $mes, &$count) {
            foreach ($escolas as $escola) {
                try {
                    $factura = $service->gerarPara($escola, $mes);
                    if (!$factura) { $count["saltadas"]++; continue; }
                    // gerar referência automaticamente
                    if ($factura->referencias()->count() === 0) {
                        $gw->gerar($factura);
                    }
                    $count["geradas"]++;
                } catch (\Throwable $e) {
                    $count["erros"]++;
                    Log::error("Falha ao gerar factura mensal para {$escola->codigo}: " . $e->getMessage());
                }
            }
        });

        Log::info("GerarFacturasMensaisJob terminou", $count + ["mes" => $mes->format("Y-m")]);
    }
}
