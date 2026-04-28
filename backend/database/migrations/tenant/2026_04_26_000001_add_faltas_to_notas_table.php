<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('notas', function (Blueprint $table) {
            $table->unsignedSmallInteger('falta_justificada')->default(0)->after('resultado');
            $table->unsignedSmallInteger('falta_injustificada')->default(0)->after('falta_justificada');
        });
    }
    public function down(): void {
        Schema::table('notas', function (Blueprint $table) {
            $table->dropColumn(['falta_justificada', 'falta_injustificada']);
        });
    }
};
