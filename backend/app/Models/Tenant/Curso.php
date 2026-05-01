<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Curso extends Model {
    protected $fillable = ["nome","codigo","area","nivel_ensino","duracao_anos","descricao","ativo"];
    protected $casts = ["ativo" => "boolean", "duracao_anos" => "integer"];
    public function disciplinas() { return $this->hasMany(CursoDisciplina::class); }
    public function classes()     { return $this->hasMany(Classe::class); }
}
