<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('matriculas', function (Blueprint $t) {
            $t->string('observacao', 500)->nullable()->after('aproveitamento_status');
        });
    }

    public function down(): void {
        Schema::table('matriculas', function (Blueprint $t) {
            $t->dropColumn('observacao');
        });
    }
};
