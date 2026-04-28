<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class AulaRemota extends Model {
    protected $table = "aulas_remotas";
    protected $fillable = ["turma_id","disciplina_id","professor_id","titulo","descricao","link_jitsi","sala_nome","data_inicio","data_fim","status"];
    protected $casts = ["data_inicio"=>"datetime","data_fim"=>"datetime"];
    public function turma() { return $this->belongsTo(Turma::class); }
    public function disciplina() { return $this->belongsTo(Disciplina::class); }
    public function professor() { return $this->belongsTo(Professor::class); }
    public function materiais() { return $this->hasMany(Material::class, "aula_id"); }
}
