<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("planos", function (Blueprint $t) {
            $t->id();
            $t->string("codigo", 30)->unique();
            $t->string("nome", 100);
            $t->text("descricao")->nullable();
            $t->decimal("preco_mensal", 12, 2)->default(0);
            $t->decimal("preco_anual", 12, 2)->nullable();
            $t->integer("max_alunos")->default(0)->comment("-1 = ilimitado");
            $t->integer("max_admins")->default(1);
            $t->json("features")->nullable();
            $t->boolean("destaque")->default(false);
            $t->boolean("ativo")->default(true);
            $t->unsignedSmallInteger("ordem")->default(0);
            $t->unsignedSmallInteger("dias_trial")->default(0);
            $t->timestamps();

            $t->index(["ativo", "ordem"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("planos");
    }
};
