<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("cursos", function (Blueprint $t) {
            $t->string("nivel_ensino")->nullable()->after("area");
        });

        Schema::table("matriculas", function (Blueprint $t) {
            $t->enum("tipo", ["nova","renovacao"])->default("nova")->after("ano_letivo");
            $t->enum("aproveitamento_status", ["aprovado","reprovado"])->nullable()->after("status");
            $t->unsignedBigInteger("matricula_anterior_id")->nullable()->after("aproveitamento_status");
            $t->foreign("matricula_anterior_id")->references("id")->on("matriculas")->nullOnDelete();
        });
        DB::statement("ALTER TABLE matriculas MODIFY status ENUM('pendente','activa','transferida','concluida','cancelada','reprovada') NOT NULL DEFAULT 'pendente'");

        Schema::create("regras_aproveitamento", function (Blueprint $t) {
            $t->id();
            $t->string("nome");
            $t->text("descricao")->nullable();
            $t->boolean("ativa")->default(true);
            $t->integer("prioridade")->default(0);
            // escopo — null = wildcard; mais específica vence
            $t->string("nivel_ensino")->nullable();
            $t->unsignedBigInteger("curso_id")->nullable();
            $t->unsignedBigInteger("classe_id")->nullable();
            $t->string("ano_letivo")->nullable();
            $t->foreign("curso_id")->references("id")->on("cursos")->nullOnDelete();
            $t->foreign("classe_id")->references("id")->on("classes")->nullOnDelete();
            // config: cálculo da média + critérios + comportamento_reprovado
            $t->json("config");
            $t->timestamps();
            $t->index(["ativa","prioridade"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("regras_aproveitamento");

        Schema::table("matriculas", function (Blueprint $t) {
            $t->dropForeign(["matricula_anterior_id"]);
            $t->dropColumn(["tipo","aproveitamento_status","matricula_anterior_id"]);
        });
        DB::statement("ALTER TABLE matriculas MODIFY status ENUM('pendente','activa','transferida','concluida','cancelada') NOT NULL DEFAULT 'pendente'");

        Schema::table("cursos", function (Blueprint $t) {
            $t->dropColumn("nivel_ensino");
        });
    }
};
