<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('tenants', function (Blueprint $t) {
            $t->boolean('permite_pago_historico')->default(false)->after('formato_impressao');
        });
    }

    public function down(): void {
        Schema::table('tenants', function (Blueprint $t) {
            $t->dropColumn('permite_pago_historico');
        });
    }
};
