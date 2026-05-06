<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("comprovativos", function (Blueprint $t) {
            $t->id();
            $t->foreignId("factura_id")->constrained("facturas_central")->cascadeOnDelete();
            $t->string("numero", 30)->unique();
            $t->date("data_emissao");
            $t->decimal("valor", 12, 2);
            $t->string("metodo_pagamento", 30);
            $t->string("transacao_ref", 80)->nullable();
            $t->string("hash", 8)->nullable();
            $t->string("pdf_path", 500)->nullable();
            $t->timestamps();

            $t->index("factura_id");
        });
    }

    public function down(): void {
        Schema::dropIfExists("comprovativos");
    }
};
