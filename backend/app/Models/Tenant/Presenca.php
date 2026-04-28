<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class Presenca extends Model {
    protected $fillable = ['aluno_id', 'turma_id', 'disciplina_id', 'data', 'estado', 'observacao'];
    protected $casts    = ['data' => 'date'];

    public function aluno()      { return $this->belongsTo(Aluno::class); }
    public function turma()      { return $this->belongsTo(Turma::class); }
    public function disciplina() { return $this->belongsTo(Disciplina::class); }
}
