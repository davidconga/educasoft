<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("gostos")) return;
        Schema::create("gostos", function (Blueprint $t) {
            $t->id();
            $t->foreignId("post_id")->constrained("posts")->cascadeOnDelete();
            $t->foreignId("user_id")->constrained("users")->cascadeOnDelete();
            $t->timestamp("created_at")->useCurrent();
            $t->unique(["post_id", "user_id"]);
        });
    }
    public function down(): void {
        Schema::dropIfExists("gostos");
    }
};
