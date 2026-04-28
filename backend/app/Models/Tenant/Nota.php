<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class Nota extends Model {
    protected $fillable = [
        "aluno_id","disciplina_id","turma_id","periodo","ano_letivo",
        "nota_continua","nota_exame","mac","npp","npt","media","resultado",
        "falta_justificada","falta_injustificada",
    ];
    protected $casts = [
        "nota_continua"      => "float",
        "nota_exame"         => "float",
        "mac"                => "float",
        "npp"                => "float",
        "npt"                => "float",
        "media"              => "float",
        "falta_justificada"  => "integer",
        "falta_injustificada"=> "integer",
    ];

    /** Calcula MT a partir de MAC, NPP, NPT (valores não-nulos). */
    public static function calcularMT(?float $mac, ?float $npp, ?float $npt): ?float {
        $vals = array_filter([$mac, $npp, $npt], fn($v) => $v !== null);
        return count($vals) ? round(array_sum($vals) / count($vals), 2) : null;
    }
    public function aluno()      { return $this->belongsTo(Aluno::class); }
    public function disciplina() { return $this->belongsTo(Disciplina::class); }
    public function turma()      { return $this->belongsTo(Turma::class); }
}
