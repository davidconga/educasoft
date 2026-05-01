<?php
namespace App\Services\Tenant;

use App\Models\Central\Escola;
use App\Models\Tenant\Aluno;
use App\Models\Tenant\Pagamento;
use App\Models\Tenant\PrecarioPropina;
use App\Models\Tenant\PrecarioEmolumento;
use Carbon\Carbon;

/**
 * Gera o ficheiro SAFT-AO (Standard Audit File for Tax — Angola) para
 * declaração fiscal junto da AGT.
 *
 * Esta é uma implementação base — cobre Header + MasterFiles + SourceDocuments
 * (SalesInvoices). NÃO substitui validação contra schema oficial da AGT
 * nem certificação do software.
 */
class SaftAoExporter {
    private Escola $escola;
    private int $ano;
    private ?int $mes;
    private ?string $softwareValidationOverride;

    /** Número de validação AGT do software. Placeholder "0/AGT/YYYY" → não certificado. */
    private const SOFTWARE_VALIDATION_NUMBER = "0/AGT/2026";

    public function __construct(Escola $escola, int $ano, ?int $mes = null, ?string $softwareValidationOverride = null) {
        $this->escola                     = $escola;
        $this->ano                        = $ano;
        $this->mes                        = $mes;
        $this->softwareValidationOverride = $softwareValidationOverride;
    }

    private function softwareValidationNumber(): string {
        return $this->softwareValidationOverride ?? self::SOFTWARE_VALIDATION_NUMBER;
    }

    /** True se o software ainda não está certificado pela AGT (placeholder "0/AGT/..."). */
    private function isUncertified(): bool {
        return str_starts_with($this->softwareValidationNumber(), "0/");
    }

    public function gerarXml(): string {
        $hoje   = Carbon::today()->endOfDay();
        $inicio = $this->mes
            ? Carbon::create($this->ano, $this->mes, 1)->startOfDay()
            : Carbon::create($this->ano, 1, 1)->startOfDay();
        $fimRaw = $this->mes
            ? Carbon::create($this->ano, $this->mes, 1)->endOfMonth()->endOfDay()
            : Carbon::create($this->ano, 12, 31)->endOfDay();
        // EndDate não pode ser maior que DateCreated (=hoje) — AGT rejeita
        $fim = $fimRaw->greaterThan($hoje) ? $hoje : $fimRaw;

        $pagamentos = Pagamento::with("aluno.user")
            ->whereNotNull("data_pagamento")
            ->where("status", "pago")
            ->whereBetween("data_pagamento", [$inicio, $fim])
            ->orderBy("data_pagamento")->get();

        $alunoIds   = $pagamentos->pluck("aluno_id")->unique()->values();
        $clientes   = Aluno::with("user")->whereIn("id", $alunoIds)->get();
        $propinas   = PrecarioPropina::all();
        $emolumentos= PrecarioEmolumento::all();

        $xml = new \XMLWriter();
        $xml->openMemory();
        $xml->setIndent(true);
        $xml->setIndentString("  ");
        $xml->startDocument("1.0", "UTF-8");

        $xml->startElement("AuditFile");
        $xml->writeAttribute("xmlns", "urn:OECD:StandardAuditFile-Tax:AO_1.01_01");
        $xml->writeAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");

        $this->writeHeader($xml, $inicio, $fim);
        $this->writeMasterFiles($xml, $clientes, $propinas, $emolumentos);
        $this->writeSourceDocuments($xml, $pagamentos);

        $xml->endElement(); // AuditFile
        $xml->endDocument();
        return $xml->outputMemory();
    }

    private function writeHeader(\XMLWriter $x, Carbon $ini, Carbon $fim): void {
        $nif         = (string) ($this->escola->nif ?? $this->escola->getInternal("nif") ?? "999999999");
        $nomeEscola  = (string) ($this->escola->nome ?? "Escola");

        $x->startElement("Header");
        $x->writeElement("AuditFileVersion",       "1.01_01");
        $x->writeElement("CompanyID",              $nif);
        $x->writeElement("TaxRegistrationNumber",  $nif);
        $x->writeElement("TaxAccountingBasis",     "F");
        $x->writeElement("CompanyName",            $nomeEscola);
        $x->startElement("CompanyAddress");
            $x->writeElement("AddressDetail", (string) ($this->escola->endereco ?: "Desconhecido"));
            $x->writeElement("City",          (string) ($this->escola->getInternal("cidade") ?? "Luanda"));
            $x->writeElement("Country",       "AO");
        $x->endElement();
        $x->writeElement("FiscalYear",                  (string) $this->ano);
        $x->writeElement("StartDate",                   $ini->format("Y-m-d"));
        $x->writeElement("EndDate",                     $fim->format("Y-m-d"));
        $x->writeElement("CurrencyCode",                "AOA");
        $x->writeElement("DateCreated",                 now()->format("Y-m-d"));
        $x->writeElement("TaxEntity",                   "Global");
        // Fallback: até obter certificação AGT, usamos o próprio NIF da escola como produtor
        // e ProductID = "EducajaAO/<NomeEscolaSemAcentos>". Ao certificar substituir por NIF
        // real do produtor de software e SoftwareValidationNumber emitido pela AGT.
        $x->writeElement("ProductCompanyTaxID",         $nif);
        $x->writeElement("SoftwareValidationNumber",    $this->softwareValidationNumber());
        // ProductID: "<NomeProduto>/<NomeEmpresaProdutora>". AGT exige formato simples,
        // sem espaços nem caracteres especiais (saft.co.ao aceita espaços, AGT não).
        $x->writeElement("ProductID",                   "EducajaAO/Educaja");
        $x->writeElement("ProductVersion",              "1.0");
        $x->endElement();
    }

    private function writeMasterFiles(\XMLWriter $x, $clientes, $propinas, $emolumentos): void {
        $x->startElement("MasterFiles");

        // Customers
        foreach ($clientes as $c) {
            $x->startElement("Customer");
            $x->writeElement("CustomerID",      (string) $c->id);
            $x->writeElement("AccountID",       "Desconhecido");
            $x->writeElement("CustomerTaxID",   (string) ($c->bi ?: "999999999"));
            $x->writeElement("CompanyName",     (string) ($c->user?->nome ?? "Aluno {$c->id}"));
            $x->startElement("BillingAddress");
                $x->writeElement("AddressDetail", (string) ($c->endereco ?: "Desconhecido"));
                $x->writeElement("City",          "Desconhecido");
                $x->writeElement("PostalCode",    "Desconhecido");
                $x->writeElement("Country",       "AO");
            $x->endElement();
            if ($c->telefone_responsavel) $x->writeElement("Telephone", (string)$c->telefone_responsavel);
            if ($c->user?->email)         $x->writeElement("Email",     (string)$c->user->email);
            $x->writeElement("SelfBillingIndicator", "0");
            $x->endElement();
        }

        // Products (propinas + emolumentos) — type S (Service)
        foreach ($propinas as $p) {
            $x->startElement("Product");
            $x->writeElement("ProductType",        "S");
            $x->writeElement("ProductCode",        "PROP-" . $p->id);
            $x->writeElement("ProductDescription", (string) ($p->nome ?: "Propina"));
            $x->writeElement("ProductNumberCode",  "PROP-" . $p->id);
            $x->endElement();
        }
        foreach ($emolumentos as $e) {
            $x->startElement("Product");
            $x->writeElement("ProductType",        "S");
            $x->writeElement("ProductCode",        "EMO-" . $e->id);
            $x->writeElement("ProductDescription", (string) ($e->nome ?: "Emolumento"));
            $x->writeElement("ProductNumberCode",  "EMO-" . $e->id);
            $x->endElement();
        }

        // Produto especial para multas (referenciado nas Lines de multa)
        $x->startElement("Product");
        $x->writeElement("ProductType",        "S");
        $x->writeElement("ProductCode",        "MULTA");
        $x->writeElement("ProductDescription", "Multa por atraso");
        $x->writeElement("ProductNumberCode",  "MULTA");
        $x->endElement();

        // TaxTable — educação isenta de IVA (alínea f) art.12 CIVA, código M15)
        $x->startElement("TaxTable");
            $x->startElement("TaxTableEntry");
                $x->writeElement("TaxType",          "IVA");
                $x->writeElement("TaxCountryRegion", "AO");
                $x->writeElement("TaxCode",          "ISE");
                $x->writeElement("Description",      "IVA ISE 0%");
                $x->writeElement("TaxPercentage",    "0");
            $x->endElement();
        $x->endElement();

        $x->endElement(); // MasterFiles
    }

    private function writeSourceDocuments(\XMLWriter $x, $pagamentos): void {
        $x->startElement("SourceDocuments");
        $x->startElement("SalesInvoices");
        $totalDebit  = 0.0;
        $totalCredit = $pagamentos->sum(fn($p) => (float)$p->valor + (float)($p->multa_valor ?? 0));
        $x->writeElement("NumberOfEntries", (string) $pagamentos->count());
        $x->writeElement("TotalDebit",      number_format($totalDebit, 2, ".", ""));
        $x->writeElement("TotalCredit",     number_format($totalCredit, 2, ".", ""));

        $sourceId = (string) ($this->escola->nif ?? $this->escola->getInternal("nif") ?? "0");

        foreach ($pagamentos as $p) {
            $totalLinha    = (float)$p->valor + (float)($p->multa_valor ?? 0);
            $dataPag       = optional($p->data_pagamento)->format("Y-m-d") ?? now()->format("Y-m-d");
            $dataPagFull   = optional($p->data_pagamento)->format("Y-m-d\TH:i:s") ?? ($p->updated_at ?? now())->format("Y-m-d\TH:i:s");
            // Formato AGT: "FR YYYY/N" — usa o mesmo helper que o signer (garante consistência)
            $invoiceNo = \App\Services\Tenant\FacturaSigner::invoiceNoFor($p);

            $x->startElement("Invoice");
            $x->writeElement("InvoiceNo",  $invoiceNo);
            $x->startElement("DocumentStatus");
                $x->writeElement("InvoiceStatus",     "N");
                $x->writeElement("InvoiceStatusDate", $dataPagFull);
                $x->writeElement("SourceID",          $sourceId);
                $x->writeElement("SourceBilling",     "P");
            $x->endElement();
            // Software não certificado pela AGT (spec 7.d): Hash="0" e HashControl="Não Validado pela AGT".
            // Quando o software for certificado, comutar SOFTWARE_VALIDATION_NUMBER para o número real
            // emitido pela AGT — passa automaticamente a emitir Hash + HashControl reais.
            if ($this->isUncertified()) {
                $x->writeElement("Hash",        "0");
                $x->writeElement("HashControl", "Não Validado pela AGT");
            } else {
                $hashFactura = !empty($p->assinatura) ? (string) $p->assinatura : "0";
                $x->writeElement("Hash",        $hashFactura);
                $x->writeElement("HashControl", $hashFactura === "0" ? "0" : "1");
            }
            $x->writeElement("Period",      (string) ((int) optional($p->data_pagamento)->month ?: 1));
            $x->writeElement("InvoiceDate", $dataPag);
            $x->writeElement("InvoiceType", "FR"); // FR = Factura-Recibo
            $x->startElement("SpecialRegimes");
                $x->writeElement("SelfBillingIndicator",        "0");
                $x->writeElement("CashVATSchemeIndicator",      "0");
                $x->writeElement("ThirdPartiesBillingIndicator","0");
            $x->endElement();
            $x->writeElement("SourceID",        $sourceId);
            $x->writeElement("SystemEntryDate", $dataPagFull);
            $x->writeElement("CustomerID",      (string) $p->aluno_id);

            // Line
            $x->startElement("Line");
                $x->writeElement("LineNumber",         "1");
                $x->writeElement("ProductCode",        $p->propina_id ? "PROP-".$p->propina_id : ($p->emolumento_id ? "EMO-".$p->emolumento_id : "OUT"));
                $x->writeElement("ProductDescription", (string) ($p->propina?->nome ?: $p->emolumento?->nome ?: ucfirst($p->tipo)));
                $x->writeElement("Quantity",           "1");
                $x->writeElement("UnitOfMeasure",      "Uni");
                $x->writeElement("UnitPrice",          number_format($p->valor, 6, ".", ""));
                $x->writeElement("TaxPointDate",       $dataPag);
                $x->writeElement("Description",        (string) ($p->propina?->nome ?: $p->emolumento?->nome ?: ucfirst($p->tipo)));
                $x->writeElement("CreditAmount",       number_format($p->valor, 6, ".", ""));
                $x->startElement("Tax");
                    $x->writeElement("TaxType",          "IVA");
                    $x->writeElement("TaxCountryRegion", "AO");
                    $x->writeElement("TaxCode",          "ISE");
                    $x->writeElement("TaxPercentage",    "0");
                $x->endElement();
                $x->writeElement("TaxExemptionReason", "Isento nos termos da alínea f) do nº1 do artigo 12.º do CIVA");
                $x->writeElement("TaxExemptionCode",   "M15");
            $x->endElement(); // Line

            // Multa: linha adicional se houver
            if (((float)($p->multa_valor ?? 0)) > 0.009) {
                $x->startElement("Line");
                    $x->writeElement("LineNumber",         "2");
                    $x->writeElement("ProductCode",        "MULTA");
                    $x->writeElement("ProductDescription", "Multa por atraso");
                    $x->writeElement("Quantity",           "1");
                    $x->writeElement("UnitOfMeasure",      "Uni");
                    $x->writeElement("UnitPrice",          number_format($p->multa_valor, 6, ".", ""));
                    $x->writeElement("TaxPointDate",       $dataPag);
                    $x->writeElement("Description",        "Multa por atraso");
                    $x->writeElement("CreditAmount",       number_format($p->multa_valor, 6, ".", ""));
                    $x->startElement("Tax");
                        $x->writeElement("TaxType",          "IVA");
                        $x->writeElement("TaxCountryRegion", "AO");
                        $x->writeElement("TaxCode",          "ISE");
                        $x->writeElement("TaxPercentage",    "0");
                    $x->endElement();
                    $x->writeElement("TaxExemptionReason", "Isento nos termos da alínea f) do nº1 do artigo 12.º do CIVA");
                    $x->writeElement("TaxExemptionCode",   "M15");
                $x->endElement();
            }

            // Totals + Payment
            $x->startElement("DocumentTotals");
                $x->writeElement("TaxPayable", "0.00");
                $x->writeElement("NetTotal",   number_format($totalLinha, 2, ".", ""));
                $x->writeElement("GrossTotal", number_format($totalLinha, 2, ".", ""));
                $x->startElement("Payment");
                    $x->writeElement("PaymentMechanism", $this->mapPaymentMechanism($p->metodo));
                    $x->writeElement("PaymentAmount",    number_format($totalLinha, 2, ".", ""));
                    $x->writeElement("PaymentDate",      $dataPag);
                $x->endElement();
            $x->endElement();

            $x->endElement(); // Invoice
        }

        $x->endElement(); // SalesInvoices
        $x->endElement(); // SourceDocuments
    }

    /** Mapeia métodos internos → códigos AGT (PaymentMechanism). */
    private function mapPaymentMechanism(?string $metodo): string {
        return match($metodo) {
            "dinheiro"      => "CD",  // Cash deposit
            "transferencia" => "TB",  // Transfer
            "multicaixa"    => "MB",  // Multibanco / Multicaixa
            "referencia"    => "MB",
            default         => "OU",  // Outro
        };
    }
}
