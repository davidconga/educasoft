<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Classe extends Model {
    protected $table = "classes";
    protected $fillable = ["nome","nivel","ordem","curso_id","descricao","ativo"];
    protected $casts = ["ativo" => "boolean", "ordem" => "integer"];
    public function curso()  { return $this->belongsTo(Curso::class); }
    public function turmas() { return $this->hasMany(Turma::class); }
}
