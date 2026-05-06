<?php
namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CaixaSessao extends Model {
    protected $table = "caixa_sessoes";
    protected $fillable = [
        "codigo","operador_id","operador_nome","nome_caixa",
        "fundo_inicial","total_esperado","total_contado","diferenca",
        "observacoes_abertura","observacoes_fecho",
        "abriu_em","fechou_em","status",
    ];
    protected $casts = [
        "fundo_inicial"  => "decimal:2",
        "total_esperado" => "decimal:2",
        "total_contado"  => "decimal:2",
        "diferenca"      => "decimal:2",
        "abriu_em"       => "datetime",
        "fechou_em"      => "datetime",
    ];

    public function movimentos(): HasMany {
        return $this->hasMany(CaixaMovimento::class, "sessao_id");
    }

    public function pagamentos(): HasMany {
        return $this->hasMany(Pagamento::class, "caixa_sessao_id");
    }

    public function isAberta(): bool {
        return $this->status === "aberta";
    }

    /**
     * Soma de entradas - saídas + fundo inicial.
     */
    public function totalEsperadoCalculado(): float {
        $entradas = (float) $this->movimentos()->where("sentido", 1)->sum("valor");
        $saidas   = (float) $this->movimentos()->where("sentido", -1)->sum("valor");
        return round((float) $this->fundo_inicial + $entradas - $saidas, 2);
    }
}
