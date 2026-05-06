<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comprovativo extends Model {
    protected $connection = "mysql";
    protected $table = "comprovativos";
    protected $guarded = [];
    protected $casts = [
        "data_emissao" => "date",
        "valor"        => "decimal:2",
    ];

    public function factura(): BelongsTo {
        return $this->belongsTo(FacturaCentral::class, "factura_id");
    }
}
