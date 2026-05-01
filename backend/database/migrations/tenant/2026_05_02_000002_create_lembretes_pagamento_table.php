<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("lembretes_pagamento")) return;
        Schema::create("lembretes_pagamento", function (Blueprint $t) {
            $t->id();
            $t->foreignId("pagamento_id")->constrained("pagamentos")->cascadeOnDelete();
            $t->foreignId("aluno_id")->constrained("alunos")->cascadeOnDelete();
            $t->enum("canal", ["email","sms"]);
            $t->string("destinatario");                    // email ou telefone
            $t->enum("gatilho", ["antes","depois","manual"]);
            $t->integer("dias_offset")->default(0);        // negativo = antes do venc., positivo = depois
            $t->text("mensagem")->nullable();              // payload textual enviado
            $t->enum("status", ["pendente","enviado","falhou"])->default("pendente");
            $t->unsignedTinyInteger("tentativas")->default(0);
            $t->timestamp("enviado_em")->nullable();
            $t->text("erro")->nullable();
            $t->timestamps();
            $t->index(["pagamento_id","canal","gatilho","dias_offset"], "idx_lembrete_unico");
            $t->index(["aluno_id","status"]);
            $t->index(["status","created_at"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("lembretes_pagamento");
    }
};
