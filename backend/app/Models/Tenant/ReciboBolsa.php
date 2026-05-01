<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class ReciboBolsa extends Model {
    protected $table = "recibos_bolsa";
    protected $fillable = [
        "financiador_id","aluno_id","bolsa_id","referencia",
        "data_emissao","valor_total","observacoes","emitido_por_user_id",
    ];
    protected $casts = [
        "data_emissao" => "date",
        "valor_total"  => "float",
    ];

    public function financiador() { return $this->belongsTo(Financiador::class); }
    public function aluno()       { return $this->belongsTo(Aluno::class); }
    public function bolsa()       { return $this->belongsTo(Bolsa::class); }
    public function pagamentos()  { return $this->hasMany(Pagamento::class, "recibo_bolsa_id"); }
}
