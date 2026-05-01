<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        if (!Schema::hasColumn("pagamentos", "hash_factura")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->string("hash_factura", 64)->nullable()->after("comprovativo");          // 4 chars visíveis (AGT)
                $t->text("assinatura")->nullable()->after("hash_factura");                   // base64 da assinatura RSA-SHA1
                $t->string("hash_anterior", 64)->nullable()->after("assinatura");            // hash da factura anterior (encadeamento)
                $t->timestamp("assinada_em")->nullable()->after("hash_anterior");
            });
        }
    }
    public function down(): void {
        if (Schema::hasColumn("pagamentos", "hash_factura")) {
            Schema::table("pagamentos", function (Blueprint $t) {
                $t->dropColumn(["hash_factura","assinatura","hash_anterior","assinada_em"]);
            });
        }
    }
};
