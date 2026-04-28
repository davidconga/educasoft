<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("professores", function (Blueprint $table) {
            $table->id();
            $table->foreignId("user_id")->constrained()->cascadeOnDelete();
            $table->string("numero_professor")->unique();
            $table->string("especialidade")->nullable();
            $table->string("habilitacoes")->nullable();
            $table->date("data_admissao")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("professores"); }
};
