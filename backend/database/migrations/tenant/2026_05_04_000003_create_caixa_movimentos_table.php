<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("caixa_movimentos", function (Blueprint $t) {
            $t->id();
            $t->foreignId("sessao_id")->constrained("caixa_sessoes")->cascadeOnDelete();
            $t->unsignedBigInteger("pagamento_id")->nullable();
            // tipo: pagamento, despesa, sangria, reforco
            $t->string("tipo", 15);
            // sentido: 1 = entrada, -1 = saída
            $t->tinyInteger("sentido")->default(1);
            $t->decimal("valor", 12, 2);
            $t->string("metodo", 30)->nullable();
            $t->string("descricao", 250)->nullable();
            $t->unsignedBigInteger("operador_id");
            $t->string("operador_nome", 150)->nullable();
            $t->timestamps();

            $t->index(["sessao_id", "tipo"]);
            $t->index("pagamento_id");
        });
    }
    public function down(): void { Schema::dropIfExists("caixa_movimentos"); }
};
