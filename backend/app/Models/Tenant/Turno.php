<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Turno extends Model {
    protected $fillable = ["nome","codigo","hora_inicio","hora_fim","descricao","ativo"];
    protected $casts = ["ativo" => "boolean"];
}
