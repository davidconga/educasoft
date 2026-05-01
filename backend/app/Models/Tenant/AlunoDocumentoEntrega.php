<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class AlunoDocumentoEntrega extends Model {
    protected $table = "aluno_documento_entregas";

    protected $fillable = [
        "aluno_id","tipo_documento_id","entregue","data_entrega",
        "ficheiro","ficheiro_original_nome","observacoes",
    ];

    protected $casts = [
        "entregue"     => "boolean",
        "data_entrega" => "date",
    ];

    public function aluno() { return $this->belongsTo(Aluno::class); }
    public function tipo()  { return $this->belongsTo(TipoDocumento::class, "tipo_documento_id"); }
}
