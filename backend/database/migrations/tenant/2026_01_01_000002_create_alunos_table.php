<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("alunos", function (Blueprint $table) {
            $table->id();
            $table->foreignId("user_id")->constrained()->cascadeOnDelete();
            $table->string("numero_aluno")->unique();
            $table->date("data_nascimento")->nullable();
            $table->string("genero")->nullable();
            $table->string("naturalidade")->nullable();
            $table->string("nacionalidade")->default("Angolana");
            $table->string("bi")->nullable();
            $table->string("nome_pai")->nullable();
            $table->string("nome_mae")->nullable();
            $table->string("telefone_responsavel")->nullable();
            $table->string("endereco")->nullable();
            $table->string("foto")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("alunos"); }
};
