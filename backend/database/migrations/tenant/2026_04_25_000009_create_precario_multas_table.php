<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("precario_multas", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("tipo_calculo")->default("percentagem");
            $table->decimal("valor", 10, 2);
            $table->integer("dias_carencia")->default(0);
            $table->string("aplicar_em")->default("mensalidade");
            $table->text("descricao")->nullable();
            $table->boolean("ativo")->default(true);
            $table->string("ano_letivo")->nullable();
            $table->unsignedBigInteger("curso_id")->nullable();
            $table->string("nivel")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("precario_multas"); }
};
