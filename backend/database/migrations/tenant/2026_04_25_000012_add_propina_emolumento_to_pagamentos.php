<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $table) {
            $table->unsignedBigInteger("propina_id")->nullable()->after("plano_id");
            $table->unsignedBigInteger("emolumento_id")->nullable()->after("propina_id");
            $table->foreign("propina_id")->references("id")->on("precario_propinas")->nullOnDelete();
            $table->foreign("emolumento_id")->references("id")->on("precario_emolumentos")->nullOnDelete();
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $table) {
            $table->dropForeign(["propina_id"]);
            $table->dropForeign(["emolumento_id"]);
            $table->dropColumn(["propina_id","emolumento_id"]);
        });
    }
};
