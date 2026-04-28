<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("notas", function (Blueprint $table) {
            $table->id();
            $table->foreignId("aluno_id")->constrained("alunos")->cascadeOnDelete();
            $table->foreignId("disciplina_id")->constrained("disciplinas")->cascadeOnDelete();
            $table->foreignId("turma_id")->constrained("turmas")->cascadeOnDelete();
            $table->string("periodo");
            $table->string("ano_letivo");
            $table->decimal("nota_continua", 5, 2)->nullable();
            $table->decimal("nota_exame", 5, 2)->nullable();
            $table->decimal("media", 5, 2)->nullable();
            $table->enum("resultado", ["aprovado","reprovado","em_exame","pendente"])->default("pendente");
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("notas"); }
};
