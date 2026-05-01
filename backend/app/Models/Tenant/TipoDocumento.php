<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class TipoDocumento extends Model {
    protected $table = "tipos_documento";

    protected $fillable = [
        "nome","descricao","obrigatorio","bloqueia_matricula","aceita_upload",
        "ativo","ordem","curso_id","classe_id",
    ];

    protected $casts = [
        "obrigatorio"        => "boolean",
        "bloqueia_matricula" => "boolean",
        "aceita_upload"      => "boolean",
        "ativo"              => "boolean",
        "ordem"              => "integer",
    ];

    public function curso()  { return $this->belongsTo(Curso::class); }
    public function classe() { return $this->belongsTo(Classe::class); }

    /** Tipos aplicáveis a um escopo curso/classe (null = qualquer). */
    public static function aplicaveisAo(?int $cursoId = null, ?int $classeId = null) {
        return static::where("ativo", true)
            ->where(fn($q) => $q->whereNull("curso_id")->orWhere("curso_id", $cursoId))
            ->where(fn($q) => $q->whereNull("classe_id")->orWhere("classe_id", $classeId))
            ->orderBy("ordem")
            ->get();
    }
}
