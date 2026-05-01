<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Participantes de cada conversa.
 *
 * last_read_at — timestamp da última mensagem lida pelo utilizador,
 * usado para calcular o contador de não-lidas (mensagens com
 * created_at > last_read_at).
 */
return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("conversa_participantes")) return;
        Schema::create("conversa_participantes", function (Blueprint $t) {
            $t->id();
            $t->foreignId("conversa_id")->constrained("conversas")->cascadeOnDelete();
            $t->foreignId("user_id")->constrained("users")->cascadeOnDelete();
            $t->timestamp("last_read_at")->nullable();
            $t->timestamp("joined_at")->useCurrent();
            $t->unique(["conversa_id", "user_id"]);
            $t->index(["user_id"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("conversa_participantes");
    }
};
