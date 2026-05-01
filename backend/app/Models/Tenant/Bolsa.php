<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class Bolsa extends Model {
    protected $fillable = [
        "aluno_id","matricula_id","financiador_id","tipo","valor",
        "cobre_propinas","cobre_emolumentos","cobre_matricula",
        "data_inicio","status","cancelada_em","motivo_cancelamento",
        "cancelada_por_user_id","observacoes",
    ];
    protected $casts = [
        "valor"             => "float",
        "data_inicio"       => "date",
        "cancelada_em"      => "date",
        "cobre_propinas"    => "boolean",
        "cobre_emolumentos" => "boolean",
        "cobre_matricula"   => "boolean",
    ];

    public function aluno()        { return $this->belongsTo(Aluno::class); }
    public function matricula()    { return $this->belongsTo(Matricula::class); }
    public function financiador()  { return $this->belongsTo(Financiador::class); }
    public function pagamentos()   { return $this->hasMany(Pagamento::class); }
    public function recibos()      { return $this->hasMany(ReciboBolsa::class); }

    /** Calcula o desconto a aplicar a um valor base. */
    public function calcularDesconto(float $valorBase): float {
        if ($this->status !== "activa") return 0;
        if ($this->tipo === "percentagem") {
            return round($valorBase * min(100, max(0, $this->valor)) / 100, 2);
        }
        return min($valorBase, max(0, $this->valor));
    }

    /** True se a bolsa cobre o tipo de pagamento (propina|emolumento|matricula). */
    public function cobre(string $tipo): bool {
        return match ($tipo) {
            "propina"     => (bool) $this->cobre_propinas,
            "emolumento"  => (bool) $this->cobre_emolumentos,
            "matricula"   => (bool) $this->cobre_matricula,
            default       => false,
        };
    }

    public function isInterna(): bool {
        return $this->financiador_id === null;
    }
}
