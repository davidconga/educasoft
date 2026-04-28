<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("pagamentos", function (Blueprint $table) {
            $table->id();
            $table->foreignId("aluno_id")->constrained("alunos")->cascadeOnDelete();
            $table->foreignId("plano_id")->constrained("planos_pagamento")->cascadeOnDelete();
            $table->string("referencia")->unique();
            $table->decimal("valor", 12, 2);
            $table->enum("tipo", ["matricula","mensalidade","outro"])->default("mensalidade");
            $table->string("mes_referencia")->nullable();
            $table->enum("metodo", ["dinheiro","transferencia","multicaixa","referencia"])->default("dinheiro");
            $table->enum("status", ["pendente","pago","cancelado"])->default("pendente");
            $table->date("data_vencimento")->nullable();
            $table->date("data_pagamento")->nullable();
            $table->text("observacao")->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("pagamentos"); }
};
