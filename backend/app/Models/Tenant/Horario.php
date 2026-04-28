<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Horario extends Model {
    protected $fillable = ["turma_id","disciplina_id","professor_id","dia_semana","hora_inicio","hora_fim","sala"];
    public function turma() { return $this->belongsTo(Turma::class); }
    public function disciplina() { return $this->belongsTo(Disciplina::class); }
    public function professor() { return $this->belongsTo(Professor::class); }
}
