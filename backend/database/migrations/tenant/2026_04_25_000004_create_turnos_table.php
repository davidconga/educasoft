<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("turnos", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("codigo")->default("manha");
            $table->time("hora_inicio")->default("07:00:00");
            $table->time("hora_fim")->default("12:30:00");
            $table->string("descricao")->nullable();
            $table->boolean("ativo")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("turnos"); }
};
