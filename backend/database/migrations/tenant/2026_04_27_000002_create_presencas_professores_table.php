<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('presencas_professores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professor_id')->constrained('professores')->cascadeOnDelete();
            $table->date('data');
            $table->enum('estado', ['presente', 'falta_justificada', 'falta_injustificada'])->default('presente');
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->unique(['professor_id', 'data']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('presencas_professores');
    }
};
