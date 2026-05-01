# Memorando Técnico — Software Educajá

**Pedido de Certificação Fiscal AGT**
**Versão do documento:** 1.0
**Data:** <preencher>

---

## 1. Identificação

| Campo | Valor |
|---|---|
| Produto | Educajá |
| Versão | 1.0 |
| Produtor | <Nome legal>, LDA |
| NIF do produtor | <NIF> |
| Email técnico | <suporte@educaja.com> |
| ProductID (SAFT) | EducajaAO/Educaja |

## 2. Arquitectura

Sistema multi-tenant onde cada escola cliente tem a sua base de dados
isolada (modelo `database-per-tenant`), partilhando uma base central que
mantém a lista de escolas e identidade.

- **Backend:** Laravel 11 (PHP 8.2)
- **Frontend:** React + Vite (SPA)
- **Mobile:** Capacitor (Android)
- **Base de dados:** MySQL/MariaDB
- **Servidor:** Linux (Ubuntu 22.04+)

## 3. Processo de assinatura digital de facturas

### 3.1 Par de chaves

A Educajá mantém um único par de chaves RSA-1024 (`storage/keys/educaja_private.pem`
e `educaja_public.pem`) usado para assinar facturas-recibo de **todas** as
escolas clientes. A chave privada está protegida com permissões `0600` e
acesso apenas pelo utilizador do servidor web. A chave pública anexa ao
processo (documento 03) é publicada para verificação por terceiros.

### 3.2 Algoritmo

- Assinatura: **RSA com SHA-1** (`OPENSSL_ALGO_SHA1`)
- Codificação do resultado: **Base64**
- Hash visível impresso na factura: 4 caracteres extraídos das posições
  **1, 11, 21, 31** da assinatura Base64

### 3.3 Payload assinado

Para cada factura-recibo `FR YYYY/N`, o sistema constrói a string:

```
{InvoiceDate};{SystemEntryDate};{InvoiceNo};{GrossTotal};{HashFacturaAnterior}
```

| Campo | Formato | Exemplo |
|---|---|---|
| InvoiceDate | `YYYY-MM-DD` | `2026-04-30` |
| SystemEntryDate | `YYYY-MM-DDTHH:MM:SS` | `2026-04-30T15:42:11` |
| InvoiceNo | `FR YYYY/N` | `FR 2026/4` |
| GrossTotal | número, 2 decimais | `15000.00` |
| HashFacturaAnterior | assinatura Base64 da factura anterior, ou vazio para a primeira | `qMyqcPq...=` |

### 3.4 Cadeia de integridade

Cada factura embute no seu payload a assinatura Base64 da factura
**imediatamente anterior** do mesmo tenant (escola). A primeira factura de
cada escola tem `HashFacturaAnterior=""` (vazio), conforme regulamento AGT
secção 5.e.

A alteração de qualquer campo de uma factura passada invalida toda a cadeia
descendente — detectável por verificação RSA usando a chave pública anexa.

### 3.5 Persistência

A assinatura completa Base64 e os 4 caracteres visíveis são gravados na
tabela `pagamentos` (colunas `assinatura`, `hash_factura`, `hash_anterior`,
`assinada_em`). Não existe rotina de actualização nem eliminação destes
campos depois de gravados.

## 4. Geração do SAFT-AO

### 4.1 Esquema

`urn:OECD:StandardAuditFile-Tax:AO_1.01_01`

### 4.2 Estrutura

```
AuditFile
├── Header
├── MasterFiles
│   ├── Customer (alunos pagadores no período)
│   ├── Product (propinas, emolumentos, MULTA)
│   └── TaxTable (IVA ISE 0%)
└── SourceDocuments
    └── SalesInvoices (facturas-recibo do período, com Hash + cadeia)
```

### 4.3 Tipo de documento

Apenas **FR (Factura-Recibo)** — sistema não emite facturas pendentes de
recibo separado; cada pagamento confirmado gera uma FR única.

### 4.4 Regime fiscal

Educação está isenta de IVA pela **alínea f) do nº1 do artigo 12.º do CIVA**
(código de isenção AGT: **M15**). Todas as linhas de factura são emitidas
com `TaxPercentage=0` e o `TaxExemptionReason`/`TaxExemptionCode`
correspondentes.

## 5. Controlo de acessos

- Cada escola tem subdomínio dedicado (`<codigo>.educaja.com`)
- Autenticação via JWT com middleware multi-tenant
- Permissões granulares por papel: Admin, Tesoureiro, Professor, Director, Aluno
- Audit log de operações fiscais (criação, anulação, transferência)

## 6. Não-funcionalidades garantidas

- ❌ **Não existe** UI nem endpoint para alterar campos fiscais (`valor`,
  `data_pagamento`, `referencia`) após `status="pago"`
- ❌ **Não existe** UI nem endpoint para apagar facturas — apenas anulação
  com motivo e auditoria
- ❌ **Não existe** mecanismo para regenerar assinatura sem regenerar a
  cadeia descendente
- ✅ A anulação é registada como operação separada com data, motivo e
  utilizador; o registo original é mantido inalterado

## 7. Backup e retenção

- Cópia de segurança completa diária da base de dados
- Retenção mínima de **10 anos** (conforme exigência fiscal angolana)
- Logs de assinatura preservados separadamente
