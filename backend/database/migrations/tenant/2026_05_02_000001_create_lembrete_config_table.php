<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        if (Schema::hasTable("lembrete_config")) return;
        Schema::create("lembrete_config", function (Blueprint $t) {
            $t->id();
            $t->boolean("email_activo")->default(true);
            $t->boolean("sms_activo")->default(false);
            $t->json("dias_antes")->nullable();   // [3, 1]
            $t->json("dias_depois")->nullable();  // [1, 7, 15]
            $t->time("hora_envio")->default("08:00");
            $t->string("email_assunto")->default("Lembrete de pagamento de propina");
            $t->text("email_template")->nullable();
            $t->string("sms_sender_id", 20)->nullable();
            $t->text("sms_template")->nullable();
            $t->string("sms_gateway_url")->nullable();
            $t->string("sms_gateway_method", 6)->default("POST");
            $t->string("sms_gateway_api_key")->nullable();
            $t->text("sms_gateway_payload_template")->nullable();
            $t->timestamps();
        });

        DB::table("lembrete_config")->insert([
            "id"             => 1,
            "email_activo"   => true,
            "sms_activo"     => false,
            "dias_antes"     => json_encode([3, 1]),
            "dias_depois"    => json_encode([1, 7, 15]),
            "hora_envio"     => "08:00",
            "email_assunto"  => "Lembrete de pagamento de propina — {mes}",
            "email_template" => "Caro(a) Encarregado(a) de Educação,\n\nLembramos que existe um pagamento de propina pendente referente ao aluno {aluno} ({mes}), no valor de {valor} AOA, com vencimento a {vencimento}.\n\nReferência: {referencia}\n\nAgradecemos a sua atenção.\n\n{escola}",
            "sms_template"   => "[{escola}] Propina {mes} de {aluno}: {valor} AOA, venc. {vencimento}. Ref {referencia}.",
            "sms_gateway_method" => "POST",
            "sms_gateway_payload_template" => json_encode([
                "to"      => "{telefone}",
                "from"    => "{sender}",
                "message" => "{mensagem}",
            ]),
            "created_at"     => now(),
            "updated_at"     => now(),
        ]);
    }
    public function down(): void {
        Schema::dropIfExists("lembrete_config");
    }
};
