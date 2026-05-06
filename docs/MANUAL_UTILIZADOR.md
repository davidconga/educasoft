# Manual do Utilizador — Educajá

Sistema de Gestão Escolar.
Última actualização: 2026-05-04.

---

## Índice

1. [Introdução](#1-introdução)
2. [Acesso ao sistema](#2-acesso-ao-sistema)
3. [Configurações iniciais](#3-configurações-iniciais)
4. [Caixa — abrir, gerir, fechar](#4-caixa--abrir-gerir-fechar)
5. [POS — cobrança rápida](#5-pos--cobrança-rápida)
6. [Pagamentos (visão tradicional)](#6-pagamentos-visão-tradicional)
7. [Recibos, impressão e PDF](#7-recibos-impressão-e-pdf)
8. [Verificação por QR](#8-verificação-por-qr)
9. [Multas por atraso](#9-multas-por-atraso)
10. [Bolsas de estudo](#10-bolsas-de-estudo)
11. [Lembretes (email/SMS)](#11-lembretes-emailsms)
12. [Relatórios financeiros](#12-relatórios-financeiros)
13. [Integração Vendus](#13-integração-vendus)
14. [Resolução de problemas](#14-resolução-de-problemas)

---

## 1. Introdução

O Educajá é a plataforma multi-tenant que gere alunos, matrículas, presenças, pagamentos, bolsas e comunicação para escolas em Angola.

### Perfis de utilizador

| Perfil | Acessa | Responsável por |
|---|---|---|
| **Super-admin** (operador) | `/super-admin` | Gestão de escolas, planos, facturação central |
| **Admin de escola** | `/dashboard` | Gestão completa da escola (alunos, finanças, etc.) |
| **Secretaria / Tesouraria** | igual ao admin com permissões reduzidas | Cobrança no POS, fecho de caixa, recibos |
| **Director** | igual ao admin | Aprovação, relatórios |
| **Professor** | `/professor` | Notas, presenças, horário |
| **Aluno / Encarregado** | `/portal` | Consulta de notas, financeiro, comunicação |

---

## 2. Acesso ao sistema

### Login

1. Vai a `https://{a-tua-escola}/login` ou através do domínio principal `https://educaja.com`.
2. Indica **email** e **senha**.
3. O sistema redireciona automaticamente para o portal correspondente ao teu perfil.

### Recuperar senha

Em `/recuperar-senha` introduz o email; recebes link por email para definir nova senha.

### Logout

Botão **Sair** no canto inferior esquerdo do menu lateral.

---

## 3. Configurações iniciais

Antes de operar, garante que estas três áreas estão preenchidas (menu **Configurações**):

### 3.1 Dados da Escola (`/configuracao-escola`)

- Nome, NIF, telefone, endereço.
- **Logotipo** (PNG/JPG até 2 MB) — aparece em todos os recibos e PDFs.

### 3.2 Formato de impressão (`/configuracao-impressao`)

Escolhe o tamanho default dos recibos:

- **A4** — folha standard (210×297 mm), recibo completo.
- **A5** — meia folha (148×210 mm), compacto.
- **POS / Térmica** — tira contínua 80 mm para impressoras térmicas (Epson TM-T20 etc.).

> Os utilizadores podem mudar pontualmente o formato na janela de impressão; o que defines aqui é o **default**.

### 3.3 Integração Vendus (`/integracao-vendus`)

> Opcional, para emissão fiscal certificada.

1. Cria a conta em [vendus.co.ao](https://www.vendus.co.ao).
2. Em **Definições → Chaves API** copia a chave.
3. Cola em **API Key** + indica **Register ID** (ID do terminal/caixa Vendus, ex.: `305643181`).
4. Selecciona ambiente **Produção** (ou Teste).
5. **Guardar** → **Testar ligação** (deve aparecer "Ligação OK").

A partir daqui, cada pagamento confirmado emite automaticamente uma FR no Vendus.

---

## 4. Caixa — abrir, gerir, fechar

`/caixa` no menu **Financeiro**.

### 4.1 Abrir caixa

1. Clica **Abrir caixa**.
2. Indica **Fundo inicial** (dinheiro físico em caixa, pode ser 0).
3. Nome opcional (default: "Caixa {teu_nome}").
4. **Confirmar**.

A sessão fica activa só para ti. Cada operador tem a sua sessão (várias caixas em paralelo).

### 4.2 Durante o dia

Vês no topo:

- **Código da sessão** (ex.: `CX-20260504-001`).
- **Resumo**: fundo inicial, total de pagamentos cobrados, reforços, sangrias, despesas, total esperado em caixa.
- **Movimentos detalhados** (cada cobrança, sangria, etc.).

### 4.3 Tipos de movimento avulso

| Acção | Quando usar |
|---|---|
| **Reforço** (entrada extra) | Recebes mais dinheiro além das cobranças (ex.: troco extra do banco). |
| **Sangria** (retirada) | Tiras dinheiro da caixa (depósito banco, despesa pequena). |
| **Despesa** | Pagamento avulso (lanches, materiais, etc.). |

Cada um pede valor + descrição obrigatória.

### 4.4 Fechar caixa

1. Conta o dinheiro físico.
2. Clica **Fechar caixa**.
3. Indica **Total contado**.
4. Sistema mostra automaticamente a **diferença** (sobra/falta).
5. Adiciona observações se houver irregularidade.
6. **Confirmar fecho**.

A sessão fica histórica. Podes imprimir o **Relatório de fecho** (PDF com todos os movimentos + resumo + assinatura).

### 4.5 Histórico

Todas as sessões aparecem no histórico, com filtros:

- **Período**: Hoje · Últimos 7 dias · Mês actual · Tudo.
- **Operador**: filtro por utilizador (visível para directores).

Card **Resumo agregado** no topo mostra os totais do período seleccionado.

---

## 5. POS — cobrança rápida

`/pos` no menu **Financeiro**.

> Antes de usar o POS precisas de **abrir uma caixa**. Se não houver, o ecrã oferece "Abrir caixa rápida".

### 5.1 Procurar aluno

- Escreve **nº de aluno**, **nome** ou **email** na caixa de pesquisa.
- Selecciona da lista (mostra foto, número e turma).

### 5.2 Banner de mensalidades vencidas

Se o aluno tiver mensalidades em atraso, aparece um **banner vermelho destacado** com a contagem e total. Clicar activa o filtro automático.

### 5.3 Selecção de dívidas

A lista mostra todos os pagamentos pendentes do aluno, **ordenados cronologicamente**.

**Regra de ordem**: não é permitido seleccionar um mês futuro antes de um anterior estar pago/seleccionado. Se tentares, o sistema bloqueia com mensagem indicando os meses em atraso.

**Filtros disponíveis (chips)**:
- **Tipo**: Mensalidade · Matrícula · Emolumento · ...
- **Mês**: filtros pelos meses presentes nas dívidas.
- **Estado**: Todas · Só vencidas.

### 5.4 Cobrar

1. Selecciona uma ou várias dívidas (checkboxes).
2. **Total a cobrar** aparece em destaque.
3. Escolhe **Método de pagamento**:
   - Dinheiro → mostra campo "Valor entregue" (calcula troco).
   - Multicaixa / Multicaixa Express / Transferência / Referência / Cheque → mostra campo **"Nº de referência *"** obrigatório.
4. **Validação automática da referência**:
   - Formato verificado em tempo real (números, dígitos certos por método).
   - Verificação de **duplicação**: se a referência já foi usada noutro pagamento, aparece aviso vermelho com detalhes.
5. Clicar **Cobrar**.

**O que acontece automaticamente:**
- Pagamentos marcados como **pagos** com data de hoje.
- Vinculados ao **lote_id** único.
- **Assinados localmente** (chave RSA Educajá).
- **Vinculados à sessão de caixa activa**.
- **Emitidos no Vendus** (FR) se a integração estiver activa.
- **Recibo impresso automaticamente** no formato configurado.

### 5.5 Métodos suportados

| Método | Formato da referência |
|---|---|
| Dinheiro | (sem) |
| Multicaixa / Multicaixa Express | 6–15 dígitos |
| Referência Multicaixa | exactamente 9 dígitos |
| Transferência | mínimo 4 caracteres |
| Cheque | 6–12 dígitos (nº do cheque) |

---

## 6. Pagamentos (visão tradicional)

`/pagamentos` no menu **Financeiro**.

Diferente do POS — vista de gestão geral, não optimizada para cobrança rápida.

- Lista todos os pagamentos com filtros (aluno, status, tipo, mês, ano lectivo, turma).
- Botões por pagamento: **Confirmar** (dialog de pagamento), **Imprimir recibo**, **Estornar** (anula pagamento), **Lembrete email/SMS**.
- Selecção múltipla → **Cobrar selecionados** (igual ao POS).
- Indicador Vendus na coluna acção: 🟢 emitido (clique abre PDF), 🔴 falhou (clique re-emite), ⚪ por emitir.

### Gerar propinas mensais

Botão **Gerar propinas do mês** — cria pagamentos pendentes para todos os alunos activos com base no preçário.

### Estornar

1. No pagamento pago, clica **↩ Estornar**.
2. Indica motivo (mínimo 5 caracteres).
3. O pagamento volta a "pendente" e fica histórico do estorno (motivo + utilizador + data).

---

## 7. Recibos, impressão e PDF

### Janela de impressão

Ao clicar em qualquer **Imprimir recibo**, abre uma janela com:

- **Selector de formato**: A4 · A5 · Ticket (POS).
- **Indicador "(configurado: X)"** — mostra qual é o default da escola.
- Botão **Imprimir** → diálogo do browser.

> Se imprimes em térmica e sai com tamanho errado, no diálogo do Chrome expande **"Mais definições" → "Tamanho do papel"** e selecciona "Roll Paper 80mm" ou personalizado 80×297mm.

### Recibo individual

Mostra:
- Logo + dados da escola.
- Aluno: nome, nº, turma.
- Descrição do pagamento, mês de referência, valor base, multa, total.
- Hash de assinatura digital.
- Bloco "Saldo da carteira" (totais pagos/pendentes do aluno).
- **QR de verificação** no canto inferior.
- Assinaturas tesoureiro / encarregado.

### Recibo de lote

Quando cobras vários pagamentos em simultâneo:
- Tabela detalhada com todas as linhas.
- Total geral.
- Mesmo QR (codifica `lote_id`).

### PDF dedicado

Endpoint `/pagamentos/{id}/recibo.pdf` ou `/pagamentos/lote/{loteId}/recibo.pdf` — gera PDF A4 fiscal com hash, QR e assinaturas. Aceita `?download=1` para forçar download.

---

## 8. Verificação por QR

Cada documento fiscal tem um **QR no canto** que aponta para uma página pública de verificação:

| Documento | URL |
|---|---|
| Recibo de pagamento | `/verificar-recibo/{escola}/{ref}` |
| Recibo de bolsa | `/verificar-recibo-bolsa/{escola}/{ref}` |
| Fecho de caixa | `/verificar-fecho-caixa/{escola}/{codigo}` |
| Factura (subscrição) | `/verificar-factura/{numero}` |

Quem ler o QR (com qualquer leitor mobile) vê:
- ✅ "Documento autêntico" (verde) ou ❌ "Inválido / anulado" (amarelo) consoante validação.
- Detalhes essenciais: aluno, valor, data, método.
- Logo da escola.
- Hash com confirmação ✓/✗.

> Não exige login. Não expõe dados sensíveis (NIF completo, contactos, etc.).

---

## 9. Multas por atraso

### Configurar regras (`/precario` → aba Multas)

Cada regra tem:
- **Aplicar em**: tipo de pagamento (mensalidade, matrícula, etc.) ou todos.
- **Dias de carência** após vencimento.
- **Tipo de cálculo**: percentagem ou valor fixo.
- **Valor**: % ou Kz.

### Como funciona

- Quando um pagamento ultrapassa o vencimento, a multa é calculada automaticamente.
- A regra aplicada é a com **maior `dias_carencia`** que ainda seja ≤ dias em atraso (escala progressiva).
- Multa aparece como `multa_valor` no pagamento e adicionada ao total a cobrar.
- Quando confirmado o pagamento, a multa é **persistida** no recibo.

Exemplo: 3 regras (15, 20, 25 dias) → aluno com 30 dias em atraso paga a multa da regra de 25 dias.

---

## 10. Bolsas de estudo

`/bolsas` (requer feature **bolsas** activa no plano).

### Fluxo

1. Cadastra **Financiadores** (`/financiadores`): nome, contactos.
2. Cadastra **Bolsa** atribuída a um aluno: financiador, percentagem ou valor mensal, ano lectivo.
3. Sistema aplica automaticamente o desconto na geração mensal de propinas (`bolsa_valor` no pagamento).
4. O recibo mostra: valor base − bolsa = total devido.
5. Para o financiador: emite-se um **recibo de bolsa** separado (PDF com QR próprio).

---

## 11. Lembretes (email/SMS)

`/lembretes` (requer feature **lembretes_email_sms**).

### Configuração

- **Dias antes do vencimento**: ex.: 5, 1.
- **Dias após** (em atraso): ex.: 3, 7, 15.
- **Canais**: email, SMS, ambos.
- **Templates**: personaliza assunto/corpo.

### Disparo

- **Automático**: cron diário verifica pagamentos com vencimento próximo/passado e dispara.
- **Manual**: na lista de pagamentos, ícone ✉️ (email) ou 💬 (SMS) ao lado de cada pagamento pendente.

---

## 12. Relatórios financeiros

| Relatório | Local | Conteúdo |
|---|---|---|
| **Tesouraria** | `/tesouraria` | Vista geral: receita, despesas, saldo |
| **Relatório diário** | `/relatorio-diario` | Movimentos do dia (todas as caixas) |
| **Relatório financeiro** | `/relatorio-financeiro` | Por mês/intervalo |
| **Controlo de propinas** | `/controlo-propinas` | Quem pagou/quem deve, por turma |
| **Controlo de emolumentos** | `/controlo-emolumentos` | Idem para emolumentos |
| **Carteira do aluno** | `/carteira-aluno` | Saldo individual de cada aluno |
| **Resumo de caixa** | `/caixa` (card no topo) | Totais agregados por período/operador |
| **SAFT-AO** | botão `SaftButton` em várias páginas | Exportação fiscal AGT |

---

## 13. Integração Vendus

Já configurada em [§3.3](#33-integração-vendus). Detalhes adicionais:

### O que se passa

1. Quando confirmas um pagamento (POS ou Pagamentos), o Educajá envia uma **FR (Factura/Recibo)** ao Vendus.
2. Conteúdo enviado: aluno (nome + email), descrição, valor total, método de pagamento, data.
3. Recebe de volta: `vendus_document_id`, `vendus_numero` (ex.: `FR 01P2026/1574`), `hash`.

### Indicadores na lista

- 🟢 verde: emitido com sucesso → clica abre PDF Vendus.
- 🔴 vermelho: falha → tooltip mostra erro, clicar re-tenta.
- ⚪ cinza: ainda não emitido → clicar emite manualmente.

### Re-emissão

Se a integração esteve em baixo durante uma cobrança, podes re-emitir individualmente clicando no ícone vermelho. O sistema **não duplica** se já tem `vendus_document_id`.

---

## 14. Resolução de problemas

### "Não há caixa aberta para o operador"

→ Vai a `/caixa` → **Abrir caixa**, ou usa "Abrir caixa rápida" no `/pos`.

### Recibo imprime no formato errado

1. Confirma em `/configuracao-impressao` qual o formato activo.
2. Na janela de impressão, vê o badge **"(configurado: X)"** no topo.
3. Se está certo mas o output sai diferente: o browser pode estar a forçar tamanho. No diálogo de impressão, **"Mais definições" → "Tamanho do papel"** → selecciona o correcto.
4. Para impressoras térmicas: o driver Windows deve ter perfil `Roll Paper 80mm`.

### Botão "Cobrar" não responde

1. Confirma que tens **caixa aberta**.
2. Confirma que seleccionaste pelo menos um pagamento.
3. Se método for multicaixa/transferência, garante que o **Nº de referência** está preenchido e válido (sem aviso vermelho).
4. Recarrega a página com **Ctrl+Shift+R** (limpa cache).
5. Abre F12 → Console e procura erros vermelhos. Reporta o erro.

### "Esta referência já foi usada"

→ A referência foi usada noutro pagamento. O aviso mostra qual (recibo, aluno, data). Se for genuíno duplicado, evita. Se foi engano de digitação, corrige.

### Vendus retorna erro

Erros típicos:
- `403`: API key sem permissões → verifica conta Vendus.
- `400 — A data não pode ser anterior à do último documento`: o sistema agora usa sempre `today()` na FR; este erro não deve mais aparecer.
- `400 — Bad payment id`: ID de método de pagamento da conta Vendus não detectado. Cache em `storage/framework/cache/data/...`. Limpa a cache.

### Estado de caixa inconsistente

Se a UI mostra caixa aberta mas o backend não a encontra:
1. Botão **"↻ Recarregar"** no topo da página `/caixa`.
2. Se persistir: F12 → Application → Local Storage → apaga tudo do domínio → faz logout/login.

### Migração de dados antigos (Golfinho)

Comando para sincronizar pagamentos do sistema legado:
```
php artisan golfinho:migrar-pagamentos          # dry-run (mostra o que ia mudar)
php artisan golfinho:migrar-pagamentos --force  # executa
```
Idempotente — só actualiza o que mudou desde a última corrida.

---

## Apêndice: estrutura de URLs

### Admin de escola

| URL | Descrição |
|---|---|
| `/dashboard` | Dashboard principal |
| `/alunos` · `/alunos/{id}` | Gestão alunos |
| `/matriculas` · `/matriculas/renovacao` | Matrículas |
| `/professores` | Gestão professores |
| `/turmas` · `/turmas/{id}` | Turmas |
| `/notas` · `/notas/pauta` | Notas e pautas |
| `/presencas` · `/presencas-professores` | Presenças |
| `/horarios` | Horários |
| `/pos` | **POS — cobrança rápida** |
| `/caixa` | **Gestão de caixa** |
| `/pagamentos` | Pagamentos (gestão tradicional) |
| `/tesouraria` | Tesouraria geral |
| `/precario` | Preçário (propinas, emolumentos, multas) |
| `/controlo-propinas` · `/controlo-emolumentos` | Controlo financeiro |
| `/carteira-aluno` | Carteira individual |
| `/relatorio-diario` · `/relatorio-financeiro` | Relatórios |
| `/folha-prova` | Folhas de prova com QR |
| `/financiadores` · `/bolsas` | Bolsas de estudo |
| `/lembretes` | Lembretes propinas |
| `/cartao-estudante` | Cartão de estudante |
| `/configuracao-escola` | Dados da escola + logo |
| `/configuracao-impressao` | Formato default impressão |
| `/integracao-vendus` | Configurar Vendus |
| `/utilizadores` · `/permissoes` | Gestão acessos |
| `/comunidade` · `/chat` | Comunicação |

### Páginas públicas (sem login)

| URL | Descrição |
|---|---|
| `/p/{escola}/{numero}` | Perfil público do aluno (QR cartão) |
| `/verificar-prova/{codigo}` | Verificar folha de prova |
| `/verificar-recibo/{escola}/{ref}` | Verificar recibo de pagamento |
| `/verificar-recibo-bolsa/{escola}/{ref}` | Verificar recibo de bolsa |
| `/verificar-fecho-caixa/{escola}/{codigo}` | Verificar fecho de caixa |
| `/verificar-factura/{numero}` | Verificar factura central |
| `/verificar-recibo-central/{numero}` | Verificar comprovativo central |

### Super-admin

| URL | Descrição |
|---|---|
| `/super-admin` | Dashboard operador |
| `/super-admin/escolas` | Gestão escolas |
| `/super-admin/clientes` · `/super-admin/assinaturas` | Clientes e assinaturas |
| `/super-admin/planos` | Planos comerciais |
| `/super-admin/facturas` | Facturação central |
| `/super-admin/termos` | Termos e condições |
| `/super-admin/vendus` | Estado integração Vendus operador |
| `/super-admin/contactos` · `/super-admin/chat` | Contactos do site + chat |

---

## Suporte

- Email: `suporte@educaja.com`
- Reportar bugs: `https://github.com/anthropics/claude-code/issues` (placeholder — substituir pelo canal real)
