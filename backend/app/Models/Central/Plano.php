<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plano extends Model {
    protected $connection = "mysql";
    protected $table = "planos";
    protected $guarded = [];
    protected $casts = [
        "features"     => "array",
        "feature_keys" => "array",
        "destaque"     => "boolean",
        "ativo"        => "boolean",
        "preco_mensal" => "decimal:2",
        "preco_anual"  => "decimal:2",
        "max_alunos"   => "integer",
        "max_admins"   => "integer",
        "ordem"        => "integer",
        "dias_trial"   => "integer",
    ];

    public function assinaturas(): HasMany {
        return $this->hasMany(Assinatura::class, "plano_id");
    }

    public function isGratuito(): bool {
        return (float) $this->preco_mensal <= 0;
    }
}
