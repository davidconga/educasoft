<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Sala extends Model {
    protected $fillable = ["nome","tipo","capacidade","localizacao","descricao","ativo"];
    protected $casts = ["ativo" => "boolean", "capacidade" => "integer"];
}
