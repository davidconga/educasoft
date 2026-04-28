<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class CursoDisciplina extends Model {
    protected $table = "curso_disciplinas";
    protected $fillable = ["curso_id","nome","codigo","carga_horaria","ano","semestre","obrigatoria","descricao"];
    protected $casts = ["obrigatoria" => "boolean", "ano" => "integer", "semestre" => "integer", "carga_horaria" => "integer"];
}
