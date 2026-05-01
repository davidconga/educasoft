<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class PresencaProfessor extends Model {
    protected $table    = 'presencas_professores';
    protected $fillable = ['professor_id', 'horario_id', 'data', 'hora_inicio', 'hora_fim', 'minutos_lecionados', 'estado', 'observacao'];
    protected $casts    = ['data' => 'date'];

    public function professor() { return $this->belongsTo(Professor::class); }
    public function horario()   { return $this->belongsTo(Horario::class); }
}
