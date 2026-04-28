<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('presencas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('aluno_id')->constrained('alunos')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('turmas')->cascadeOnDelete();
            $table->unsignedBigInteger('disciplina_id')->nullable();
            $table->foreign('disciplina_id')->references('id')->on('disciplinas')->nullOnDelete();
            $table->date('data');
            $table->enum('estado', ['presente', 'falta_justificada', 'falta_injustificada'])->default('presente');
            $table->string('observacao')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('presencas');
    }
};
