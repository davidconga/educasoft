<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteChatMensagem extends Model {
    protected $connection = "mysql";
    protected $table = "site_chat_mensagens";
    protected $guarded = [];
    protected $casts = [
        "lida_em" => "datetime",
    ];

    public function chat(): BelongsTo {
        return $this->belongsTo(SiteChat::class, "site_chat_id");
    }
}
