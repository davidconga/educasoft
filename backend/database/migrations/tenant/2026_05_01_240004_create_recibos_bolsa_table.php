<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Recibos de bolsa emitidos ao financiador.
 *
 * Documento NÃO fiscal (não vai para SAFT-AO) — apenas comprovativo
 * interno de que o financiador (governo, empresa, fundação ou a própria
 * escola em modo "interno") cobriu uma porção do valor pago pelo aluno.
 *
 * Cada recibo agrega N pagamentos do aluno num período.
 */
return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("recibos_bolsa")) return;
        Schema::create("recibos_bolsa", function (Blueprint $t) {
            $t->id();
            $t->foreignId("financiador_id")->constrained("financiadores")->cascadeOnDelete();
            $t->foreignId("aluno_id")->constrained("alunos")->cascadeOnDelete();
            $t->foreignId("bolsa_id")->nullable()->constrained("bolsas")->nullOnDelete();
            $t->string("referencia", 60); // ex: "RB 2026/N"
            $t->date("data_emissao");
            $t->decimal("valor_total", 12, 2);
            $t->text("observacoes")->nullable();
            $t->unsignedBigInteger("emitido_por_user_id")->nullable();
            $t->timestamps();
            $t->index(["financiador_id","data_emissao"]);
            $t->index(["aluno_id"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("recibos_bolsa");
    }
};
