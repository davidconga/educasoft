<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::table("turmas", function (Blueprint $table) {
            $table->unsignedBigInteger("classe_id")->nullable()->after("nivel");
            $table->unsignedBigInteger("turno_id")->nullable()->after("turno");
            $table->unsignedBigInteger("sala_id")->nullable()->after("capacidade");
            $table->unsignedBigInteger("diretor_turma_id")->nullable()->after("sala_id");
            $table->text("descricao")->nullable()->after("diretor_turma_id");
            $table->boolean("ativo")->default(true)->after("descricao");
        });
    }
    public function down(): void {
        Schema::table("turmas", function (Blueprint $table) {
            $table->dropColumn(["classe_id","turno_id","sala_id","diretor_turma_id","descricao","ativo"]);
        });
    }
};
