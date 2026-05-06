<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("referencias_pagamento", function (Blueprint $t) {
            $t->id();
            $t->foreignId("factura_id")->constrained("facturas_central")->cascadeOnDelete();
            $t->string("entidade", 20);
            $t->string("referencia", 30);
            $t->decimal("valor", 12, 2);
            $t->string("estado", 20)->default("pendente");
            $t->timestamp("expira_em")->nullable();
            $t->timestamp("paga_em")->nullable();
            $t->string("transacao_ref", 80)->nullable();
            $t->json("gateway_request")->nullable();
            $t->json("gateway_response")->nullable();
            $t->timestamps();

            $t->index(["estado", "expira_em"]);
            $t->index(["entidade", "referencia"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("referencias_pagamento");
    }
};
