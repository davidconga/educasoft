<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("precario_propinas", function (Blueprint $table) {
            $table->id();
            $table->string("nome")->nullable();
            $table->string("nivel")->nullable();
            $table->string("turno")->nullable();
            $table->decimal("valor_mensal", 12, 2);
            $table->string("ano_letivo")->nullable();
            $table->unsignedBigInteger("curso_id")->nullable();
            $table->text("descricao")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("precario_propinas"); }
};
