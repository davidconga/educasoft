<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Conversas (threads) do chat instantâneo.
 *
 * Tipos:
 *   privada    — 1-para-1 entre dois utilizadores (aluno↔professor, admin↔ee, etc.)
 *   turma      — grupo associado a uma turma; participantes = alunos matriculados + professores
 *   admin_ee   — privada entre admin e encarregado de educação (caso especial visual)
 */
return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("conversas")) return;
        Schema::create("conversas", function (Blueprint $t) {
            $t->id();
            $t->string("tipo", 20); // privada | turma | admin_ee
            $t->foreignId("turma_id")->nullable()->constrained("turmas")->nullOnDelete();
            $t->string("titulo")->nullable();
            $t->unsignedBigInteger("criada_por_user_id")->nullable();
            $t->timestamp("ultima_mensagem_em")->nullable();
            $t->timestamps();
            $t->index(["tipo"]);
            $t->index(["turma_id"]);
            $t->index(["ultima_mensagem_em"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("conversas");
    }
};
