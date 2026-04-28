<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class PrecarioMulta extends Model {
    protected $table = "precario_multas";
    protected $fillable = ["nome","tipo_calculo","valor","dias_carencia","aplicar_em","descricao","ativo","ano_letivo","curso_id","nivel"];
    protected $casts = ["ativo" => "boolean", "valor" => "float", "dias_carencia" => "integer"];
}
