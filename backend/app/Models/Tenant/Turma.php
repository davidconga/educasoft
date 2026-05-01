<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Turma extends Model {
    protected $fillable = ["nome","nivel","turno","turno_id","ano_letivo","capacidade","classe_id","sala_id","diretor_turma_id","descricao","ativo"];
    protected $casts = ["ativo" => "boolean", "capacidade" => "integer"];
    public function matriculas() { return $this->hasMany(Matricula::class); }
    public function alunos() { return $this->hasManyThrough(Aluno::class, Matricula::class, 'turma_id', 'id', 'id', 'aluno_id'); }
    public function disciplinas() { return $this->belongsToMany(Disciplina::class,"turma_disciplina")->withPivot("professor_id"); }
    public function horarios() { return $this->hasMany(Horario::class); }
    public function aulasRemotas() { return $this->hasMany(AulaRemota::class); }
    public function classe() { return $this->belongsTo(Classe::class); }
    public function turnoObj() { return $this->belongsTo(Turno::class,"turno_id"); }
    public function sala() { return $this->belongsTo(Sala::class); }
    public function diretorTurma() { return $this->belongsTo(Professor::class,"diretor_turma_id"); }

    /** Capacidade efetiva: a sala manda; se não houver sala, usa a capacidade da própria turma. */
    public function capacidadeEfetiva(): int {
        $salaCap = $this->sala?->capacidade;
        if ($salaCap !== null && $salaCap > 0) return (int) $salaCap;
        return (int) ($this->capacidade ?? 0);
    }

    /** Conta matrículas que ocupam vaga (pendente + activa). */
    public function ocupacao(): int {
        return $this->matriculas()->whereIn("status", ["pendente","activa"])->count();
    }

    public function vagas(): int {
        $cap = $this->capacidadeEfetiva();
        return $cap > 0 ? max(0, $cap - $this->ocupacao()) : 0;
    }

    public function estaCheia(): bool {
        $cap = $this->capacidadeEfetiva();
        return $cap > 0 && $this->ocupacao() >= $cap;
    }
}
