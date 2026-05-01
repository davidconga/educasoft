<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("pagamentos", "valor_entregue")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->decimal("valor_entregue", 12, 2)->nullable()->after("multa_id");
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn("pagamentos", "valor_entregue")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->dropColumn("valor_entregue");
            });
        }
    }
};
