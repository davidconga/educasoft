<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class RegraAproveitamento extends Model {
    protected $table = "regras_aproveitamento";

    protected $fillable = [
        "nome","descricao","ativa","prioridade",
        "nivel_ensino","curso_id","classe_id","ano_letivo",
        "config",
    ];

    protected $casts = [
        "ativa"      => "boolean",
        "prioridade" => "integer",
        "config"     => "array",
    ];

    public function curso()  { return $this->belongsTo(Curso::class); }
    public function classe() { return $this->belongsTo(Classe::class); }

    /** Quão específica é a regra; usada para resolver conflitos (mais alta vence). */
    public function especificidade(): int {
        $score = 0;
        if ($this->classe_id)    $score += 8;
        if ($this->curso_id)     $score += 4;
        if ($this->nivel_ensino) $score += 2;
        if ($this->ano_letivo)   $score += 1;
        return $score;
    }
}
