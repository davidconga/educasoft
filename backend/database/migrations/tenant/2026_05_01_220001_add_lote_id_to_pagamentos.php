<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("pagamentos", "lote_id")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->string("lote_id", 64)->nullable()->index()->after("referencia");
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn("pagamentos", "lote_id")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->dropIndex(["lote_id"]);
                $t->dropColumn("lote_id");
            });
        }
    }
};
