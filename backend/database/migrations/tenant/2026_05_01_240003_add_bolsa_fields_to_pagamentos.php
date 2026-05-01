<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            if (!Schema::hasColumn("pagamentos","bolsa_id"))            $t->foreignId("bolsa_id")->nullable()->after("multa_id");
            if (!Schema::hasColumn("pagamentos","bolsa_valor"))         $t->decimal("bolsa_valor", 12, 2)->default(0)->after("multa_valor");
            if (!Schema::hasColumn("pagamentos","bolsa_financiador_id"))$t->foreignId("bolsa_financiador_id")->nullable()->after("bolsa_id");
            if (!Schema::hasColumn("pagamentos","recibo_bolsa_id"))     $t->unsignedBigInteger("recibo_bolsa_id")->nullable()->after("bolsa_financiador_id");
        });
    }
    public function down(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            foreach (["bolsa_id","bolsa_valor","bolsa_financiador_id","recibo_bolsa_id"] as $c) {
                if (Schema::hasColumn("pagamentos",$c)) $t->dropColumn($c);
            }
        });
    }
};
