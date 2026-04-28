<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Material extends Model {
    protected $table = "materiais";
    protected $fillable = ["aula_id","disciplina_id","turma_id","titulo","tipo","arquivo","url"];
    public function aula() { return $this->belongsTo(AulaRemota::class, "aula_id"); }
    public function disciplina() { return $this->belongsTo(Disciplina::class); }
    public function turma() { return $this->belongsTo(Turma::class); }
}
