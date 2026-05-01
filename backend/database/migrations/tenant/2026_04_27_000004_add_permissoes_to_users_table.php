<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::connection("tenant")->hasColumn("users", "permissoes")) return;
        Schema::connection("tenant")->table("users", function (Blueprint $table) {
            $table->json("permissoes")->nullable()->after("ativo");
        });
    }

    public function down(): void {
        Schema::connection("tenant")->table("users", function (Blueprint $table) {
            $table->dropColumn("permissoes");
        });
    }
};
