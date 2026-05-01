<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Pagamento extends Model {
    protected $fillable = ["aluno_id","plano_id","propina_id","emolumento_id","multa_id","referencia","lote_id","valor","multa_valor","valor_entregue","tipo","mes_referencia","metodo","num_referencia_externa","status","data_vencimento","data_pagamento","observacao","comprovativo","hash_factura","assinatura","hash_anterior","assinada_em"];
    protected $casts = ["valor"=>"float","multa_valor"=>"float","valor_entregue"=>"float","data_vencimento"=>"date","data_pagamento"=>"date"];
    public function aluno() { return $this->belongsTo(Aluno::class); }
    public function plano() { return $this->belongsTo(PlanoPagamento::class, "plano_id"); }
    public function propina() { return $this->belongsTo(PrecarioPropina::class, "propina_id"); }
    public function emolumento() { return $this->belongsTo(PrecarioEmolumento::class, "emolumento_id"); }
    public function multa() { return $this->belongsTo(PrecarioMulta::class, "multa_id"); }
}
