<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class PlanoPagamento extends Model {
    protected $table = "planos_pagamento";
    protected $fillable = ["nome","valor_matricula","valor_mensalidade","nivel","ano_letivo","ativo","observacao"];
    protected $casts = ["ativo"=>"boolean","valor_matricula"=>"float","valor_mensalidade"=>"float"];
    public function pagamentos() { return $this->hasMany(Pagamento::class, "plano_id"); }
}
