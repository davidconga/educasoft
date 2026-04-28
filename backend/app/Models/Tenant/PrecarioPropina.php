<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class PrecarioPropina extends Model {
    protected $table = "precario_propinas";
    protected $fillable = ["nome","nivel","turno","valor_mensal","ano_letivo","curso_id","descricao"];
    protected $casts = ["valor_mensal" => "float"];
}
