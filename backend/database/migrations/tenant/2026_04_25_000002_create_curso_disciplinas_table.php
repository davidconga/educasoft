<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("curso_disciplinas", function (Blueprint $table) {
            $table->id();
            $table->foreignId("curso_id")->constrained("cursos")->cascadeOnDelete();
            $table->string("nome");
            $table->string("codigo")->nullable();
            $table->integer("carga_horaria")->nullable();
            $table->integer("ano")->default(1);
            $table->integer("semestre")->nullable();
            $table->boolean("obrigatoria")->default(true);
            $table->text("descricao")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("curso_disciplinas"); }
};
