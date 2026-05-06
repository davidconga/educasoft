<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("tenants", function (Blueprint $t) {
            $t->string("email_facturacao", 255)->nullable()->after("email");
            $t->string("responsavel_facturacao", 255)->nullable()->after("email_facturacao");
            $t->unsignedTinyInteger("dia_vencimento")->default(5)->after("plano");
            $t->decimal("valor_mensal", 12, 2)->nullable()->after("dia_vencimento");
            $t->decimal("desconto_pct", 5, 2)->default(0)->after("valor_mensal");
            $t->text("notas_facturacao")->nullable()->after("desconto_pct");
        });
    }

    public function down(): void {
        Schema::table("tenants", function (Blueprint $t) {
            $t->dropColumn(["email_facturacao", "responsavel_facturacao", "dia_vencimento", "valor_mensal", "desconto_pct", "notas_facturacao"]);
        });
    }
};
