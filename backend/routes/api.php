<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Central\AuthController;
use App\Http\Controllers\Central\EscolaController;
use App\Http\Controllers\Central\RegisterController;
use App\Http\Controllers\Central\PasswordResetController;
use App\Http\Controllers\Central\ContactoController;
use App\Http\Controllers\Central\SiteChatController;
use App\Http\Controllers\Central\ClienteController;
use App\Http\Controllers\Central\FacturaCentralController;
use App\Http\Controllers\Central\ComprovativoController;
use App\Http\Controllers\Central\ReferenciaPagamentoController;
use App\Http\Controllers\Central\PlanoController;
use App\Http\Controllers\Central\AssinaturaController;
use App\Http\Controllers\Central\TermoController;
use App\Http\Controllers\Central\VendusController;
use App\Http\Controllers\Central\PublicVerificationController as CentralPublicVerificationController;

Route::prefix("v1")->group(function () {
    // Public routes
    Route::post("auth/login", [AuthController::class, "login"]);
    Route::get("planos", [RegisterController::class, "planos"]);
    Route::post("register", [RegisterController::class, "store"]);
    Route::get("cadastros/{codigo}/estado", [RegisterController::class, "estado"]);
    Route::get("termos/atual", [TermoController::class, "atual"]);
    Route::post("forgot-password", [PasswordResetController::class, "forgotPassword"]);
    Route::post("reset-password", [PasswordResetController::class, "resetPassword"]);
    Route::post("contacto", [ContactoController::class, "store"]);

    // Site public chat (visitor)
    Route::post("site/chat/iniciar", [SiteChatController::class, "iniciar"]);
    Route::get("site/chat/{token}/mensagens", [SiteChatController::class, "mensagensPublico"]);
    Route::post("site/chat/{token}/mensagens", [SiteChatController::class, "enviarPublico"]);

    // Webhook público para confirmação de pagamento por referência
    Route::post("pagamentos/webhook", [ReferenciaPagamentoController::class, "webhook"]);

    // Verificação pública de documentos centrais (via QR)
    Route::get("public/factura/{numero}",      [CentralPublicVerificationController::class, "factura"])->where("numero", ".*");
    Route::get("public/comprovativo/{numero}", [CentralPublicVerificationController::class, "comprovativo"])->where("numero", ".*");

    Route::middleware("auth:sanctum")->group(function () {
        Route::post("auth/logout", [AuthController::class, "logout"]);
        Route::get("dashboard", [EscolaController::class, "dashboard"]);
        Route::post("escolas/{escola}/activate", [EscolaController::class, "activate"]);
        Route::post("escolas/{escola}/deactivate", [EscolaController::class, "deactivate"]);
        Route::post("escolas/{escola}/impersonate", [EscolaController::class, "impersonate"]);
        Route::get("escolas/{escola}/impersonations", [EscolaController::class, "impersonationsHistory"]);
        Route::apiResource("escolas", EscolaController::class);

        // Super-admin: gestão de contactos
        Route::get("contactos", [ContactoController::class, "index"]);
        Route::patch("contactos/{contacto}", [ContactoController::class, "update"]);
        Route::delete("contactos/{contacto}", [ContactoController::class, "destroy"]);

        // Super-admin: gestão do chat do site
        Route::get("site-chats", [SiteChatController::class, "index"]);
        Route::get("site-chats/sondagem", [SiteChatController::class, "sondagem"]);
        Route::get("site-chats/{chat}/mensagens", [SiteChatController::class, "mensagens"]);
        Route::post("site-chats/{chat}/mensagens", [SiteChatController::class, "enviarAdmin"]);
        Route::patch("site-chats/{chat}", [SiteChatController::class, "update"]);
        Route::delete("site-chats/{chat}", [SiteChatController::class, "destroy"]);

        // Super-admin: clientes (visão de facturação das escolas)
        Route::get("clientes", [ClienteController::class, "index"]);
        Route::get("clientes/{escola}", [ClienteController::class, "show"]);
        Route::patch("clientes/{escola}", [ClienteController::class, "update"]);

        // Super-admin: facturas
        Route::get("facturas", [FacturaCentralController::class, "index"]);
        Route::post("facturas", [FacturaCentralController::class, "store"]);
        Route::get("facturas/{factura}", [FacturaCentralController::class, "show"]);
        Route::get("facturas/{factura}/pdf", [FacturaCentralController::class, "pdf"]);
        Route::post("facturas/{factura}/marcar-paga", [FacturaCentralController::class, "marcarPaga"]);
        Route::post("facturas/{factura}/anular", [FacturaCentralController::class, "anular"]);
        Route::post("facturas/{factura}/referencia", [FacturaCentralController::class, "gerarReferencia"]);
        Route::post("facturas/{factura}/vendus/emitir", [FacturaCentralController::class, "emitirVendus"]);

        // Super-admin: comprovativos
        Route::get("comprovativos", [ComprovativoController::class, "index"]);
        Route::get("comprovativos/{comprovativo}/pdf", [ComprovativoController::class, "pdf"]);

        // Super-admin: referências de pagamento
        Route::get("referencias", [ReferenciaPagamentoController::class, "index"]);

        // Super-admin: gestão de planos
        Route::get("planos-admin", [PlanoController::class, "index"]);
        Route::post("planos-admin", [PlanoController::class, "store"]);
        Route::get("planos-admin/{plano}", [PlanoController::class, "show"]);
        Route::patch("planos-admin/{plano}", [PlanoController::class, "update"]);
        Route::delete("planos-admin/{plano}", [PlanoController::class, "destroy"]);

        // Super-admin: assinaturas
        Route::get("assinaturas", [AssinaturaController::class, "index"]);
        Route::get("assinaturas/{assinatura}", [AssinaturaController::class, "show"]);
        Route::post("assinaturas/{assinatura}/suspender", [AssinaturaController::class, "suspender"]);
        Route::post("assinaturas/{assinatura}/reactivar", [AssinaturaController::class, "reactivar"]);
        Route::post("assinaturas/{assinatura}/cancelar", [AssinaturaController::class, "cancelar"]);
        Route::post("clientes/{escola}/mudar-plano", [AssinaturaController::class, "mudarPlano"]);

        // Super-admin: integração Vendus (creds globais do operador)
        Route::get("integracoes/vendus", [VendusController::class, "show"]);
        Route::post("integracoes/vendus/test", [VendusController::class, "testar"]);

        // Super-admin: termos e condições
        Route::get("termos", [TermoController::class, "index"]);
        Route::post("termos", [TermoController::class, "store"]);
        Route::get("termos/{termo}", [TermoController::class, "show"]);
        Route::patch("termos/{termo}", [TermoController::class, "update"]);
        Route::delete("termos/{termo}", [TermoController::class, "destroy"]);
    });
});
