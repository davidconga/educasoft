<?php
namespace App\Console\Commands;

use App\Services\Tenant\FacturaSigner;
use Illuminate\Console\Command;

class GerarChaveFiscal extends Command
{
    protected $signature   = "educaja:gerar-chave-fiscal {--force : Sobrescreve a chave existente}";
    protected $description = "Gera o par de chaves RSA da plataforma Educajá usado para assinar facturas.";

    public function handle(): int
    {
        if (FacturaSigner::keyExists() && !$this->option("force")) {
            $this->warn("Chave já existe em " . FacturaSigner::privateKeyPath());
            $this->line("Use --force para sobrescrever (CUIDADO: invalida a verificação de facturas antigas).");
            return self::FAILURE;
        }

        FacturaSigner::generateKeyPair();

        $this->info("Chave RSA 1024 gerada com sucesso:");
        $this->line("  Privada: " . FacturaSigner::privateKeyPath() . " (chmod 600)");
        $this->line("  Pública: " . FacturaSigner::publicKeyPath()  . " (chmod 644)");
        $this->newLine();
        $this->warn("⚠ FAÇA BACKUP da chave privada IMEDIATAMENTE.");
        $this->warn("⚠ Se perder esta chave, todas as facturas anteriores deixam de poder ser verificadas.");
        return self::SUCCESS;
    }
}
