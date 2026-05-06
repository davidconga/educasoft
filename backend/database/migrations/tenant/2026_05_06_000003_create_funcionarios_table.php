<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('funcionarios', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Dados pessoais
            $t->string('nome');
            $t->string('bi', 30)->nullable();
            $t->string('nif', 30)->nullable();
            $t->string('telefone', 30)->nullable();
            $t->string('email')->nullable();
            $t->string('morada')->nullable();
            $t->string('foto')->nullable();
            $t->enum('genero', ['masculino', 'feminino', 'outro'])->nullable();
            $t->date('data_nascimento')->nullable();
            $t->string('naturalidade', 100)->nullable();
            $t->string('estado_civil', 30)->nullable();

            // Dados contratuais
            $t->string('cargo', 100);
            $t->string('departamento', 100)->nullable();
            $t->enum('tipo_contrato', ['efectivo', 'temporario', 'estagiario', 'tarefeiro'])->default('efectivo');
            $t->date('data_admissao');
            $t->date('data_fim')->nullable();
            $t->decimal('salario_base', 12, 2)->default(0);

            // Conta bancária (para pagamento)
            $t->string('iban', 50)->nullable();
            $t->string('banco', 100)->nullable();

            // Estado
            $t->enum('estado', ['activo', 'suspenso', 'demitido', 'reformado'])->default('activo');
            $t->date('data_demissao')->nullable();
            $t->string('motivo_demissao')->nullable();

            $t->text('observacao')->nullable();
            $t->timestamps();

            $t->index(['estado', 'cargo']);
            $t->index('departamento');
        });
    }

    public function down(): void {
        Schema::dropIfExists('funcionarios');
    }
};
