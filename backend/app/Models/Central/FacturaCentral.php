<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class FacturaCentral extends Model {
    protected $connection = "mysql";
    protected $table = "facturas_central";
    protected $guarded = [];
    protected $casts = [
        "periodo_inicio"    => "date",
        "periodo_fim"       => "date",
        "data_emissao"      => "date",
        "data_vencimento"   => "date",
        "paga_em"           => "datetime",
        "assinada_em"       => "datetime",
        "vendus_emitido_em" => "datetime",
        "subtotal"          => "decimal:2",
        "desconto_pct"      => "decimal:2",
        "desconto_valor"    => "decimal:2",
        "iva_taxa"          => "decimal:2",
        "iva_valor"         => "decimal:2",
        "total"             => "decimal:2",
    ];

    public function escola(): BelongsTo {
        return $this->belongsTo(Escola::class, "escola_id");
    }

    public function referencias(): HasMany {
        return $this->hasMany(ReferenciaPagamento::class, "factura_id");
    }

    public function comprovativo(): HasOne {
        return $this->hasOne(Comprovativo::class, "factura_id");
    }

    public function isVencida(): bool {
        return $this->estado === "pendente" && $this->data_vencimento && $this->data_vencimento->isPast();
    }
}
