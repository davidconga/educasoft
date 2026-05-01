<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("comentarios")) return;
        Schema::create("comentarios", function (Blueprint $t) {
            $t->id();
            $t->foreignId("post_id")->constrained("posts")->cascadeOnDelete();
            $t->foreignId("autor_user_id")->constrained("users")->cascadeOnDelete();
            $t->text("corpo");
            $t->timestamps();
            $t->softDeletes();
            $t->index(["post_id", "created_at"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("comentarios");
    }
};
