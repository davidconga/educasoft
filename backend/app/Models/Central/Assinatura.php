<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Assinatura extends Model {
    protected $connection = "mysql";
    protected $table = "assinaturas";
    protected $guarded = [];
    protected $casts = [
        "data_inicio"        => "date",
        "data_fim_trial"     => "date",
        "data_fim"           => "date",
        "proxima_renovacao"  => "date",
        "preco_aplicado"     => "decimal:2",
        "desconto_pct"       => "decimal:2",
        "auto_renovar"       => "boolean",
        "cancelada_em"       => "datetime",
    ];

    public function escola(): BelongsTo {
        return $this->belongsTo(Escola::class, "escola_id");
    }

    public function plano(): BelongsTo {
        return $this->belongsTo(Plano::class, "plano_id");
    }

    public function isAtiva(): bool {
        return in_array($this->estado, ["ativa", "trial"], true)
            && (!$this->data_fim || $this->data_fim->isFuture());
    }

    public function emTrial(): bool {
        return $this->estado === "trial"
            && $this->data_fim_trial
            && $this->data_fim_trial->isFuture();
    }
}
