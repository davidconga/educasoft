<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            $t->unsignedBigInteger("caixa_sessao_id")->nullable()->index();
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            $t->dropColumn("caixa_sessao_id");
        });
    }
};
