<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("aulas_remotas", function (Blueprint $table) {
            $table->id();
            $table->foreignId("turma_id")->constrained("turmas")->cascadeOnDelete();
            $table->foreignId("disciplina_id")->constrained("disciplinas")->cascadeOnDelete();
            $table->foreignId("professor_id")->constrained("professores")->cascadeOnDelete();
            $table->string("titulo");
            $table->text("descricao")->nullable();
            $table->string("link_jitsi");
            $table->string("sala_nome");
            $table->dateTime("data_inicio");
            $table->dateTime("data_fim")->nullable();
            $table->enum("status", ["agendada","em_curso","concluida","cancelada"])->default("agendada");
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("aulas_remotas"); }
};
