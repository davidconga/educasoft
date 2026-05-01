<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
class Aluno extends Model {
    protected $fillable = ["user_id","numero_aluno","data_nascimento","genero","naturalidade","nacionalidade","bi","nome_pai","nome_mae","telefone_responsavel","email_responsavel","endereco","foto"];
    public function user() { return $this->belongsTo(User::class); }
    public function matriculas() { return $this->hasMany(Matricula::class); }
    public function notas() { return $this->hasMany(Nota::class); }
    public function pagamentos() { return $this->hasMany(Pagamento::class); }
    public function documento() { return $this->hasOne(AlunoDocumento::class); }
    public function entregasDocumentos() { return $this->hasMany(AlunoDocumentoEntrega::class); }
    public function turmaActual() {
        return $this->matriculas()->where("status","activa")->with("turma")->latest()->first()?->turma;
    }
}
