<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Disciplina extends Model {
    protected $fillable = ["nome","codigo","carga_horaria"];
    public function turmas() { return $this->belongsToMany(Turma::class,"turma_disciplina"); }
    public function professores() { return $this->belongsToMany(Professor::class,"turma_disciplina"); }
    public function notas() { return $this->hasMany(Nota::class); }
}
