<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class Financiador extends Model {
    protected $table = "financiadores";
    protected $fillable = [
        "nome","tipo","nif","email","telefone","endereco",
        "contacto_responsavel","observacoes","activo",
    ];
    protected $casts = ["activo" => "boolean"];

    public function bolsas() { return $this->hasMany(Bolsa::class); }
    public function recibos() { return $this->hasMany(ReciboBolsa::class); }
}
