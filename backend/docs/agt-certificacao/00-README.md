# Pacote de Certificação AGT — Educajá

Pacote técnico-administrativo a entregar à Administração Geral Tributária (AGT)
para solicitar a certificação fiscal do software **Educajá** ao abrigo do
Decreto Executivo nº 74/17 (e legislação aplicável em vigor).

## Conteúdo do pacote

| Ficheiro | Descrição | Origem |
|---|---|---|
| 00-README.md | Este índice | — |
| 01-requerimento.md | Requerimento formal ao Director Geral da AGT | preencher e imprimir em papel timbrado |
| 02-memorando-tecnico.md | Memorando técnico do software | preencher campos `<…>` antes de submeter |
| 03-chave-publica-educaja.pem | Chave pública RSA-1024 (PEM) | gerada em `storage/keys/` |
| 04-saft-exemplo-certificado.xml | SAFT-AO de exemplo já assinado | gerado a partir de dados do tenant `demo` |
| 05-checklist.md | Checklist administrativa final | — |

## Próximos passos

1. Preencher e assinar o requerimento (01) e o memorando (02).
2. Reunir os anexos administrativos listados em `05-checklist.md`.
3. Entregar pacote físico (e cópia digital) na repartição AGT competente.
4. Aguardar análise. Quando o nº de validação for emitido, atualizar a constante
   `SOFTWARE_VALIDATION_NUMBER` em `app/Services/Tenant/SaftAoExporter.php`
   e o NIF do produtor — sistema passa automaticamente a modo certificado.

## Estado actual do software

- ✅ Assinatura RSA-SHA1 conforme AGT (cadeia de hash, payload `dataDoc;dataSistema;referencia;total;hashAnterior`)
- ✅ SAFT-AO 1.01_01 (Header + MasterFiles + SourceDocuments)
- ✅ Validação estrutural em saft.co.ao
- ⚠️ AGT validator rejeita ProductID e Hash (esperado — software não certificado)
- ⏳ Certificação AGT (este pacote)
