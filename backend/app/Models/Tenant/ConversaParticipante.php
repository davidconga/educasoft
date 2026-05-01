<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class ConversaParticipante extends Model {
    protected $table = "conversa_participantes";
    public $timestamps = false;
    protected $fillable = ["conversa_id", "user_id", "last_read_at", "joined_at"];
    protected $casts = [
        "last_read_at" => "datetime",
        "joined_at"    => "datetime",
    ];

    public function conversa() { return $this->belongsTo(Conversa::class); }
    public function user()     { return $this->belongsTo(User::class); }
}
