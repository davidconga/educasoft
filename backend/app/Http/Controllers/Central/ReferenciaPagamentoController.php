<?php
namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\FacturaCentral;
use App\Models\Central\ReferenciaPagamento;
use App\Services\Central\FacturaCentralService;
use App\Services\Central\WhatsappGateway;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ReferenciaPagamentoController extends Controller {
    public function index(Request $request) {
        $q = ReferenciaPagamento::with("factura:id,numero,escola_id,cliente_nome")
            ->orderByDesc("created_at");
        if ($estado = $request->query("estado")) $q->where("estado", $estado);
        return response()->json($q->paginate(20));
    }

    /**
     * Webhook público para o gateway notificar um pagamento.
     * O endpoint deve estar protegido por chave/secret partilhado em env REF_WEBHOOK_SECRET.
     */
    public function webhook(Request $request, FacturaCentralService $facturaService) {
        $secret = env("REF_WEBHOOK_SECRET");
        if ($secret) {
            $token = $request->header("X-Webhook-Token") ?? $request->query("token");
            if (!hash_equals($secret, (string) $token)) {
                return response()->json(["message" => "Não autorizado."], 401);
            }
        }

        $data = $request->validate([
            "entidade"      => "required|string",
            "referencia"    => "required|string",
            "valor"         => "required|numeric",
            "transacao_ref" => "nullable|string",
            "estado"        => "nullable|string",
        ]);

        $ref = ReferenciaPagamento::where("entidade", $data["entidade"])
            ->where("referencia", $data["referencia"])
            ->first();

        if (!$ref) {
            Log::warning("Webhook ref desconhecida", $data);
            return response()->json(["message" => "Referência desconhecida."], 404);
        }

        $estadoFinal = strtolower($data["estado"] ?? "pago");
        if ($estadoFinal !== "pago" && $estadoFinal !== "paid") {
            $ref->update([
                "estado"          => $estadoFinal,
                "gateway_response" => array_merge((array) $ref->gateway_response, ["webhook" => $data]),
            ]);
            return response()->json(["ok" => true, "estado" => $ref->estado]);
        }

        $ref->update([
            "estado"           => "pago",
            "paga_em"          => now(),
            "transacao_ref"    => $data["transacao_ref"] ?? null,
            "gateway_response" => array_merge((array) $ref->gateway_response, ["webhook" => $data]),
        ]);

        $factura = FacturaCentral::find($ref->factura_id);
        if ($factura && $factura->estado !== "paga") {
            $facturaService->marcarPaga($factura, "referencia_multicaixa", $data["transacao_ref"] ?? $ref->referencia);

            // Se for o 1º pagamento e a escola ainda está pendente de activação, notifica super-admin
            $escola = $factura->escola;
            $eraPrimeira = FacturaCentral::where("escola_id", $escola->id)
                ->where("estado", "paga")->count() === 1;
            if ($escola && !$escola->ativo && $eraPrimeira) {
                $this->notificarSuperAdminPrimeiroPagamento($escola, $factura);
            }
        }

        return response()->json(["ok" => true]);
    }

    private function notificarSuperAdminPrimeiroPagamento($escola, $factura): void {
        $numero = env("SUPER_ADMIN_WHATSAPP");
        if (!$numero) return;
        $msg = "💰 Pagamento recebido!\n\n" .
               "Escola: {$escola->nome}\n" .
               "Plano: " . ucfirst($escola->plano) . "\n" .
               "Factura: {$factura->numero}\n" .
               "Total: " . number_format((float) $factura->total, 2, ",", ".") . " AOA\n\n" .
               "Activa em: " . rtrim(env("SUPER_ADMIN_URL", "https://educaja.ao/super-admin"), "/") . "/escolas";
        try {
            WhatsappGateway::fromEnv()->enviar($numero, $msg, "primeiro_pagamento", (string) $escola->id);
        } catch (\Throwable $e) {
            Log::warning("Falha a notificar super-admin do pagamento: " . $e->getMessage());
        }
    }
}
