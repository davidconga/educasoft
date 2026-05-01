<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class Conversa extends Model {
    protected $table = "conversas";
    protected $fillable = [
        "tipo", "turma_id", "titulo", "criada_por_user_id", "ultima_mensagem_em",
    ];
    protected $casts = [
        "ultima_mensagem_em" => "datetime",
    ];

    public function turma()        { return $this->belongsTo(Turma::class); }
    public function mensagens()    { return $this->hasMany(Mensagem::class)->orderBy("created_at"); }
    public function ultimaMensagem() { return $this->hasOne(Mensagem::class)->latestOfMany(); }
    public function participantes() { return $this->hasMany(ConversaParticipante::class); }
    public function utilizadores() {
        return $this->belongsToMany(User::class, "conversa_participantes")
            ->withPivot(["last_read_at", "joined_at"]);
    }

    public function temParticipante(int $userId): bool {
        return $this->participantes()->where("user_id", $userId)->exists();
    }
}
