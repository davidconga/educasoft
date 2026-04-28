<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("precario_emolumentos", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("categoria")->default("Secretaria");
            $table->decimal("valor", 12, 2);
            $table->boolean("obrigatorio")->default(false);
            $table->string("ano_letivo")->nullable();
            $table->unsignedBigInteger("curso_id")->nullable();
            $table->string("nivel")->nullable();
            $table->text("descricao")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("precario_emolumentos"); }
};
