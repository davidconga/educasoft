<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Metadados de origem offline em pagamentos.
 *
 *  - `originado_offline`  : marca o pagamento como tendo sido registado pela app
 *                           desktop/mobile enquanto sem ligação, e sincronizado
 *                           mais tarde.
 *  - `lote_offline_ref`   : referência local que aparecia no recibo provisório
 *                           (`OFF-AAAA-NNNN`). Permite cruzar com a cópia em
 *                           papel/PDF que o operador imprimiu offline.
 *  - `sincronizado_em`    : timestamp em que o servidor finalmente aceitou a
 *                           operação. Útil para auditoria.
 */
return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            $t->boolean("originado_offline")->default(false)->index();
            $t->string("lote_offline_ref", 40)->nullable()->index();
            $t->timestamp("sincronizado_em")->nullable();
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            $t->dropColumn(["originado_offline", "lote_offline_ref", "sincronizado_em"]);
        });
    }
};
