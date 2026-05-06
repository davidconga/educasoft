<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("whatsapp_logs", function (Blueprint $t) {
            $t->id();
            $t->string("destinatario", 50);
            $t->string("contexto", 60);
            $t->string("referencia", 60)->nullable();
            $t->text("mensagem");
            $t->string("estado", 20)->default("pendente");
            $t->unsignedSmallInteger("http_status")->nullable();
            $t->text("resposta")->nullable();
            $t->text("erro")->nullable();
            $t->timestamp("enviado_em")->nullable();
            $t->timestamps();
            $t->index(["contexto", "created_at"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("whatsapp_logs");
    }
};
