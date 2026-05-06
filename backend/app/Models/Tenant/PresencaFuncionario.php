<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class PresencaFuncionario extends Model {
    protected $table = 'presencas_funcionarios';

    protected $fillable = [
        'funcionario_id', 'data', 'entrada', 'saida',
        'horas_trabalhadas', 'estado', 'justificacao',
        'observacao', 'registado_por',
    ];

    protected $casts = [
        'data'              => 'date',
        'horas_trabalhadas' => 'decimal:2',
    ];

    public function funcionario() { return $this->belongsTo(Funcionario::class); }
}
