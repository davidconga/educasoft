<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaixaMovimento extends Model {
    protected $table = "caixa_movimentos";
    protected $fillable = [
        "sessao_id","pagamento_id","tipo","sentido",
        "valor","metodo","descricao","operador_id","operador_nome",
    ];
    protected $casts = [
        "valor"   => "decimal:2",
        "sentido" => "integer",
    ];

    public function sessao(): BelongsTo {
        return $this->belongsTo(CaixaSessao::class, "sessao_id");
    }

    public function pagamento(): BelongsTo {
        return $this->belongsTo(Pagamento::class, "pagamento_id");
    }
}
