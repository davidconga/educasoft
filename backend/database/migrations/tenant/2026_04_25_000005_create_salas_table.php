<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("salas", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("tipo")->default("Sala de Aula");
            $table->integer("capacidade")->nullable();
            $table->string("localizacao")->nullable();
            $table->text("descricao")->nullable();
            $table->boolean("ativo")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("salas"); }
};
