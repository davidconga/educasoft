<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Matricula extends Model {
    protected $fillable = ["aluno_id","turma_id","ano_letivo","status","data_matricula"];
    public function aluno() { return $this->belongsTo(Aluno::class); }
    public function turma() { return $this->belongsTo(Turma::class); }
}
