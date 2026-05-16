<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            if (!Schema::hasColumn("pagamentos", "n_impressoes")) {
                $t->unsignedSmallInteger("n_impressoes")->default(0)->after("valor_carteira");
            }
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            if (Schema::hasColumn("pagamentos", "n_impressoes")) {
                $t->dropColumn("n_impressoes");
            }
        });
    }
};
