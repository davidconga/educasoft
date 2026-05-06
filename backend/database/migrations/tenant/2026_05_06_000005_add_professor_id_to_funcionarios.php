<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('funcionarios', function (Blueprint $t) {
            $t->foreignId('professor_id')->nullable()->after('user_id')
              ->constrained('professores')->nullOnDelete();
            $t->unique('professor_id');
        });
    }

    public function down(): void {
        Schema::table('funcionarios', function (Blueprint $t) {
            $t->dropUnique(['professor_id']);
            $t->dropForeign(['professor_id']);
            $t->dropColumn('professor_id');
        });
    }
};
