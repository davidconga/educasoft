<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create("users", function (Blueprint $table) {
            $table->id();
            $table->string("nome");
            $table->string("email")->unique();
            $table->string("password");
            $table->string("telefone")->nullable();
            $table->string("foto")->nullable();
            $table->enum("tipo", ["admin","professor","aluno","responsavel","secretaria","director","tesouraria","coordenador"])->default("aluno");
            $table->boolean("ativo")->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists("users"); }
};
