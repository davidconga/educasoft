<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("tenants", function (Blueprint $table) {
            $table->string("nome")->nullable();
            $table->string("email")->nullable();
            $table->string("telefone")->nullable();
            $table->string("endereco")->nullable();
            $table->string("logo")->nullable();
            $table->string("codigo")->unique()->nullable();
            $table->string("plano")->default("basico");
            $table->boolean("ativo")->default(true);
        });
    }
    public function down(): void {
        Schema::table("tenants", function (Blueprint $table) {
            $table->dropColumn(["nome","email","telefone","endereco","logo","codigo","plano","ativo"]);
        });
    }
};
