<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('alunos', function (Blueprint $t) {
            $t->timestamp('dados_academicos_verificados_em')->nullable()->after('foto');
        });
    }

    public function down(): void {
        Schema::table('alunos', function (Blueprint $t) {
            $t->dropColumn('dados_academicos_verificados_em');
        });
    }
};
