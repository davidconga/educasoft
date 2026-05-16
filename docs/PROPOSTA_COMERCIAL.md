# Proposta Comercial — Plataforma Educajá

**Para:** {{NOME_ESCOLA}}
**A/C:** {{NOME_RESPONSAVEL}} ({{CARGO_RESPONSAVEL}})
**Localização:** {{LOCALIDADE_ESCOLA}}
**Data:** {{DATA}}
**Validade da proposta:** 30 dias a contar da data de emissão
**Nº de referência:** {{NUMERO_PROPOSTA}}

---

## 1. Quem somos

A **Educajá** é uma plataforma angolana de gestão escolar SaaS (*Software as a Service*) que centraliza, num único sistema acessível pela web e por aplicação móvel, toda a operação académica, administrativa e financeira de uma instituição de ensino.

Desenvolvida especificamente para a realidade angolana, está em conformidade com a legislação fiscal vigente, integra-se com os principais meios de pagamento locais (Multicaixa Express, referências bancárias) e suporta processos próprios do sistema de ensino nacional.

> **Site:** [educaja.ao](https://educaja.ao)
> **Contacto:** contact@educaja.ao
> **Localização:** Benguela, Angola

---

## 2. Porquê a Educajá

Substitui ficheiros Excel, cadernos manuais e sistemas dispersos por uma **única plataforma integrada**, segura e acessível 24/7. Permite à direcção da escola:

- **Tomar decisões com dados em tempo real** — dashboards de matrículas, propinas em atraso, presenças, desempenho académico
- **Profissionalizar a tesouraria** — emissão automática de recibos certificados pela AGT, controlo de propinas e emolumentos, conciliação de pagamentos
- **Reduzir a carga administrativa** — fim do trabalho duplicado entre secretaria, tesouraria e direcção pedagógica
- **Reforçar a relação com encarregados** — portal e app móvel para consulta de notas, faltas, comunicados e propinas
- **Cumprir obrigações fiscais** — facturas-recibo assinadas digitalmente, exportação SAFT-AO sempre disponível

---

## 3. Funcionalidades principais

### 3.1 Gestão Académica

- Cadastro de alunos com fotografia, dados pessoais, encarregados, endereço, NIF e histórico
- Estruturação por anos lectivos, classes, turmas, turnos e disciplinas
- Cadastro de professores com qualificações, disciplinas leccionadas e horário
- **Lançamento de notas** por trimestre/semestre com cálculo automático de médias e classificações
- **Boletins escolares** em PDF, com layout configurável e assinatura digital da direcção
- **Controlo de presenças** por aula, turma ou aluno — com gráficos de assiduidade
- Histórico académico completo e exportável

### 3.2 Gestão Financeira (Tesouraria)

- Cadastro de **emolumentos e taxas** (matrícula, propinas, transporte, refeitório, etc.) com preçário por classe e período
- Emissão automática de propinas mensais por aluno
- **Caixa diário** com abertura/fecho, sangrias, depósitos e relatório de movimentos
- **POS integrado** para cobrança ao balcão
- **Carteira do aluno** — histórico financeiro completo, dívidas, abates, descontos
- **Bolsas e isenções** — geridas por aluno com regras configuráveis (% ou valor fixo)
- **Pagamentos online** via referência Multicaixa (integração com gateways locais)
- **Recibos certificados pela AGT** com assinatura digital RSA (ver secção 6)
- Relatórios financeiros: diário, mensal, anual; por aluno, classe ou emolumento

### 3.3 Recursos Humanos

- Cadastro de funcionários (docentes e não-docentes), categoria profissional, contratos
- **Folha salarial mensal** com subsídios, descontos (IRT, INSS), e gerador de recibos de vencimento
- Histórico de processamentos e contracheques em PDF

### 3.4 Portal e App do Encarregado de Educação

- Acesso individual (com login próprio) para encarregados consultarem:
  - **Notas** e boletins do(s) seu(s) educandos
  - **Faltas e presenças**
  - **Propinas pagas e em atraso**, com botão de pagamento
  - **Comunicados oficiais** da escola
  - **Eventos** e calendário
- Notificações automáticas por email e SMS (lembretes de pagamento, atrasos, eventos)
- App móvel Android disponível para download

### 3.5 Comunicação

- Comunicados internos para professores, alunos ou encarregados
- Envio automatizado de **lembretes de pagamento** por email/SMS
- WhatsApp (integração opcional com gateway próprio)
- Chat de suporte com a equipa Educajá dentro da plataforma

### 3.6 Aulas Remotas e Materiais

- Carregamento de materiais por disciplina (PDF, vídeo, links)
- Marcação de aulas remotas
- Acesso por alunos e encarregados via portal

### 3.7 Provas e Avaliações com QR-code

- Geração de folhas de prova com QR único por aluno
- Verificação de autenticidade do documento pela leitura do código

### 3.8 Relatórios

- **Relatório diário** de tesouraria
- **Relatório financeiro** mensal/anual por emolumento, classe, turma
- Relatório académico (médias, aprovados/reprovados, top alunos)
- Relatório de assiduidade
- Todos exportáveis em PDF

### 3.9 Multi-utilizador com permissões granulares

- Perfis: Administrador, Tesouraria, Secretaria, Director Pedagógico, Professor, Encarregado, Aluno
- **Gestão de permissões por função** (ex: tesouraria não vê notas; secretaria não emite recibos)

### 3.10 Segurança e dados

- Cada escola tem **base de dados isolada** (modelo *database-per-tenant*) — os dados de uma escola nunca são acessíveis por outra
- **Cópias de segurança diárias** automáticas
- Comunicação cifrada (HTTPS/TLS)
- Conformidade com a Lei n.º 22/11 (Protecção de Dados Pessoais)

---

## 4. Planos e Preços

Os preços abaixo são os actualmente em vigor. Todos os valores em Kwanzas (AOA) e **incluem IVA** à taxa legal de 14%.

| Plano | Mensal (AOA) | Anual (AOA) | Poupança anual | Alunos | Administradores |
|---|---:|---:|---:|:---:|:---:|
| **Básico** | Gratuito | Gratuito | — | até 100 | 1 |
| **Standard** | 15.000 | 162.000 | 18.000 (10%) | até 500 | 5 |
| **Premium** | 35.000 | 378.000 | 42.000 (10%) | ilimitado | ilimitado |

### 4.1 O que cada plano inclui

**Básico — Gratuito** (ideal para escolas a iniciar)
- Gestão de alunos, turmas e disciplinas
- Lançamento de notas e geração de boletins
- Controlo de presenças
- 1 administrador

**Standard — 15.000 Kz/mês** (escolas em crescimento — *plano mais escolhido*)
- Tudo do plano Básico
- Aulas remotas e materiais
- **Tesouraria** (propinas, emolumentos, recibos certificados)
- **Bolsas e isenções**
- **Lembretes automáticos** por email e SMS
- Provas com QR-code
- **Relatórios avançados**
- Até 5 administradores

**Premium — 35.000 Kz/mês** (solução completa para grandes instituições)
- Tudo do plano Standard
- **Alunos ilimitados**
- **Multi-turno** e multi-turma
- **API e integrações** com outros sistemas
- **Suporte prioritário 24/7**
- Administradores ilimitados

### 4.2 Proposta para {{NOME_ESCOLA}}

Considerando a dimensão de {{NUMERO_ALUNOS}} alunos e o perfil operacional descrito, recomendamos o plano **{{PLANO_RECOMENDADO}}**:

- **Mensalidade:** {{VALOR_MENSAL}} Kz
- **Anuidade (com 10% desconto):** {{VALOR_ANUAL}} Kz
- **Forma de pagamento:** referência Multicaixa, transferência bancária ou depósito

> **Condições especiais negociáveis:** períodos de teste estendidos, descontos para pagamento adiantado de 6 ou 12 meses, e pacotes plurianuais. Consultar a equipa comercial.

---

## 5. Implementação e Suporte

### 5.1 Cronograma de implementação

| Fase | Duração | O que acontece |
|---|:---:|---|
| **1. Adesão** | 1 dia | Cadastro online em [educaja.ao](https://educaja.ao), escolha de plano, criação do espaço da escola |
| **2. Configuração inicial** | 1–3 dias | Configuração da identidade visual, anos lectivos, classes, emolumentos, perfis de utilizadores |
| **3. Importação de dados** | 3–7 dias | Importação de alunos, encarregados, professores a partir de Excel/CSV (apoiada pela equipa Educajá) |
| **4. Formação** | 1–2 dias | Sessões com administradores, tesouraria, secretaria e professores |
| **5. Acompanhamento** | 30 dias | Suporte intensivo durante o primeiro mês para resolver dúvidas e ajustar parâmetros |

**Tempo total típico até estar em produção: 1 a 2 semanas.**

### 5.2 Migração de dados

A equipa Educajá apoia a migração a partir de:
- Ficheiros Excel/CSV existentes da escola
- Outros sistemas de gestão escolar
- Bases de dados próprias (mediante análise técnica)

A migração inicial está incluída em todos os planos pagos, sem custo adicional, para um volume razoável de dados (até 1000 alunos / 100 funcionários). Volumes superiores são analisados caso a caso.

### 5.3 Formação

- **Sessões presenciais** (Benguela e arredores) ou **remotas** (todo o país) — incluídas nos planos Standard e Premium
- **Material didáctico** — guias rápidos e manual completo do utilizador em PDF
- **Vídeos** explicativos passo-a-passo
- **Chat de suporte** dentro da plataforma — resposta directa da equipa Educajá

### 5.4 Suporte

| Plano | Canais | Horário | Tempo de resposta |
|---|---|---|---|
| Básico | Email, chat | Dias úteis 8h–17h | 48h úteis |
| Standard | Email, chat, telefone | Dias úteis 8h–18h | 24h úteis |
| Premium | Email, chat, telefone, WhatsApp directo | **24/7** | 4h |

### 5.5 Actualizações

Todas as actualizações de funcionalidades, correcções e melhorias de segurança são **gratuitas e automáticas**, durante a vigência da subscrição.

---

## 6. Conformidade Fiscal — Certificação AGT

A Educajá emite documentos fiscais (facturas-recibo) ao abrigo do **Decreto Presidencial n.º 74/17**, com:

- **Assinatura digital RSA-SHA1** de cada documento, com par de chaves dedicado da Educajá
- **Hash visível** impresso no recibo para validação por terceiros
- **Chave pública** publicada para verificação independente
- **Numeração sequencial inviolável** por série e ano fiscal
- **Geração de ficheiro SAFT-AO** (XML standard exigido pela AGT) sempre disponível para descarregar pela escola

A escola compromete-se a manter os documentos fiscais inalterados e a entregar à AGT os ficheiros SAFT-AO sempre que solicitado. A Educajá não modifica nem permite a modificação de documentos fiscais após emissão.

**Documentação técnica AGT** (memorando técnico, requerimento, chave pública, exemplo SAFT certificado) disponível mediante pedido para auditoria do Cliente.

---

## 7. Propriedade dos Dados

- Os dados introduzidos pela escola (alunos, notas, pagamentos, etc.) são **propriedade exclusiva da escola**
- A escola pode **exportar todos os dados a qualquer momento**, em formatos abertos (CSV, JSON, SAFT-AO)
- Após cancelamento, dispõe de **90 dias** para descarregar os dados antes da eliminação definitiva
- A Educajá actua como **Subcontratante** ao abrigo da Lei n.º 22/11; o Responsável pelo Tratamento é a escola

---

## 8. Próximos passos

1. **Análise** desta proposta pela direcção de {{NOME_ESCOLA}}
2. **Reunião de apresentação** (presencial ou remota) com demonstração ao vivo da plataforma — sem custo
3. **Período de teste** de 14 dias com dados reais da escola (mediante carta de intenção)
4. **Assinatura do contrato** e activação imediata
5. **Implementação** segundo o cronograma da secção 5

---

## 9. Contactos

**Equipa Comercial Educajá**
Email: contact@educaja.ao
Site: [educaja.ao](https://educaja.ao)
Localização: Benguela, Angola

Comercial responsável por esta proposta:
**{{NOME_COMERCIAL}}**
{{TELEFONE_COMERCIAL}} · {{EMAIL_COMERCIAL}}

---

*Esta proposta foi elaborada com base nas informações partilhadas por {{NOME_ESCOLA}}. Os preços e funcionalidades indicados são os actualmente em vigor e podem ser revistos no início de cada ciclo de facturação. Para qualquer dúvida ou ajuste, contacte a equipa comercial.*

---

**Educajá** · Plataforma de Gestão Escolar · Benguela, Angola · {{ANO}}
