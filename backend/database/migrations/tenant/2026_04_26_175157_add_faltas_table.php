<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('notas', function (Blueprint $table) {
            if (!Schema::hasColumn('notas', 'falta_injustificada')) {
                $table->integer('falta_injustificada')->default(0);
            }
            if (!Schema::hasColumn('notas', 'falta_justificada')) {
                $table->integer('falta_justificada')->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('notas', function (Blueprint $table) {
            //
        });
    }
};
