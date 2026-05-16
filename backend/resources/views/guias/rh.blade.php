<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Guia Rápido — Recursos Humanos</title>
<style>
  @page { size: A4 portrait; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.45; margin:0; }
  .cover { text-align:center; padding: 30mm 0 12mm; border-bottom: 4px solid #1d4ed8; }
  .cover .badge { display:inline-block; background:#1d4ed8; color:#fff; padding:4px 12px; border-radius:6px; font-size:10pt; letter-spacing:.08em; }
  .cover h1 { font-size: 28pt; margin: 8mm 0 2mm; color:#0f172a; }
  .cover p  { font-size: 11pt; color:#64748b; margin:0; }
  .meta { display:flex; justify-content:space-between; font-size:9pt; color:#94a3b8; margin-top:8mm; }
  h2 { color:#1d4ed8; font-size: 15pt; margin: 12mm 0 3mm; padding-bottom:2mm; border-bottom: 2px solid #e2e8f0; }
  h3 { color:#0f172a; font-size: 12pt; margin: 7mm 0 2mm; }
  p  { margin: 0 0 3mm; }
  ul, ol { padding-left: 6mm; margin: 0 0 4mm; }
  li { margin-bottom: 1.5mm; }
  code, .kbd { background:#f1f5f9; padding: 1px 5px; border-radius: 3px; font-family: DejaVu Sans Mono, Courier, monospace; font-size: 9.5pt; color:#0f172a; }
  .kbd { border: 1px solid #cbd5e1; box-shadow: 0 1px 0 #cbd5e1; }
  .step { display:flex; gap:6mm; margin-bottom:4mm; }
  .step .num { flex-shrink:0; width:7mm; height:7mm; border-radius:50%; background:#1d4ed8; color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; font-size:10pt; }
  .step .body { flex:1; }
  .step .body strong { display:block; margin-bottom:1mm; }
  .note { background:#eff6ff; border-left:3px solid #1d4ed8; padding: 3mm 4mm; margin: 3mm 0 5mm; border-radius: 0 4px 4px 0; font-size: 10pt; }
  .warn { background:#fef3c7; border-left:3px solid #d97706; padding: 3mm 4mm; margin: 3mm 0 5mm; border-radius: 0 4px 4px 0; font-size: 10pt; }
  .grid { width:100%; border-collapse: collapse; margin: 2mm 0 5mm; }
  .grid th, .grid td { border: 1px solid #e2e8f0; padding: 2mm 3mm; text-align:left; vertical-align: top; font-size: 10pt; }
  .grid th { background:#f8fafc; font-weight:600; color:#475569; font-size: 9pt; text-transform:uppercase; letter-spacing: .04em; }
  .estado-badge { display:inline-block; padding: 1px 7px; border-radius: 9999px; font-size: 8.5pt; font-weight:600; }
  .estado-activo    { background:#dcfce7; color:#166534; }
  .estado-suspenso  { background:#fef3c7; color:#92400e; }
  .estado-demitido  { background:#fee2e2; color:#991b1b; }
  .estado-rascunho  { background:#f1f5f9; color:#475569; }
  .estado-processada{ background:#dbeafe; color:#1e40af; }
  .estado-paga      { background:#dcfce7; color:#166534; }
  .estado-anulada   { background:#fee2e2; color:#991b1b; }
  .toc { columns: 2; column-gap: 8mm; font-size: 10pt; }
  .toc a { color:#1e293b; text-decoration:none; }
  .toc li { break-inside: avoid; }
  .footer-mini { font-size:8pt; color:#94a3b8; text-align:center; margin-top: 8mm; padding-top:3mm; border-top:1px solid #e2e8f0; }
  .pagebreak { page-break-before: always; }
</style>
</head>
<body>

<div class="cover">
  <span class="badge">RECURSOS HUMANOS</span>
  <h1>Guia Rápido</h1>
  <p>Funcionários · Presenças · Folhas de Pagamento</p>
  <div class="meta">
    <span>{{ $escola['nome'] ?? 'Educajá' }}</span>
    <span>v{{ date('Y.m.d') }}</span>
  </div>
</div>

<h2>Índice</h2>
<ul class="toc">
  <li>1. Visão geral</li>
  <li>2. Permissões e acesso</li>
  <li>3. Funcionários — criar e gerir</li>
  <li>4. Importar professor como funcionário</li>
  <li>5. Estados do funcionário</li>
  <li>6. Presenças — clock-in / clock-out</li>
  <li>7. Folha de pagamento — gerar mês</li>
  <li>8. Processar e pagar folha</li>
  <li>9. Anular folha</li>
  <li>10. Recibo de salário (PDF)</li>
  <li>11. Atalhos no menu</li>
  <li>12. Boas práticas</li>
</ul>

<div class="pagebreak"></div>

<h2>1. Visão geral</h2>
<p>O módulo <strong>Recursos Humanos</strong> centraliza a gestão do quadro de pessoal da escola: cadastro de funcionários (incluindo professores), registo de presenças e produção de folhas de pagamento mensais com recibo individual.</p>

<p>Existem 4 áreas principais, acessíveis pelo menu lateral:</p>
<table class="grid">
  <tr><th style="width:36mm">Página</th><th>O que faz</th></tr>
  <tr><td><strong>Dashboard RH</strong> <code>/rh</code></td><td>Visão geral: nº de funcionários por estado, folha do mês corrente, aniversariantes.</td></tr>
  <tr><td><strong>Funcionários</strong> <code>/rh/funcionarios</code></td><td>Lista, pesquisa, criação, edição, foto, importação a partir de professores.</td></tr>
  <tr><td><strong>Presenças</strong> <code>/rh/presencas</code></td><td>Registo manual ou clock-in/out, grelha mensal por funcionário.</td></tr>
  <tr><td><strong>Folhas Pagamento</strong> <code>/rh/folhas</code></td><td>Geração mensal, processamento, pagamento, anulação e recibo PDF.</td></tr>
</table>

<h2>2. Permissões e acesso</h2>
<p>O acesso ao módulo é controlado pela permissão <code>rh</code>. Esta permissão é atribuída por defeito a:</p>
<ul>
  <li><strong>Admin</strong> — acesso total automático.</li>
  <li><strong>Director</strong> — acesso ao módulo RH completo.</li>
</ul>
<p>Para conceder acesso a outros perfis, vá a <strong>Configurações &rarr; Permissões</strong>, seleccione o utilizador e active <code>rh</code> no grupo "Recursos Humanos".</p>

<h2>3. Funcionários — criar e gerir</h2>
<div class="step">
  <div class="num">1</div>
  <div class="body">
    <strong>Abrir a lista</strong>
    Menu &rarr; <em>RH &rarr; Funcionários</em>. Use a barra de pesquisa por nome, BI ou nº; filtre por estado, cargo ou departamento.
  </div>
</div>
<div class="step">
  <div class="num">2</div>
  <div class="body">
    <strong>Criar novo</strong>
    Botão <span class="kbd">+ Novo funcionário</span>. Preencha dados pessoais (nome, BI, NIF, contactos), profissionais (cargo, departamento, tipo de contrato, data de admissão, salário base) e bancários (IBAN, banco) se necessário.
  </div>
</div>
<div class="step">
  <div class="num">3</div>
  <div class="body">
    <strong>Adicionar foto</strong>
    Abra o detalhe do funcionário e use o botão <em>Carregar foto</em>. Aceita JPG/PNG até 5 MB.
  </div>
</div>
<div class="step">
  <div class="num">4</div>
  <div class="body">
    <strong>Editar / desactivar</strong>
    No detalhe ou na lista, edite os dados a qualquer momento. Para sair do quadro, mude o <em>Estado</em> para Suspenso, Demitido ou Reformado.
  </div>
</div>

<div class="note"><strong>Tipos de contrato</strong> disponíveis: <code>efectivo</code>, <code>temporario</code>, <code>estagiario</code>, <code>tarefeiro</code>. O tipo é informativo e não altera o cálculo da folha.</div>

<h2>4. Importar professor como funcionário</h2>
<p>Para evitar duplicação, todo o professor já cadastrado pode ser convertido em funcionário sem reescrever os dados.</p>
<ol>
  <li>Em <em>RH &rarr; Funcionários</em>, clicar em <span class="kbd">Importar professor</span>.</li>
  <li>Aparece a lista de professores que ainda <strong>não</strong> têm registo em RH.</li>
  <li>Escolher o professor, ajustar cargo (default "Professor"), departamento, tipo de contrato e salário base.</li>
  <li>Confirmar — o funcionário é criado com os mesmos dados pessoais (nome, BI, contacto, foto) do professor.</li>
</ol>

<h2>5. Estados do funcionário</h2>
<table class="grid">
  <tr><th>Estado</th><th>Significado</th><th>Entra na folha?</th></tr>
  <tr><td><span class="estado-badge estado-activo">Activo</span></td><td>Em funções normais.</td><td><strong>Sim</strong></td></tr>
  <tr><td><span class="estado-badge estado-suspenso">Suspenso</span></td><td>Temporariamente fora.</td><td>Não</td></tr>
  <tr><td><span class="estado-badge estado-demitido">Demitido</span></td><td>Cessou funções.</td><td>Não</td></tr>
  <tr><td><span class="estado-badge estado-demitido">Reformado</span></td><td>Em situação de reforma.</td><td>Não</td></tr>
</table>

<div class="pagebreak"></div>

<h2>6. Presenças — clock-in / clock-out</h2>
<p>O registo de presenças alimenta a grelha mensal e pode (futuramente) descontar faltas na folha.</p>

<h3>Registo rápido</h3>
<div class="step">
  <div class="num">1</div>
  <div class="body">Em <em>RH &rarr; Presenças</em>, escolher o funcionário.</div>
</div>
<div class="step">
  <div class="num">2</div>
  <div class="body">Botão <span class="kbd">Clock-in</span> à entrada e <span class="kbd">Clock-out</span> à saída. A hora é capturada automaticamente.</div>
</div>

<h3>Registo manual / correcção</h3>
<p>Use a tabela mensal para criar/editar registos directamente: data, hora de entrada, hora de saída e observação.</p>

<h3>Grelha mensal</h3>
<p>Mostra todos os funcionários activos numa só vista por mês: presença diária, total de horas e faltas. Útil para auditoria e fecho do mês.</p>

<h2>7. Folha de pagamento — gerar mês</h2>
<div class="step">
  <div class="num">1</div>
  <div class="body">
    Em <em>RH &rarr; Folhas Pagamento</em>, clicar em <span class="kbd">+ Gerar mês</span>.
  </div>
</div>
<div class="step">
  <div class="num">2</div>
  <div class="body">
    Escolher <strong>mês</strong> e <strong>ano</strong> e confirmar. O sistema cria <em>uma folha por funcionário activo</em> com:
    <ul>
      <li>Salário base copiado do cadastro</li>
      <li>Subsídios e descontos a 0 (a editar manualmente)</li>
      <li>Estado <span class="estado-badge estado-rascunho">Rascunho</span></li>
    </ul>
  </div>
</div>

<div class="warn"><strong>Importante:</strong> só são geradas folhas para funcionários no estado <em>Activo</em>. Funcionários adicionados depois da geração não aparecem — gere de novo (existentes não são duplicadas) ou crie a folha manualmente.</div>

<h3>Edição da folha (rascunho)</h3>
<p>Abra o detalhe da folha para ajustar:</p>
<ul>
  <li><strong>Subsídios</strong> (transporte, alimentação, etc.)</li>
  <li><strong>Descontos</strong> (segurança social, IRT, faltas, adiantamentos)</li>
  <li><strong>Observação</strong></li>
</ul>
<p>O <strong>líquido a pagar</strong> é calculado automaticamente: <code>base + subsídios − descontos</code>.</p>

<h2>8. Processar e pagar folha</h2>
<table class="grid">
  <tr><th>Estado</th><th>Acção</th><th>Resultado</th></tr>
  <tr><td><span class="estado-badge estado-rascunho">Rascunho</span></td><td>Botão <strong>Processar</strong></td><td>Folha fica fixa. Já não pode ser editada sem anular.</td></tr>
  <tr><td><span class="estado-badge estado-processada">Processada</span></td><td>Botão <strong>Pagar</strong></td><td>Marca como paga, regista data e método. Recibo fica disponível.</td></tr>
</table>

<h3>Pagar</h3>
<p>Ao clicar <span class="kbd">Pagar</span> indique:</p>
<ul>
  <li><strong>Data de pagamento</strong> (default: hoje)</li>
  <li><strong>Método</strong>: dinheiro / transferência / multicaixa</li>
</ul>

<h2>9. Anular folha</h2>
<p>Folhas <em>Processadas</em> ou <em>Pagas</em> podem ser anuladas se houver erro. Acção irreversível: a folha fica marcada como <span class="estado-badge estado-anulada">Anulada</span> e deixa de contar nos totais. Crie nova folha para o funcionário com os valores correctos.</p>

<h2>10. Recibo de salário (PDF)</h2>
<p>Para qualquer folha em estado <em>Processada</em> ou <em>Paga</em>:</p>
<ol>
  <li>Abra o detalhe da folha</li>
  <li>Clique em <span class="kbd">Recibo PDF</span></li>
  <li>O PDF abre em nova aba (e pode ser descarregado/impresso)</li>
</ol>
<p>O recibo inclui: dados da escola, funcionário, mês de referência, base, subsídios, descontos, líquido e assinaturas.</p>

<h2>11. Atalhos no menu</h2>
<table class="grid">
  <tr><th>Atalho do URL</th><th>Página</th></tr>
  <tr><td><code>/rh</code></td><td>Dashboard RH</td></tr>
  <tr><td><code>/rh/funcionarios</code></td><td>Lista de funcionários</td></tr>
  <tr><td><code>/rh/funcionarios/:id</code></td><td>Detalhe do funcionário</td></tr>
  <tr><td><code>/rh/presencas</code></td><td>Presenças (grelha + registo)</td></tr>
  <tr><td><code>/rh/folhas</code></td><td>Folhas de pagamento</td></tr>
  <tr><td><code>/rh/folhas/:id</code></td><td>Detalhe da folha</td></tr>
</table>

<h2>12. Boas práticas</h2>
<ul>
  <li><strong>Mantenha o salário base actualizado</strong> no cadastro — é a base de cálculo da folha.</li>
  <li><strong>Gere a folha do mês uma única vez</strong>, no início do período de processamento. Edite cada folha individual conforme necessário.</li>
  <li><strong>Processe</strong> as folhas só quando estiverem fechadas — depois disso só anulando se houver erro.</li>
  <li>Para professores, use sempre <em>Importar professor</em>. Evita duplicação de dados pessoais.</li>
  <li><strong>Faça revisão antes de pagar</strong> — o estado <em>Paga</em> regista o método e a data; usar para conciliação com a tesouraria/banco.</li>
</ul>

<div class="footer-mini">
  Educajá — Sistema de Gestão Escolar &nbsp;·&nbsp; Guia Rápido RH &nbsp;·&nbsp; Gerado em {{ now()->format('d/m/Y H:i') }}
</div>

</body>
</html>
