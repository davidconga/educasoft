<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Professor extends Model {
    protected $table = "professores";
    protected $fillable = ["user_id","numero_professor","especialidade","habilitacoes","data_admissao","foto"];
    public function user() { return $this->belongsTo(User::class); }
    public function horarios() { return $this->hasMany(Horario::class); }
    public function turmas() { return $this->belongsToMany(Turma::class,"turma_disciplina")->distinct(); }
    public function disciplinas() { return $this->belongsToMany(Disciplina::class,"turma_disciplina"); }
    public function funcionario() { return $this->hasOne(Funcionario::class); }
}
