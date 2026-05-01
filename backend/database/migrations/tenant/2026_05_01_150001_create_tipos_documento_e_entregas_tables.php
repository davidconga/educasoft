<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasTable("tipos_documento")) {
            Schema::create("tipos_documento", function (Blueprint $t) {
                $t->id();
                $t->string("nome");
                $t->text("descricao")->nullable();
                $t->boolean("obrigatorio")->default(false);
                $t->boolean("bloqueia_matricula")->default(false);
                $t->boolean("aceita_upload")->default(true);
                $t->boolean("ativo")->default(true);
                $t->integer("ordem")->default(0);
                // escopo (null = todos)
                $t->unsignedBigInteger("curso_id")->nullable();
                $t->unsignedBigInteger("classe_id")->nullable();
                $t->timestamps();
                $t->foreign("curso_id")->references("id")->on("cursos")->nullOnDelete();
                $t->foreign("classe_id")->references("id")->on("classes")->nullOnDelete();
                $t->index(["ativo","ordem"]);
            });
        }

        if (!Schema::hasTable("aluno_documento_entregas")) {
            Schema::create("aluno_documento_entregas", function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger("aluno_id");
                $t->unsignedBigInteger("tipo_documento_id");
                $t->boolean("entregue")->default(false);
                $t->date("data_entrega")->nullable();
                $t->string("ficheiro")->nullable();
                $t->string("ficheiro_original_nome")->nullable();
                $t->text("observacoes")->nullable();
                $t->timestamps();
                $t->foreign("aluno_id")->references("id")->on("alunos")->cascadeOnDelete();
                $t->foreign("tipo_documento_id")->references("id")->on("tipos_documento")->cascadeOnDelete();
                $t->unique(["aluno_id","tipo_documento_id"]);
            });
        }
    }

    public function down(): void {
        Schema::dropIfExists("aluno_documento_entregas");
        Schema::dropIfExists("tipos_documento");
    }
};
