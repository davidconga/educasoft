<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("site_chats", function (Blueprint $t) {
            $t->id();
            $t->string("token", 64)->unique();
            $t->string("nome", 255);
            $t->string("email", 255)->nullable();
            $t->string("telefone", 50)->nullable();
            $t->string("assunto", 255)->nullable();
            $t->string("estado", 20)->default("aberto");
            $t->unsignedInteger("nao_lidas_admin")->default(0);
            $t->unsignedInteger("nao_lidas_visitante")->default(0);
            $t->timestamp("ultima_mensagem_em")->nullable();
            $t->string("ip", 45)->nullable();
            $t->string("user_agent", 500)->nullable();
            $t->timestamps();
            $t->index(["estado", "ultima_mensagem_em"]);
        });

        Schema::create("site_chat_mensagens", function (Blueprint $t) {
            $t->id();
            $t->foreignId("site_chat_id")->constrained("site_chats")->cascadeOnDelete();
            $t->string("autor", 20);
            $t->unsignedBigInteger("autor_id")->nullable();
            $t->string("autor_nome", 255)->nullable();
            $t->text("texto");
            $t->timestamp("lida_em")->nullable();
            $t->timestamps();
            $t->index(["site_chat_id", "created_at"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("site_chat_mensagens");
        Schema::dropIfExists("site_chats");
    }
};
