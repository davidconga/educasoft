<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("financiadores")) return;
        Schema::create("financiadores", function (Blueprint $t) {
            $t->id();
            $t->string("nome");
            $t->enum("tipo", ["interno","governo","empresa","fundacao","particular","outro"])->default("outro");
            $t->string("nif", 30)->nullable();
            $t->string("email")->nullable();
            $t->string("telefone", 30)->nullable();
            $t->string("endereco")->nullable();
            $t->string("contacto_responsavel")->nullable();
            $t->text("observacoes")->nullable();
            $t->boolean("activo")->default(true);
            $t->timestamps();
            $t->index(["activo","tipo"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("financiadores");
    }
};
