<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {

    private function tableInfo(): array {
        $db    = DB::connection()->getDatabaseName();
        $table = 'presencas_professores';

        $fk = DB::selectOne("
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            AND CONSTRAINT_NAME LIKE '%professor%'
            LIMIT 1
        ", [$db, $table]);

        $idx = DB::selectOne("
            SELECT INDEX_NAME FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND NON_UNIQUE = 0
            AND INDEX_NAME != 'PRIMARY' AND COLUMN_NAME = 'professor_id'
            LIMIT 1
        ", [$db, $table]);

        return [
            'fk'  => $fk?->CONSTRAINT_NAME,
            'idx' => $idx?->INDEX_NAME,
        ];
    }

    public function up(): void {
        ['fk' => $fk, 'idx' => $idx] = $this->tableInfo();

        if ($fk)  DB::statement("ALTER TABLE presencas_professores DROP FOREIGN KEY `{$fk}`");
        if ($idx) DB::statement("ALTER TABLE presencas_professores DROP INDEX `{$idx}`");

        Schema::table('presencas_professores', function (Blueprint $table) {
            $table->foreignId('horario_id')->nullable()->after('professor_id')
                  ->constrained('horarios')->nullOnDelete();
            $table->string('hora_inicio', 5)->nullable()->after('horario_id');
            $table->string('hora_fim', 5)->nullable()->after('hora_inicio');
            $table->unsignedSmallInteger('minutos_lecionados')->nullable()->after('hora_fim');
            $table->unique(['professor_id', 'horario_id', 'data'], 'presenca_prof_horario_unique');
        });

        DB::statement('ALTER TABLE presencas_professores ADD CONSTRAINT presencas_professores_ibfk_1 FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE CASCADE');
    }

    public function down(): void {
        DB::statement('ALTER TABLE presencas_professores DROP FOREIGN KEY presencas_professores_ibfk_1');

        Schema::table('presencas_professores', function (Blueprint $table) {
            $table->dropUnique('presenca_prof_horario_unique');
            $table->dropConstrainedForeignId('horario_id');
            $table->dropColumn(['hora_inicio', 'hora_fim', 'minutos_lecionados']);
            $table->unique(['professor_id', 'data'], 'presenca_prof_unique');
        });

        DB::statement('ALTER TABLE presencas_professores ADD CONSTRAINT presencas_professores_ibfk_1 FOREIGN KEY (professor_id) REFERENCES professores(id) ON DELETE CASCADE');
    }
};
