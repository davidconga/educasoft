<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('presencas_professores', function (Blueprint $table) {
            $table->string('hora_inicio', 8)->nullable()->change();
            $table->string('hora_fim', 8)->nullable()->change();
        });
    }

    public function down(): void {
        Schema::table('presencas_professores', function (Blueprint $table) {
            $table->string('hora_inicio', 5)->nullable()->change();
            $table->string('hora_fim', 5)->nullable()->change();
        });
    }
};
