<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create("termos", function (Blueprint $t) {
            $t->id();
            $t->string("versao", 20)->unique();
            $t->string("titulo", 255);
            $t->mediumText("conteudo");
            $t->boolean("publicado")->default(false);
            $t->timestamp("publicado_em")->nullable();
            $t->timestamps();

            $t->index(["publicado", "publicado_em"]);
        });

        Schema::table("tenants", function (Blueprint $t) {
            $t->string("termos_versao_aceita", 20)->nullable()->after("notas_facturacao");
            $t->timestamp("termos_aceitos_em")->nullable()->after("termos_versao_aceita");
            $t->string("termos_aceitos_ip", 45)->nullable()->after("termos_aceitos_em");
        });
    }

    public function down(): void {
        Schema::table("tenants", function (Blueprint $t) {
            $t->dropColumn(["termos_versao_aceita", "termos_aceitos_em", "termos_aceitos_ip"]);
        });
        Schema::dropIfExists("termos");
    }
};
