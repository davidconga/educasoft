<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("bolsas")) return;
        Schema::create("bolsas", function (Blueprint $t) {
            $t->id();
            $t->foreignId("aluno_id")->constrained("alunos")->cascadeOnDelete();
            $t->foreignId("matricula_id")->nullable()->constrained("matriculas")->nullOnDelete();
            $t->foreignId("financiador_id")->nullable()->constrained("financiadores")->nullOnDelete(); // null = bolsa interna
            $t->enum("tipo", ["percentagem","valor_fixo"]);
            $t->decimal("valor", 12, 2); // % (0–100) ou AOA
            $t->boolean("cobre_propinas")->default(true);
            $t->boolean("cobre_emolumentos")->default(true);
            $t->boolean("cobre_matricula")->default(true);
            $t->date("data_inicio");
            $t->enum("status", ["activa","cancelada"])->default("activa");
            $t->date("cancelada_em")->nullable();
            $t->string("motivo_cancelamento")->nullable();
            $t->unsignedBigInteger("cancelada_por_user_id")->nullable();
            $t->text("observacoes")->nullable();
            $t->timestamps();
            $t->index(["aluno_id","status"]);
            $t->index(["matricula_id","status"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("bolsas");
    }
};
