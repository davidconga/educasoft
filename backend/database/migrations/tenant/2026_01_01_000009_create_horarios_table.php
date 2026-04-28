<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("horarios", function (Blueprint $table) {
            $table->id();
            $table->foreignId("turma_id")->constrained("turmas")->cascadeOnDelete();
            $table->foreignId("disciplina_id")->constrained("disciplinas")->cascadeOnDelete();
            $table->foreignId("professor_id")->constrained("professores")->cascadeOnDelete();
            $table->enum("dia_semana", ["segunda","terca","quarta","quinta","sexta","sabado"]);
            $table->time("hora_inicio");
            $table->time("hora_fim");
            $table->string("sala")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("horarios"); }
};
