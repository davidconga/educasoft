<?php
namespace App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;

class LembretePagamento extends Model {
    protected $table = "lembretes_pagamento";
    protected $fillable = [
        "pagamento_id","aluno_id","canal","destinatario",
        "gatilho","dias_offset","mensagem","status","tentativas","enviado_em","erro","lida_em",
    ];
    protected $casts = [
        "enviado_em"  => "datetime",
        "lida_em"     => "datetime",
        "tentativas"  => "integer",
        "dias_offset" => "integer",
    ];

    public function pagamento() { return $this->belongsTo(Pagamento::class); }
    public function aluno()     { return $this->belongsTo(Aluno::class); }
}
