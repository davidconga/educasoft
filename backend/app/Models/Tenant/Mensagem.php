<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class Mensagem extends Model {
    protected $table = "mensagens";
    protected $fillable = ["conversa_id", "user_id", "corpo"];

    public function conversa() { return $this->belongsTo(Conversa::class); }
    public function autor()    { return $this->belongsTo(User::class, "user_id"); }
}
