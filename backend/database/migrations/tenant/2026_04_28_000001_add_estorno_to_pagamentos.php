<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        DB::statement("ALTER TABLE pagamentos
            ADD COLUMN IF NOT EXISTS estorno_motivo TEXT NULL AFTER comprovativo,
            ADD COLUMN IF NOT EXISTS estornado_em TIMESTAMP NULL AFTER estorno_motivo,
            ADD COLUMN IF NOT EXISTS estornado_por VARCHAR(255) NULL AFTER estornado_em");
        DB::statement("ALTER TABLE pagamentos MODIFY status ENUM('pendente','pago','vencido','cancelado','estornado') NOT NULL DEFAULT 'pendente'");
    }
    public function down(): void {
        DB::statement("ALTER TABLE pagamentos MODIFY status ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente'");
    }
};
