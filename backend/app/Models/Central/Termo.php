<?php
namespace App\Models\Central;

use Illuminate\Database\Eloquent\Model;

class Termo extends Model {
    protected $connection = "mysql";
    protected $table = "termos";
    protected $guarded = [];
    protected $casts = [
        "publicado"    => "boolean",
        "publicado_em" => "datetime",
    ];

    public static function atual(): ?self {
        return static::where("publicado", true)
            ->orderByDesc("publicado_em")
            ->orderByDesc("id")
            ->first();
    }
}
