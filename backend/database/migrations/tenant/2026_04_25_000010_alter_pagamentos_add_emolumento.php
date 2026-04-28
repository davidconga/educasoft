<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        DB::statement("ALTER TABLE pagamentos MODIFY tipo ENUM('matricula','mensalidade','emolumento','outro') NOT NULL DEFAULT 'mensalidade'");
        DB::statement("ALTER TABLE pagamentos MODIFY status ENUM('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente'");
    }
    public function down(): void {
        DB::statement("ALTER TABLE pagamentos MODIFY tipo ENUM('matricula','mensalidade','outro') NOT NULL DEFAULT 'mensalidade'");
        DB::statement("ALTER TABLE pagamentos MODIFY status ENUM('pendente','pago','cancelado') NOT NULL DEFAULT 'pendente'");
    }
};
