<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Posts da comunidade Educaja.
 *
 * Dois tipos:
 *   post  — entrada de feed social (texto livre, audiência escola ou turma)
 *   forum — tópico de fórum dentro de uma turma (tem titulo + permite "resposta aceite")
 */
return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("posts")) return;
        Schema::create("posts", function (Blueprint $t) {
            $t->id();
            $t->foreignId("autor_user_id")->constrained("users")->cascadeOnDelete();
            $t->string("audiencia", 20); // escola | turma
            $t->foreignId("turma_id")->nullable()->constrained("turmas")->nullOnDelete();
            $t->string("tipo", 20); // post | forum
            $t->string("titulo")->nullable(); // apenas para tipo=forum
            $t->text("corpo");
            $t->boolean("fixado")->default(false);
            $t->unsignedBigInteger("resposta_aceite_id")->nullable(); // FK lógica para comentarios
            $t->unsignedInteger("gostos_count")->default(0);
            $t->unsignedInteger("comentarios_count")->default(0);
            $t->timestamps();
            $t->softDeletes();
            $t->index(["audiencia", "turma_id", "created_at"]);
            $t->index(["tipo", "turma_id"]);
            $t->index(["fixado", "created_at"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("posts");
    }
};
