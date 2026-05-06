<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class Funcionario extends Model {
    protected $fillable = [
        'user_id', 'professor_id', 'nome', 'bi', 'nif', 'telefone', 'email', 'morada', 'foto',
        'genero', 'data_nascimento', 'naturalidade', 'estado_civil',
        'cargo', 'departamento', 'tipo_contrato', 'data_admissao', 'data_fim',
        'salario_base', 'iban', 'banco',
        'estado', 'data_demissao', 'motivo_demissao', 'observacao',
    ];

    protected $casts = [
        'data_nascimento' => 'date',
        'data_admissao'   => 'date',
        'data_fim'        => 'date',
        'data_demissao'   => 'date',
        'salario_base'    => 'decimal:2',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function professor() { return $this->belongsTo(Professor::class); }
    public function folhas() { return $this->hasMany(FolhaPagamento::class); }
}
