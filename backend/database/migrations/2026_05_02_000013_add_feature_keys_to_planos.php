<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("planos", function (Blueprint $t) {
            $t->json("feature_keys")->nullable()->after("features");
        });

        // Conjunto de features de cada plano (chaves machine-readable)
        $features = [
            "basico"   => [],
            "standard" => [
                "aulas_remotas",
                "tesouraria",
                "bolsas",
                "lembretes_email_sms",
                "folha_prova_qr",
                "relatorios_avancados",
            ],
            "premium" => [
                "aulas_remotas",
                "tesouraria",
                "bolsas",
                "lembretes_email_sms",
                "folha_prova_qr",
                "relatorios_avancados",
                "multi_turno",
                "api_integracao",
                "suporte_prioritario",
            ],
        ];

        foreach ($features as $codigo => $keys) {
            DB::table("planos")->where("codigo", $codigo)->update([
                "feature_keys" => json_encode($keys),
                "updated_at"   => now(),
            ]);
        }
    }

    public function down(): void {
        Schema::table("planos", function (Blueprint $t) {
            $t->dropColumn("feature_keys");
        });
    }
};
