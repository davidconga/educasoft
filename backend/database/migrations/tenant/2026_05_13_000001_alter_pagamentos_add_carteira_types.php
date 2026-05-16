<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        DB::statement("ALTER TABLE pagamentos MODIFY tipo ENUM('matricula','mensalidade','emolumento','outro','deposito','levantamento') NOT NULL DEFAULT 'mensalidade'");
        DB::statement("ALTER TABLE pagamentos MODIFY metodo ENUM('dinheiro','transferencia','multicaixa','referencia','carteira') NOT NULL DEFAULT 'dinheiro'");
    }
    public function down(): void {
        DB::statement("ALTER TABLE pagamentos MODIFY metodo ENUM('dinheiro','transferencia','multicaixa','referencia') NOT NULL DEFAULT 'dinheiro'");
        DB::statement("ALTER TABLE pagamentos MODIFY tipo ENUM('matricula','mensalidade','emolumento','outro') NOT NULL DEFAULT 'mensalidade'");
    }
};
