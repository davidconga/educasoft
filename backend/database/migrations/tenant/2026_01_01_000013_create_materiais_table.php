<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("materiais", function (Blueprint $table) {
            $table->id();
            $table->foreignId("aula_id")->nullable()->constrained("aulas_remotas")->nullOnDelete();
            $table->foreignId("disciplina_id")->constrained("disciplinas")->cascadeOnDelete();
            $table->foreignId("turma_id")->constrained("turmas")->cascadeOnDelete();
            $table->string("titulo");
            $table->enum("tipo", ["pdf","video","link","outro"])->default("pdf");
            $table->string("arquivo")->nullable();
            $table->string("url")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("materiais"); }
};
