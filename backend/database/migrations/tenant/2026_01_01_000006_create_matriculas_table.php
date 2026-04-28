<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("matriculas", function (Blueprint $table) {
            $table->id();
            $table->foreignId("aluno_id")->constrained("alunos")->cascadeOnDelete();
            $table->foreignId("turma_id")->constrained("turmas")->cascadeOnDelete();
            $table->string("ano_letivo");
            $table->enum("status", ["pendente","activa","transferida","concluida","cancelada"])->default("pendente");
            $table->date("data_matricula");
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("matriculas"); }
};
