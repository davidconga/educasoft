<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void {
        DB::statement("ALTER TABLE pagamentos DROP FOREIGN KEY pagamentos_plano_id_foreign");
        DB::statement("ALTER TABLE pagamentos MODIFY plano_id bigint unsigned NULL");
        DB::statement("ALTER TABLE pagamentos ADD CONSTRAINT pagamentos_plano_id_foreign FOREIGN KEY (plano_id) REFERENCES planos_pagamento(id) ON DELETE SET NULL");
    }
    public function down(): void {
        DB::statement("ALTER TABLE pagamentos DROP FOREIGN KEY pagamentos_plano_id_foreign");
        DB::statement("ALTER TABLE pagamentos MODIFY plano_id bigint unsigned NOT NULL");
        DB::statement("ALTER TABLE pagamentos ADD CONSTRAINT pagamentos_plano_id_foreign FOREIGN KEY (plano_id) REFERENCES planos_pagamento(id) ON DELETE CASCADE");
    }
};
