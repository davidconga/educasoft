<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("professores", "foto")) {
            Schema::table("professores", function (Blueprint $t) {
                $t->string("foto")->nullable()->after("data_admissao");
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn("professores", "foto")) {
            Schema::table("professores", function (Blueprint $t) {
                $t->dropColumn("foto");
            });
        }
    }
};
