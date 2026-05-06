<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("caixa_sessoes", function (Blueprint $t) {
            $t->id();
            $t->string("codigo", 30)->unique();
            $t->unsignedBigInteger("operador_id");
            $t->string("operador_nome", 150);
            $t->string("nome_caixa", 100)->nullable();
            $t->decimal("fundo_inicial", 12, 2)->default(0);
            $t->decimal("total_esperado", 12, 2)->default(0);
            $t->decimal("total_contado", 12, 2)->nullable();
            $t->decimal("diferenca", 12, 2)->nullable();
            $t->text("observacoes_abertura")->nullable();
            $t->text("observacoes_fecho")->nullable();
            $t->timestamp("abriu_em");
            $t->timestamp("fechou_em")->nullable();
            $t->string("status", 12)->default("aberta");
            $t->timestamps();

            $t->index(["operador_id", "status"]);
            $t->index("status");
        });
    }
    public function down(): void { Schema::dropIfExists("caixa_sessoes"); }
};
