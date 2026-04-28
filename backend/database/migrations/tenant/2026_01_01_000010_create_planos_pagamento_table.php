<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("planos_pagamento", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->decimal("valor_matricula", 12, 2)->default(0);
            $table->decimal("valor_mensalidade", 12, 2)->default(0);
            $table->string("nivel")->nullable();
            $table->string("ano_letivo");
            $table->boolean("ativo")->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("planos_pagamento"); }
};
