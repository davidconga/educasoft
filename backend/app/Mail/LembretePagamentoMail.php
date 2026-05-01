<?php
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class LembretePagamentoMail extends Mailable {
    use Queueable, SerializesModels;

    public function __construct(
        public string $assunto,
        public string $corpo,
        public string $alunoNome,
        public string $escolaNome,
        public ?string $logoUrl = null
    ) {}

    public function build() {
        return $this->subject($this->assunto)
            ->view("emails.lembrete_pagamento", [
                "assunto"    => $this->assunto,
                "corpo"      => $this->corpo,
                "alunoNome"  => $this->alunoNome,
                "escolaNome" => $this->escolaNome,
                "logoUrl"    => $this->logoUrl,
            ]);
    }
}
