<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
return new class extends Migration {
    public function up(): void {
        DB::statement("ALTER TABLE matriculas MODIFY COLUMN status ENUM('pendente','activa','transferida','concluida','cancelada') NOT NULL DEFAULT 'pendente'");
    }
    public function down(): void {
        DB::statement("UPDATE matriculas SET status = 'activa' WHERE status = 'pendente'");
        DB::statement("ALTER TABLE matriculas MODIFY COLUMN status ENUM('activa','transferida','concluida','cancelada') NOT NULL DEFAULT 'activa'");
    }
};
