<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comentario extends Model {
    use SoftDeletes;

    protected $table = "comentarios";
    protected $fillable = ["post_id", "autor_user_id", "corpo"];

    public function post()  { return $this->belongsTo(Post::class); }
    public function autor() { return $this->belongsTo(User::class, "autor_user_id"); }
}
