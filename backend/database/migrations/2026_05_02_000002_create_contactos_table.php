<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("contactos", function (Blueprint $t) {
            $t->id();
            $t->string("nome", 255);
            $t->string("email", 255);
            $t->string("escola", 255)->nullable();
            $t->string("telefone", 50)->nullable();
            $t->text("mensagem");
            $t->string("estado", 20)->default("novo");
            $t->text("nota_admin")->nullable();
            $t->string("ip", 45)->nullable();
            $t->timestamps();
            $t->index(["estado", "created_at"]);
        });
    }

    public function down(): void {
        Schema::dropIfExists("contactos");
    }
};
