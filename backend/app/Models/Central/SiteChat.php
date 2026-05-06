<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SiteChat extends Model {
    protected $connection = "mysql";
    protected $table = "site_chats";
    protected $guarded = [];
    protected $casts = [
        "ultima_mensagem_em" => "datetime",
        "nao_lidas_admin"    => "integer",
        "nao_lidas_visitante"=> "integer",
    ];

    public function mensagens(): HasMany {
        return $this->hasMany(SiteChatMensagem::class, "site_chat_id");
    }
}
