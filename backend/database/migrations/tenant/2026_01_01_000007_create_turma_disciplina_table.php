<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("turma_disciplina", function (Blueprint $table) {
            $table->id();
            $table->foreignId("turma_id")->constrained("turmas")->cascadeOnDelete();
            $table->foreignId("disciplina_id")->constrained("disciplinas")->cascadeOnDelete();
            $table->foreignId("professor_id")->constrained("professores")->cascadeOnDelete();
            $table->unique(["turma_id","disciplina_id"]);
        });
    }
    public function down(): void { Schema::dropIfExists("turma_disciplina"); }
};
