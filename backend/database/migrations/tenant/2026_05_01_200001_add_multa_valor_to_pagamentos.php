<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("pagamentos", "multa_valor")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->decimal("multa_valor", 12, 2)->default(0)->after("valor");
                $t->unsignedBigInteger("multa_id")->nullable()->after("multa_valor");
                $t->foreign("multa_id")->references("id")->on("precario_multas")->nullOnDelete();
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn("pagamentos", "multa_valor")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->dropForeign(["multa_id"]);
                $t->dropColumn(["multa_valor","multa_id"]);
            });
        }
    }
};
