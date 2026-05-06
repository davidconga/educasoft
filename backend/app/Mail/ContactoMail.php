<?php
namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ContactoMail extends Mailable {
    use Queueable, SerializesModels;

    public function __construct(public array $dados) {}

    public function build() {
        $assunto = "[Educajá] Novo contacto de " . ($this->dados["nome"] ?? "site");
        return $this->subject($assunto)
            ->replyTo($this->dados["email"], $this->dados["nome"] ?? null)
            ->view("emails.contacto", ["d" => $this->dados]);
    }
}
