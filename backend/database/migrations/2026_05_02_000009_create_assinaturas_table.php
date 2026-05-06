<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("assinaturas", function (Blueprint $t) {
            $t->id();
            $t->ulid("escola_id");
            $t->foreign("escola_id")->references("id")->on("tenants")->cascadeOnDelete();
            $t->foreignId("plano_id")->constrained("planos");

            $t->string("estado", 20)->default("ativa");
            // ativa | trial | suspensa | cancelada | expirada

            $t->date("data_inicio");
            $t->date("data_fim_trial")->nullable();
            $t->date("data_fim")->nullable();
            $t->date("proxima_renovacao")->nullable();

            $t->decimal("preco_aplicado", 12, 2);
            $t->decimal("desconto_pct", 5, 2)->default(0);
            $t->string("ciclo", 10)->default("mensal");
            // mensal | anual

            $t->boolean("auto_renovar")->default(true);
            $t->timestamp("cancelada_em")->nullable();
            $t->string("motivo_cancelamento", 500)->nullable();
            $t->text("notas")->nullable();
            $t->timestamps();

            $t->index(["escola_id", "estado"]);
            $t->index(["estado", "proxima_renovacao"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("assinaturas");
    }
};
