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

    public function __construct(Escola $escola, int $ano, ?int $mes = null) {
        $this->escola = $escola;
        $this->ano    = $ano;
        $this->mes    = $mes;
    }

    public function gerarXml(): string {
        $inicio = $this->mes
            ? Carbon::create($this->ano, $this->mes, 1)->startOfDay()
            : Carbon::create($this->ano, 1, 1)->startOfDay();
        $fim = $this->mes
            ? Carbon::create($this->ano, $this->mes, 1)->endOfMonth()->endOfDay()
            : Carbon::create($this->ano, 12, 31)->endOfDay();

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

        $this->writeHeader($xml, $inicio, $fim);
        $this->writeMasterFiles($xml, $clientes, $propinas, $emolumentos);
        $this->writeSourceDocuments($xml, $pagamentos);

        $xml->endElement(); // AuditFile
        $xml->endDocument();
        return $xml->outputMemory();
    }

    private function writeHeader(\XMLWriter $x, Carbon $ini, Carbon $fim): void {
        $x->startElement("Header");
        $x->writeElement("AuditFileVersion",       "1.01_01");
        $x->writeElement("CompanyID",              (string) ($this->escola->codigo ?? $this->escola->id));
        $x->writeElement("TaxRegistrationNumber",  (string) ($this->escola->nif ?? "999999999"));
        $x->writeElement("TaxAccountingBasis",     "F"); // F = Facturação
        $x->writeElement("CompanyName",            (string) ($this->escola->nome ?? "—"));
        $x->startElement("CompanyAddress");
            $x->writeElement("AddressDetail", (string) ($this->escola->endereco ?? "—"));
            $x->writeElement("City",          (string) ($this->escola->getInternal("cidade") ?? "Luanda"));
            $x->writeElement("PostalCode",    "0000");
            $x->writeElement("Country",       "AO");
        $x->endElement();
        $x->writeElement("FiscalYear",           (string) $this->ano);
        $x->writeElement("StartDate",            $ini->format("Y-m-d"));
        $x->writeElement("EndDate",              $fim->format("Y-m-d"));
        $x->writeElement("CurrencyCode",         "AOA");
        $x->writeElement("DateCreated",          now()->format("Y-m-d"));
        $x->writeElement("TaxEntity",            "Global");
        $x->writeElement("ProductCompanyTaxID",  "Educajá-AO");
        $x->writeElement("SoftwareCertificateNumber", "0/AGT/2026"); // placeholder até obter certificação
        $x->writeElement("ProductID",            "Educajá/Educajá");
        $x->writeElement("ProductVersion",       "1.0");
        $x->endElement();
    }

    private function writeMasterFiles(\XMLWriter $x, $clientes, $propinas, $emolumentos): void {
        $x->startElement("MasterFiles");

        // Customers
        foreach ($clientes as $c) {
            $x->startElement("Customer");
            $x->writeElement("CustomerID",            (string) $c->id);
            $x->writeElement("AccountID",             "Desconhecido");
            $x->writeElement("CustomerTaxID",         (string) ($c->bi ?? "999999999"));
            $x->writeElement("CompanyName",           (string) ($c->user?->nome ?? "Aluno {$c->id}"));
            $x->startElement("BillingAddress");
                $x->writeElement("AddressDetail", (string) ($c->endereco ?? "Desconhecido"));
                $x->writeElement("City",          "Desconhecido");
                $x->writeElement("PostalCode",    "0000");
                $x->writeElement("Country",       "AO");
            $x->endElement();
            $x->writeElement("SelfBillingIndicator", "0");
            $x->endElement();
        }

        // Products (propinas + emolumentos)
        foreach ($propinas as $p) {
            $x->startElement("Product");
            $x->writeElement("ProductType",        "S"); // Service
            $x->writeElement("ProductCode",        "PROP-" . $p->id);
            $x->writeElement("ProductDescription", (string) ($p->nome ?? "Propina"));
            $x->writeElement("ProductNumberCode",  "PROP-" . $p->id);
            $x->endElement();
        }
        foreach ($emolumentos as $e) {
            $x->startElement("Product");
            $x->writeElement("ProductType",        "S");
            $x->writeElement("ProductCode",        "EMO-" . $e->id);
            $x->writeElement("ProductDescription", (string) ($e->nome ?? "Emolumento"));
            $x->writeElement("ProductNumberCode",  "EMO-" . $e->id);
            $x->endElement();
        }

        // TaxTable — educação isenta
        $x->startElement("TaxTable");
            $x->startElement("TaxTableEntry");
                $x->writeElement("TaxType",          "IVA");
                $x->writeElement("TaxCountryRegion", "AO");
                $x->writeElement("TaxCode",          "ISE");
                $x->writeElement("Description",      "Isento — serviços de educação");
                $x->writeElement("TaxPercentage",    "0.00");
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

        foreach ($pagamentos as $p) {
            $totalLinha = (float)$p->valor + (float)($p->multa_valor ?? 0);
            $x->startElement("Invoice");
            $x->writeElement("InvoiceNo",       (string) ($p->referencia ?? "PAG-" . $p->id));
            $x->writeElement("DocumentStatus");  // sub-element opcional
            $x->startElement("DocumentStatus");
                $x->writeElement("InvoiceStatus",     "N");
                $x->writeElement("InvoiceStatusDate", optional($p->data_pagamento)->format("Y-m-d\TH:i:s") ?? now()->format("Y-m-d\TH:i:s"));
                $x->writeElement("SourceID",          "system");
                $x->writeElement("SourceBilling",     "P");
            $x->endElement();
            $x->writeElement("Hash",            (string) ($p->assinatura ?? ""));
            $x->writeElement("HashControl",     "1");
            $x->writeElement("Period",          (string) optional($p->data_pagamento)->month);
            $x->writeElement("InvoiceDate",     optional($p->data_pagamento)->format("Y-m-d") ?? now()->format("Y-m-d"));
            $x->writeElement("InvoiceType",     "FT");
            $x->startElement("SpecialRegimes");
                $x->writeElement("SelfBillingIndicator",      "0");
                $x->writeElement("CashVATSchemeIndicator",    "0");
                $x->writeElement("ThirdPartiesBillingIndicator","0");
            $x->endElement();
            $x->writeElement("SourceID",        "system");
            $x->writeElement("SystemEntryDate", ($p->updated_at ?? now())->format("Y-m-d\TH:i:s"));
            $x->writeElement("CustomerID",      (string) $p->aluno_id);

            // Line item
            $x->startElement("Line");
                $x->writeElement("LineNumber",   "1");
                $x->writeElement("ProductCode",  $p->propina_id ? "PROP-".$p->propina_id : ($p->emolumento_id ? "EMO-".$p->emolumento_id : "OUT"));
                $x->writeElement("ProductDescription", (string) ($p->propina?->nome ?? $p->emolumento?->nome ?? $p->tipo));
                $x->writeElement("Quantity",     "1");
                $x->writeElement("UnitOfMeasure","UN");
                $x->writeElement("UnitPrice",    number_format($p->valor, 2, ".", ""));
                $x->writeElement("TaxPointDate", optional($p->data_pagamento)->format("Y-m-d") ?? now()->format("Y-m-d"));
                $x->writeElement("Description",  (string) ($p->mes_referencia ?? $p->tipo));
                $x->writeElement("CreditAmount", number_format($p->valor, 2, ".", ""));
                $x->startElement("Tax");
                    $x->writeElement("TaxType",          "IVA");
                    $x->writeElement("TaxCountryRegion", "AO");
                    $x->writeElement("TaxCode",          "ISE");
                    $x->writeElement("TaxPercentage",    "0.00");
                $x->endElement();
            $x->endElement(); // Line

            // Totals
            $x->startElement("DocumentTotals");
                $x->writeElement("TaxPayable",      "0.00");
                $x->writeElement("NetTotal",        number_format($totalLinha, 2, ".", ""));
                $x->writeElement("GrossTotal",      number_format($totalLinha, 2, ".", ""));
            $x->endElement();

            $x->endElement(); // Invoice
        }

        $x->endElement(); // SalesInvoices
        $x->endElement(); // SourceDocuments
    }
}
