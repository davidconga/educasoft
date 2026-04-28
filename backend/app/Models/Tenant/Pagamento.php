<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Pagamento extends Model {
    protected $fillable = ["aluno_id","plano_id","propina_id","emolumento_id","referencia","valor","tipo","mes_referencia","metodo","status","data_vencimento","data_pagamento","observacao","comprovativo"];
    protected $casts = ["valor"=>"float","data_vencimento"=>"date","data_pagamento"=>"date"];
    public function aluno() { return $this->belongsTo(Aluno::class); }
    public function plano() { return $this->belongsTo(PlanoPagamento::class, "plano_id"); }
    public function propina() { return $this->belongsTo(PrecarioPropina::class, "propina_id"); }
    public function emolumento() { return $this->belongsTo(PrecarioEmolumento::class, "emolumento_id"); }
}
