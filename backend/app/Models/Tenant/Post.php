<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model {
    use SoftDeletes;

    protected $table = "posts";
    protected $fillable = [
        "autor_user_id", "audiencia", "turma_id", "tipo", "titulo", "corpo",
        "fixado", "resposta_aceite_id", "gostos_count", "comentarios_count",
    ];
    protected $casts = [
        "fixado"            => "boolean",
        "gostos_count"      => "integer",
        "comentarios_count" => "integer",
    ];

    public function autor()       { return $this->belongsTo(User::class, "autor_user_id"); }
    public function turma()       { return $this->belongsTo(Turma::class); }
    public function comentarios() { return $this->hasMany(Comentario::class)->orderBy("created_at"); }
    public function gostos()      { return $this->hasMany(Gosto::class); }
    public function respostaAceite() { return $this->belongsTo(Comentario::class, "resposta_aceite_id"); }
}
