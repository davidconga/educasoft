<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("tenants", function (Blueprint $table) {
            $table->boolean("vendus_ativo")->default(false);
            $table->text("vendus_api_key")->nullable();
            $table->string("vendus_register_id")->nullable();
            $table->string("vendus_serie")->nullable();
            $table->string("vendus_modo", 10)->default("live");
        });
    }
    public function down(): void {
        Schema::table("tenants", function (Blueprint $table) {
            $table->dropColumn([
                "vendus_ativo",
                "vendus_api_key",
                "vendus_register_id",
                "vendus_serie",
                "vendus_modo",
            ]);
        });
    }
};
