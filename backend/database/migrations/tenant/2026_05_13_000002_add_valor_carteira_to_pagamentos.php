<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            if (!Schema::hasColumn("pagamentos", "valor_carteira")) {
                $t->decimal("valor_carteira", 12, 2)->nullable()->after("bolsa_valor");
            }
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            if (Schema::hasColumn("pagamentos", "valor_carteira")) {
                $t->dropColumn("valor_carteira");
            }
        });
    }
};
