<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("tenants", function (Blueprint $t) {
            $t->string("formato_impressao", 10)->default("a4");
        });
    }
    public function down(): void {
        Schema::table("tenants", function (Blueprint $t) {
            $t->dropColumn("formato_impressao");
        });
    }
};
