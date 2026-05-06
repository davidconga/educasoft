<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class WhatsappLog extends Model {
    protected $connection = "mysql";
    protected $table = "whatsapp_logs";
    protected $guarded = [];
    protected $casts = [
        "enviado_em" => "datetime",
    ];
}
