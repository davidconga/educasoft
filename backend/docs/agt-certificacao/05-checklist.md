# Checklist de Submissão — Certificação AGT

## Documentação técnica (gerada por este pacote)

- [ ] 01-requerimento.md preenchido, impresso em papel timbrado e assinado
- [ ] 02-memorando-tecnico.md preenchido (campos `<…>`) e impresso
- [ ] 03-chave-publica-educaja.pem (entregar em CD/USB + impressão para arquivo)
- [ ] 04-saft-exemplo-certificado.xml (entregar em CD/USB)

## Documentação administrativa (a obter pela Educajá)

- [ ] Certidão comercial actualizada da Educajá, LDA
- [ ] Alvará de actividade
- [ ] Certidão de não devedor à AGT (válida)
- [ ] Cópia do BI do(s) representante(s) legal(is)
- [ ] Procuração (se requerimento submetido por terceiros)
- [ ] Comprovativo de pagamento dos emolumentos (montante a confirmar na delegação AGT)

## Submissão

- [ ] Identificar a delegação AGT competente (Luanda — Direcção dos Serviços de Tecnologias)
- [ ] Marcar reunião prévia para confirmar requisitos actuais (regulamento pode ter sido revisto desde Decreto 74/17)
- [ ] Entregar pacote físico em duplicado (original + cópia carimbada)
- [ ] Entregar suporte digital (USB/CD) com chave pública e SAFT exemplo
- [ ] Obter recibo de entrada com nº de processo

## Pós-submissão

- [ ] Aguardar análise técnica da AGT (prazo típico: 30 a 90 dias)
- [ ] Responder a pedidos de esclarecimento se houver
- [ ] Após emissão do **Número de Validação**:
  - [ ] Atualizar `SOFTWARE_VALIDATION_NUMBER` em `app/Services/Tenant/SaftAoExporter.php:25`
  - [ ] Atualizar `ProductCompanyTaxID` para o NIF real do produtor
  - [ ] Eventualmente atualizar `ProductID` se a AGT atribuir designação diferente
  - [ ] Re-gerar SAFT em modo certificado e validar contra AGT
  - [ ] Comunicar a todos os clientes (escolas) que o sistema está certificado

## Notas

- A certificação é do **software**, não da escola cliente. Uma única
  certificação cobre todas as escolas que usem o Educajá.
- O número de validação é da forma `NNN/AGT/AAAA` (ex: `142/AGT/2019`).
- Manter a chave privada inalterada após certificação. Trocar a chave
  obriga a nova certificação (porque a chave pública registada na AGT
  deixaria de corresponder).
