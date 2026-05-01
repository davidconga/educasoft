<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mensagens do chat.
 * Apenas texto na v1. Anexos/edição/remoção ficam para v2.
 */
return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("mensagens")) return;
        Schema::create("mensagens", function (Blueprint $t) {
            $t->id();
            $t->foreignId("conversa_id")->constrained("conversas")->cascadeOnDelete();
            $t->foreignId("user_id")->constrained("users")->cascadeOnDelete();
            $t->text("corpo");
            $t->timestamps();
            $t->index(["conversa_id", "created_at"]);
            $t->index(["user_id"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("mensagens");
    }
};
