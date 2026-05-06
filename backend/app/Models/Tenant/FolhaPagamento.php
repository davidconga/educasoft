<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class FolhaPagamento extends Model {
    protected $table = 'folhas_pagamento';

    protected $fillable = [
        'funcionario_id', 'mes', 'ano', 'referencia',
        'salario_base', 'subsidios', 'descontos',
        'total_subsidios', 'total_descontos', 'liquido',
        'estado', 'data_pagamento', 'metodo', 'referencia_externa',
        'observacao',
    ];

    protected $casts = [
        'mes'              => 'integer',
        'ano'              => 'integer',
        'subsidios'        => 'array',
        'descontos'        => 'array',
        'salario_base'     => 'decimal:2',
        'total_subsidios'  => 'decimal:2',
        'total_descontos'  => 'decimal:2',
        'liquido'          => 'decimal:2',
        'data_pagamento'   => 'date',
    ];

    public function funcionario() { return $this->belongsTo(Funcionario::class); }
}
