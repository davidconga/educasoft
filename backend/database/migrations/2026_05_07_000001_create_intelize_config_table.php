<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("intelize_config", function (Blueprint $t) {
            $t->id();
            $t->string("base_url", 255)->default("https://demo.api.intelize.digital/v1");
            $t->string("username", 255)->nullable();
            $t->text("password")->nullable();
            $t->string("entidade", 20)->nullable();
            $t->string("criador", 100)->nullable();
            $t->string("auth_path", 100)->default("/auth");
            $t->string("references_path", 100)->default("/references");
            $t->unsignedInteger("validade_dias")->default(30);
            $t->unsignedInteger("token_ttl_min")->default(50);
            $t->boolean("activo")->default(false);
            $t->text("webhook_secret")->nullable();
            $t->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists("intelize_config");
    }
};
