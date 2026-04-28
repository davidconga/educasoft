<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("notas", function (Blueprint $table) {
            $table->decimal("mac", 5, 2)->nullable()->after("nota_continua");
            $table->decimal("npp", 5, 2)->nullable()->after("mac");
            $table->decimal("npt", 5, 2)->nullable()->after("npp");
        });
    }
    public function down(): void {
        Schema::table("notas", function (Blueprint $table) {
            $table->dropColumn(["mac", "npp", "npt"]);
        });
    }
};
