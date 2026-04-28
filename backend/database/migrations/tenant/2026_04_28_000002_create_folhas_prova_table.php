<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::connection('tenant')->create('folhas_prova', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('disciplina');
            $table->string('periodo')->nullable();
            $table->date('data_prova')->nullable();
            $table->string('classe')->nullable();
            $table->string('turma')->nullable();
            $table->string('professor')->nullable();
            $table->string('ano_letivo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::connection('tenant')->dropIfExists('folhas_prova');
    }
};
