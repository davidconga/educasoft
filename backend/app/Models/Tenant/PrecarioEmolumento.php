<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class PrecarioEmolumento extends Model {
    protected $table = "precario_emolumentos";
    protected $fillable = ["nome","categoria","valor","obrigatorio","ano_letivo","curso_id","nivel","descricao"];
    protected $casts = ["obrigatorio" => "boolean", "valor" => "float"];
}
