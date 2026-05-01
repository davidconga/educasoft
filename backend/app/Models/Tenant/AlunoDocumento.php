<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;

class AlunoDocumento extends Model {
    protected $table = "aluno_documentos";

    protected $fillable = [
        "aluno_id",
        "provincia","municipio","bairro",
        "bi_emissao_data","bi_emissao_local",
        "bi_pai","profissao_pai",
        "bi_mae","profissao_mae",
        "nome_encarregado","relacao_encarregado","bi_encarregado",
        "telefone_encarregado","email_encarregado","profissao_encarregado",
        "tipo_sanguineo","alergias","observacoes_medicas",
        "escola_anterior","classe_anterior","ano_anterior",
        "religiao",
    ];

    protected $casts = [
        "bi_emissao_data" => "date",
    ];

    public function aluno() { return $this->belongsTo(Aluno::class); }

    /** Lista de campos que aceitam input via form (inscrição/edição). */
    public static function inputFields(): array {
        return [
            "provincia","municipio","bairro",
            "bi_emissao_data","bi_emissao_local",
            "bi_pai","profissao_pai",
            "bi_mae","profissao_mae",
            "nome_encarregado","relacao_encarregado","bi_encarregado",
            "telefone_encarregado","email_encarregado","profissao_encarregado",
            "tipo_sanguineo","alergias","observacoes_medicas",
            "escola_anterior","classe_anterior","ano_anterior",
            "religiao",
        ];
    }
}
