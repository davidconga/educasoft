<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("curso_disciplinas", "classe_id")) {
            Schema::table("curso_disciplinas", function (Blueprint $t) {
                $t->unsignedBigInteger("classe_id")->nullable()->after("curso_id");
                $t->foreign("classe_id")->references("id")->on("classes")->nullOnDelete();
            });
        }
    }

    public function down(): void {
        if (Schema::hasColumn("curso_disciplinas", "classe_id")) {
            Schema::table("curso_disciplinas", function (Blueprint $t) {
                $t->dropForeign(["classe_id"]);
                $t->dropColumn("classe_id");
            });
        }
    }
};
