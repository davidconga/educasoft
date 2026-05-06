<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferenciaPagamento extends Model {
    protected $connection = "mysql";
    protected $table = "referencias_pagamento";
    protected $guarded = [];
    protected $casts = [
        "expira_em"        => "datetime",
        "paga_em"          => "datetime",
        "valor"            => "decimal:2",
        "gateway_request"  => "array",
        "gateway_response" => "array",
    ];

    public function factura(): BelongsTo {
        return $this->belongsTo(FacturaCentral::class, "factura_id");
    }

    public function expirada(): bool {
        return $this->estado === "pendente" && $this->expira_em && $this->expira_em->isPast();
    }
}
