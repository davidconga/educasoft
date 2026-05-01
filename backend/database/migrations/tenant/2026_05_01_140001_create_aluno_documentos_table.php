<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("aluno_documentos", function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger("aluno_id")->unique();

            // Endereço detalhado
            $t->string("provincia")->nullable();
            $t->string("municipio")->nullable();
            $t->string("bairro")->nullable();

            // Documentos do aluno (BI extra)
            $t->date("bi_emissao_data")->nullable();
            $t->string("bi_emissao_local")->nullable();

            // Pai (campos extra)
            $t->string("bi_pai")->nullable();
            $t->string("profissao_pai")->nullable();

            // Mãe (campos extra)
            $t->string("bi_mae")->nullable();
            $t->string("profissao_mae")->nullable();

            // Encarregado de Educação (caso ≠ pai/mãe)
            $t->string("nome_encarregado")->nullable();
            $t->string("relacao_encarregado", 50)->nullable();
            $t->string("bi_encarregado")->nullable();
            $t->string("telefone_encarregado", 50)->nullable();
            $t->string("email_encarregado")->nullable();
            $t->string("profissao_encarregado")->nullable();

            // Saúde
            $t->string("tipo_sanguineo", 10)->nullable();
            $t->text("alergias")->nullable();
            $t->text("observacoes_medicas")->nullable();

            // Histórico académico
            $t->string("escola_anterior")->nullable();
            $t->string("classe_anterior")->nullable();
            $t->string("ano_anterior", 20)->nullable();

            // Outros
            $t->string("religiao", 100)->nullable();

            $t->timestamps();

            $t->foreign("aluno_id")->references("id")->on("alunos")->cascadeOnDelete();
        });
    }

    public function down(): void {
        Schema::dropIfExists("aluno_documentos");
    }
};
