<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('folhas_pagamento', function (Blueprint $t) {
            $t->id();
            $t->foreignId('funcionario_id')->constrained('funcionarios')->cascadeOnDelete();

            $t->unsignedTinyInteger('mes');           // 1-12
            $t->unsignedSmallInteger('ano');          // ex: 2026
            $t->string('referencia', 30)->unique();   // FOLHA-XXXXXXXX

            // Salário base + componentes (JSON para flexibilidade)
            $t->decimal('salario_base', 12, 2);
            $t->json('subsidios')->nullable();        // [{nome, valor}]
            $t->json('descontos')->nullable();        // [{nome, valor}] (IRS, INSS, faltas...)

            // Totais calculados
            $t->decimal('total_subsidios', 12, 2)->default(0);
            $t->decimal('total_descontos', 12, 2)->default(0);
            $t->decimal('liquido', 12, 2)->default(0);

            // Estado e pagamento
            $t->enum('estado', ['rascunho', 'processada', 'paga', 'anulada'])->default('rascunho');
            $t->date('data_pagamento')->nullable();
            $t->enum('metodo', ['dinheiro', 'transferencia', 'multicaixa', 'cheque'])->nullable();
            $t->string('referencia_externa', 100)->nullable();

            $t->text('observacao')->nullable();
            $t->timestamps();

            $t->unique(['funcionario_id', 'mes', 'ano']);
            $t->index(['ano', 'mes']);
            $t->index('estado');
        });
    }

    public function down(): void {
        Schema::dropIfExists('folhas_pagamento');
    }
};
