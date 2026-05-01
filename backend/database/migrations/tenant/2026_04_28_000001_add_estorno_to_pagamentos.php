<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table("pagamentos", function (Blueprint $t) {
            if (!Schema::hasColumn("pagamentos", "estorno_motivo")) {
                $t->text("estorno_motivo")->nullable()->after("comprovativo");
            }
            if (!Schema::hasColumn("pagamentos", "estornado_em")) {
                $t->timestamp("estornado_em")->nullable()->after("estorno_motivo");
            }
            if (!Schema::hasColumn("pagamentos", "estornado_por")) {
                $t->string("estornado_por")->nullable()->after("estornado_em");
            }
        });
        DB::statement("ALTER TABLE pagamentos MODIFY status ENUM('pendente','pago','vencido','cancelado','estornado') NOT NULL DEFAULT 'pendente'");
    }
    public function down(): void {
        DB::statement("ALTER TABLE pagamentos MODIFY status ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente'");
    }
};
