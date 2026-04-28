<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class PresencaProfessor extends Model {
    protected $table    = 'presencas_professores';
    protected $fillable = ['professor_id', 'data', 'estado', 'observacao'];
    protected $casts    = ['data' => 'date'];

    public function professor() { return $this->belongsTo(Professor::class); }
}
