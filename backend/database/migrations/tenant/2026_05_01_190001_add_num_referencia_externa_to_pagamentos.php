<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("pagamentos", "num_referencia_externa")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->string("num_referencia_externa", 100)->nullable()->after("metodo");
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn("pagamentos", "num_referencia_externa")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->dropColumn("num_referencia_externa");
            });
        }
    }
};
