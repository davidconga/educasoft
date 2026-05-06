<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('presencas_funcionarios', function (Blueprint $t) {
            $t->id();
            $t->foreignId('funcionario_id')->constrained('funcionarios')->cascadeOnDelete();
            $t->date('data');
            $t->time('entrada')->nullable();
            $t->time('saida')->nullable();
            $t->decimal('horas_trabalhadas', 5, 2)->nullable();
            $t->enum('estado', [
                'presente', 'ausente', 'atrasado', 'falta_justificada',
                'ferias', 'baixa_medica', 'folga',
            ])->default('presente');
            $t->string('justificacao', 500)->nullable();
            $t->string('observacao', 500)->nullable();
            $t->string('registado_por')->nullable(); // nome do user que registou
            $t->timestamps();

            $t->unique(['funcionario_id', 'data']);
            $t->index('data');
            $t->index('estado');
        });
    }

    public function down(): void {
        Schema::dropIfExists('presencas_funcionarios');
    }
};
