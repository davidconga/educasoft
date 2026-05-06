<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("facturas_central", function (Blueprint $t) {
            $t->id();
            $t->ulid("escola_id");
            $t->foreign("escola_id")->references("id")->on("tenants")->cascadeOnDelete();

            $t->string("numero", 30)->unique();
            $t->string("serie", 10)->default("FT");
            $t->unsignedSmallInteger("ano");

            $t->string("plano", 20);
            $t->date("periodo_inicio");
            $t->date("periodo_fim");
            $t->date("data_emissao");
            $t->date("data_vencimento");

            $t->string("cliente_nome", 255);
            $t->string("cliente_nif", 30)->nullable();
            $t->string("cliente_email", 255)->nullable();
            $t->string("cliente_morada", 500)->nullable();

            $t->decimal("subtotal", 12, 2)->default(0);
            $t->decimal("desconto_pct", 5, 2)->default(0);
            $t->decimal("desconto_valor", 12, 2)->default(0);
            $t->decimal("iva_taxa", 5, 2)->default(14);
            $t->decimal("iva_valor", 12, 2)->default(0);
            $t->decimal("total", 12, 2)->default(0);

            $t->string("estado", 20)->default("pendente");
            $t->timestamp("paga_em")->nullable();
            $t->string("metodo_pagamento", 30)->nullable();
            $t->string("transacao_ref", 80)->nullable();

            $t->string("hash", 8)->nullable();
            $t->text("assinatura")->nullable();
            $t->string("hash_anterior", 8)->nullable();
            $t->timestamp("assinada_em")->nullable();

            $t->string("pdf_path", 500)->nullable();
            $t->text("notas")->nullable();
            $t->timestamps();

            $t->index(["escola_id", "estado"]);
            $t->index(["estado", "data_vencimento"]);
            $t->index(["ano", "serie"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("facturas_central");
    }
};
