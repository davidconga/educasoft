<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class Gosto extends Model {
    protected $table = "gostos";
    public $timestamps = false;
    protected $fillable = ["post_id", "user_id", "created_at"];
    protected $casts = ["created_at" => "datetime"];

    public function post() { return $this->belongsTo(Post::class); }
    public function user() { return $this->belongsTo(User::class); }
}
