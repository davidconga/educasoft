# Guia Rápido — Educajá

Para começares a usar **hoje**. 5 cenários práticos do dia-a-dia.
Para detalhes completos consulta o [Manual do Utilizador](MANUAL_UTILIZADOR.md).

---

## ⚡ Primeiro dia — 10 minutos

### 1. Entrar
- Abre `https://{tua-escola}/login`.
- Indica email + senha que o director te deu.

### 2. Verificar dados da escola
**Menu Configurações → Dados da Escola**

- Confirma nome, NIF, telefone, endereço.
- Carrega o **logotipo** (PNG até 2 MB) — vai aparecer em todos os recibos.

### 3. Escolher formato de impressão
**Menu Configurações → Impressão**

| Tens | Escolhe |
|---|---|
| Impressora normal A4 | **A4** |
| Impressora A5 ou metade-folha | **A5** |
| Impressora térmica 80 mm | **POS / Térmica** |

### 4. (Opcional) Activar Vendus
Se a escola usa Vendus para faturação fiscal, **Menu Configurações → Integração Vendus**:
1. Cola a **API Key** da tua conta Vendus.
2. Indica o **Register ID** (ID da caixa Vendus).
3. **Guardar** → **Testar ligação** → deves ver "Ligação OK".

Pronto, já podes operar.

---

## 💵 Cenário 1: Cobrar uma propina via POS

> Tempo: ~30 segundos por cobrança.

### Passos

1. **Menu Financeiro → POS**
2. Se for a primeira cobrança do dia, clica **"Abrir caixa rápida"**:
   - Fundo inicial: indica o dinheiro físico em caixa (pode ser `0`).
   - **Abrir caixa**.
3. Na barra de pesquisa, escreve **nome ou nº do aluno**.
4. Clica no aluno.
5. Vês a lista de mensalidades pendentes ordenadas pelo mais antigo.
6. **Marca as caixinhas** dos meses a cobrar.
   - ⚠️ Não podes marcar Dezembro sem marcar Setembro/Outubro/Novembro primeiro — a regra cronológica bloqueia.
7. Em baixo aparece o painel de pagamento:
   - **Método**: por defeito Multicaixa.
     - Se for **Multicaixa**, escreve o nº da transacção (6-15 dígitos).
     - Se for **Dinheiro**, indica valor entregue (calcula troco).
8. Clica **Cobrar**.
9. **Auto:** o recibo imprime no formato configurado, e a referência fica vinculada à caixa do dia.

### Atalhos úteis

- **Banner vermelho** "X mensalidades vencidas": clica para filtrar só as em atraso.
- Filtros em chips: **Tipo**, **Mês**, **Estado**.
- Indicador da referência:
  - 🟢 livre → pode cobrar.
  - 🔴 já usada → mostra qual o pagamento que a usou.

---

## 🔒 Cenário 2: Fechar caixa no fim do dia

> Tempo: 2 minutos.

1. **Menu Financeiro → Caixa**
2. Vê o resumo do dia: pagamentos + reforços − sangrias − despesas + fundo inicial = **Total esperado em caixa**.
3. Conta o dinheiro físico que tens.
4. Clica **Fechar caixa**.
5. Indica o **Total contado**.
6. O sistema mostra a **diferença**:
   - 0 → tudo OK ✓
   - positivo → sobra (verde) — deves entender porquê.
   - negativo → falta (vermelho) — deves entender porquê.
7. Adiciona observações se necessário.
8. **Confirmar fecho**.
9. Clica **Relatório** para imprimir o PDF do fecho (com QR para auditoria).

### Movimentos avulso (durante o dia)

| Ação | Quando |
|---|---|
| **Reforço** ⬇️ | Recebes mais dinheiro fora das cobranças. |
| **Sangria** ⬆️ | Tiras dinheiro (ex.: depósito banco). |
| **Despesa** | Pagamento avulso (lanches, materiais, transporte). |

Cada movimento exige **valor + descrição**.

---

## 📄 Cenário 3: Gerar propinas do mês para todos

> Tempo: ~1 minuto.

1. **Menu Financeiro → Finanças**
2. Clica **"Gerar propinas do mês"**.
3. Selecciona o **mês** e **ano**.
4. Sistema cria pagamentos pendentes para **todos os alunos com matrícula activa**, com base no preçário (`/precario`).
5. Aparecem na lista como `pendente` com data de vencimento e valor.

### Notas

- Não duplica: se já existe propina daquele mês para o aluno, salta.
- Bolsas são aplicadas automaticamente (`bolsa_valor`).
- Pode-se reprocessar — o sistema só adiciona o que falta.

---

## ⚠️ Cenário 4: Aluno em atraso quer pagar

### Passo a passo

1. **Menu Financeiro → POS** (com caixa aberta)
2. Procura o aluno.
3. Clica no banner vermelho **"X mensalidades vencidas"** para filtrar.
4. Marca os meses em atraso (na ordem cronológica).
5. Vê o **valor total**: cada mensalidade tem multa automática:
   - 15-19 dias atraso → 350 Kz
   - 20-24 dias → 700 Kz
   - 25+ dias → 3.500 Kz

   (As multas dependem das regras configuradas em `/precario` → Multas)

6. Cobra normalmente.

### Encarregado pede comprovativo de quitação

Após a cobrança:
- O recibo já imprimiu.
- Precisas de outro? **Menu Financeiro → Finanças** → procura o pagamento → ícone **🖨 Imprimir recibo**.
- Para PDF: ícone PDF na coluna de acções.

---

## 🔍 Cenário 5: Consultar dívida de um aluno

### Vista rápida (POS)

1. **Menu Financeiro → POS** (mesmo sem cobrar)
2. Procura o aluno.
3. Topo direito mostra **"Total devido: X Kz"**.
4. Lista mostra detalhe por mês.
5. Quando terminares, fecha o ecrã do aluno (X no topo).

### Carteira completa (histórico)

1. **Menu Financeiro → Carteira do Aluno**
2. Procura o aluno.
3. Vês:
   - Total pago (vida toda)
   - Total pendente
   - Saldo
   - Histórico cronológico de todos os pagamentos.

### Imprimir lista de devedores da turma

1. **Menu Financeiro → Controlo Propinas**
2. Filtros: turma + ano lectivo + mês.
3. Vês quem pagou (verde) e quem deve (vermelho).
4. Botão **Imprimir / PDF** no canto superior.

---

## ⌨️ Atalhos & Truques

| Truque | Como |
|---|---|
| Limpar cache (depois de update) | `Ctrl+Shift+R` |
| Imprimir recibo manualmente | Janela aberta → **Imprimir** ou `Ctrl+P` |
| Verificar autenticidade dum recibo | Lê o **QR** com o telemóvel — abre página de verificação online |
| Copiar nº de aluno rápido | Click sobre o número no perfil — copia para clipboard |
| Filtrar lista grande | Usa as **chips** no topo (clicar uma desactiva, clicar outra muda) |
| Re-emitir recibo no Vendus | Ícone vermelho 🔴 ao lado do pagamento → clica para re-tentar |
| Voltar ao dashboard | Logo Educajá no canto superior esquerdo |

---

## 🆘 Algo correu mal?

| Problema | Solução |
|---|---|
| Botão Cobrar não responde | Confirma que **caixa está aberta**. Recarrega `Ctrl+Shift+R`. |
| "Referência já usada" | Outro pagamento usou esse mesmo nº — verifica no aviso quem foi. |
| Recibo sai em formato errado | Janela imprimir → muda formato no botão A4/A5/Ticket no topo. |
| "Sessão de caixa não está aberta" | Em `/caixa`, clica **"↻ Recarregar"**. Se persistir: logout/login. |
| Aluno não aparece na pesquisa | Verifica se a matrícula está activa (`/alunos`). |
| Vendus falhou | Ícone vermelho na linha do pagamento — passa o cursor e vê o erro. Tenta re-emitir. |

Para outros casos: [Manual completo](MANUAL_UTILIZADOR.md#14-resolução-de-problemas) ou contacta o suporte.

---

## 📋 Glossário

| Termo | Significado |
|---|---|
| **POS** | Point of Sale — ecrã rápido de cobrança |
| **Caixa** | Sessão de operação financeira (abre, opera, fecha) |
| **Lote** | Grupo de pagamentos cobrados em conjunto (mesmo `lote_id`) |
| **Multa** | Acréscimo por atraso, aplicado segundo regras configuradas |
| **Bolsa** | Desconto automático no valor da propina, financiado por terceiros |
| **Estornar** | Cancelar um pagamento já confirmado (volta a pendente) |
| **Sangria** | Retirada de dinheiro da caixa (não confundir com despesa) |
| **Reforço** | Adição de dinheiro à caixa fora das cobranças |
| **FR (Vendus)** | Factura/Recibo fiscal certificado emitido no Vendus |
| **Hash** | Identificador único de assinatura digital de cada recibo |
| **QR** | Código que abre a página pública de verificação do documento |

---

## 🚀 Próximos passos

- Configura o teu perfil em **Conta** (foto, telefone).
- Lê o [Manual completo](MANUAL_UTILIZADOR.md) quando tiveres tempo.
- Personaliza permissões dos teus colegas em **Configurações → Permissões**.
- Configura **Lembretes Propinas** (`/lembretes`) para enviar avisos automáticos.

Bom trabalho! 🎓
