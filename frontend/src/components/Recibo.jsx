/**
 * imprimirRecibo(pagamento|pagamentos[], escola)
 * imprimirComprovativoMatricula(matricula|matriculas[], escola)
 *
 * Abre janela com selector de formato: A4 · A5 · Ticket
 * Cada impresso tem duas cópias: Aluno + Escola
 */

export function buildReciboHtml(pagamento, escola, carteira = null) {
  const lista = Array.isArray(pagamento) ? pagamento : [pagamento];
  const title = lista.length === 1 ? "Factura-Recibo" : "Recibo de Cobranças";
  const body  = lista.length === 1 ? buildSingle(lista[0], escola, carteira) : buildConsolidado(lista, escola, carteira);
  return buildFormatWrapper(title, body);
}

function openHtml(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank", "width=960,height=800");
  if (win) win.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
}

export function imprimirRecibo(pagamento, escola, carteira = null) {
  openHtml(buildReciboHtml(pagamento, escola, carteira));
}

/* Bloco da carteira (aluno) — usado no recibo individual e consolidado. */
function buildCarteiraBlock(c) {
  if (!c) return "";
  const fmtV = (v) => Number(v || 0).toLocaleString("pt-AO");
  const saldo = (c.saldo ?? (Number(c.total_pago||0) - Number(c.total_pendente||0)));
  const saldoCls = saldo >= 0 ? "color:#16a34a" : "color:#dc2626";
  return `
<div class="sec-title">Saldo da Carteira</div>
<div class="aluno-box" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:14px">
  <div style="text-align:center">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Total Pago</div>
    <div style="font-weight:700;color:#16a34a;font-size:13px;margin-top:2px">${fmtV(c.total_pago)} Kz</div>
  </div>
  <div style="text-align:center;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Pendente</div>
    <div style="font-weight:700;color:#d97706;font-size:13px;margin-top:2px">${fmtV(c.total_pendente)} Kz</div>
  </div>
  <div style="text-align:center">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Saldo</div>
    <div style="font-weight:700;font-size:13px;margin-top:2px;${saldoCls}">${fmtV(saldo)} Kz</div>
  </div>
</div>`;
}

export function imprimirComprovativoMatricula(matricula, escola) {
  const lista = Array.isArray(matricula) ? matricula : [matricula];
  const title = lista.length === 1 ? "Comprovativo de Matrícula" : "Lista de Matrículas";
  const body  = lista.length === 1 ? buildComprovativoSingle(lista[0], escola) : buildComprovativoConsolidado(lista, escola);
  openHtml(buildFormatWrapper(title, body));
}

/* ─── janela de impressão com selector de formato ─────────────── */

function buildFormatWrapper(title, receiptHtml) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
/* ── base ── */
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1e293b;background:#e2e8f0;}

/* ── toolbar ── */
.toolbar{
  position:sticky;top:0;z-index:999;
  display:flex;align-items:center;justify-content:space-between;
  background:#1e293b;padding:10px 20px;gap:12px;
}
.fmt-group{display:flex;gap:6px;align-items:center;}
.fmt-label{color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;}
.fmt-btn{
  padding:5px 14px;border-radius:8px;border:1.5px solid #475569;
  background:transparent;color:#cbd5e1;font-size:12px;font-weight:600;cursor:pointer;transition:.15s;
}
.fmt-btn.active{background:#3b82f6;border-color:#3b82f6;color:#fff;}
.print-btn{
  padding:7px 20px;border-radius:8px;border:none;
  background:#22c55e;color:#fff;font-size:13px;font-weight:700;cursor:pointer;
}

/* ── page container ── */
#wrap{padding:16px;display:flex;justify-content:center;}

/* ─────── DOC CARD (A4 / A5) ─────── */
.doc{
  width:100%;background:#fff;
  border-radius:10px;overflow:hidden;
  box-shadow:0 2px 16px rgba(0,0,0,.10);
  margin-bottom:8px;
}
.header{
  display:flex;align-items:center;gap:16px;
  padding:24px 28px 20px;
  background:linear-gradient(135deg,#1d4ed8 0%,#4f46e5 100%);
  color:#fff;
}
.logo-box{
  width:50px;height:50px;border-radius:12px;
  background:rgba(255,255,255,.2);
  display:flex;align-items:center;justify-content:center;
  font-size:20px;font-weight:800;flex-shrink:0;
}
.escola-info{flex:1;}
.escola-nome{font-size:17px;font-weight:700;}
.escola-sub{font-size:11px;opacity:.7;margin-top:2px;}
.doc-type{text-align:right;}
.doc-label{font-size:14px;font-weight:700;letter-spacing:.04em;}
.doc-ref{font-size:11px;opacity:.8;margin-top:3px;font-family:monospace;}

.meta-row{display:flex;padding:14px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0;}
.meta-item{flex:1;border-right:1px solid #e2e8f0;padding:0 16px 0 0;margin-right:16px;}
.meta-item:last-child{border-right:none;margin-right:0;}
.meta-label{display:block;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}
.meta-value{display:block;font-size:12px;font-weight:600;color:#1e293b;margin-top:2px;}
.status-pago{color:#16a34a;}
.status-pend{color:#d97706;}

.sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;padding:16px 28px 6px;}
.aluno-box{padding:0 28px 12px;}
.aluno-row{display:flex;padding:5px 0;border-bottom:1px dashed #f1f5f9;}
.aluno-row:last-child{border-bottom:none;}
.aluno-label{width:150px;color:#64748b;font-size:12px;}
.aluno-value{font-weight:600;color:#1e293b;font-size:12px;}

.items-table{width:calc(100% - 56px);margin:0 28px 20px;border-collapse:collapse;}
.items-table th{background:#1d4ed8;color:#fff;padding:9px 12px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
.th-first{border-radius:7px 0 0 0;}.th-last{border-radius:0 7px 0 0;text-align:right;}
.items-table td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top;}
.items-table tbody tr:last-child td{border-bottom:none;}
.td-mono{color:#64748b;font-family:monospace;font-size:10px;}
.td-right{text-align:right;font-weight:600;}
.items-table tfoot td{border-top:2px solid #e2e8f0;padding-top:12px;border-bottom:none;}
.tf-label{text-align:right;font-weight:700;font-size:12px;color:#334155;}
.tf-valor{text-align:right;font-size:16px;font-weight:800;color:#1d4ed8;}

.assinaturas{display:flex;gap:40px;padding:6px 28px 28px;}
.ass-bloco{flex:1;}
.ass-linha{height:1px;background:#94a3b8;margin-bottom:6px;margin-top:36px;}
.ass-label{font-size:10px;color:#64748b;text-align:center;}

.rodape{text-align:center;font-size:10px;color:#94a3b8;padding:10px 28px 16px;border-top:1px solid #f1f5f9;}

/* badge */
.badge-pago{display:inline-block;padding:2px 8px;border-radius:9999px;background:#dcfce7;color:#166534;font-size:10px;font-weight:600;}
.badge-pend{display:inline-block;padding:2px 8px;border-radius:9999px;background:#fef3c7;color:#92400e;font-size:10px;font-weight:600;}

/* ─────── TICKET ─────── */
.ticket{
  width:72mm;background:#fff;
  border:1px dashed #aaa;
  font-family:'Courier New',Courier,monospace;
  font-size:11px;color:#000;
  padding:6mm 4mm;
  margin-bottom:6px;
  display:none;
}
.tk-center{text-align:center;}
.tk-bold{font-weight:700;}
.tk-sep{border:none;border-top:1px dashed #999;margin:4px 0;}
.tk-row{display:flex;justify-content:space-between;padding:2px 0;}
.tk-label{color:#555;}
.tk-total{display:flex;justify-content:space-between;font-size:13px;font-weight:700;padding:4px 0;border-top:1px solid #000;margin-top:4px;}
.tk-sig{margin-top:8mm;border-top:1px solid #999;font-size:9px;color:#555;text-align:center;padding-top:2px;}

/* ─────── print ─────── */
@media print{
  .toolbar{display:none;}
  body{background:#fff;}
  .doc{box-shadow:none;border-radius:0;margin:0;}
}
</style>
<style id="dyn"></style>
</head>
<body>

<!-- Toolbar -->
<div class="toolbar no-print">
  <div class="fmt-group">
    <span class="fmt-label">Formato:</span>
    <button id="btn-a4"     class="fmt-btn" onclick="setFmt('a4')">A4</button>
    <button id="btn-a5"     class="fmt-btn" onclick="setFmt('a5')">A5</button>
    <button id="btn-ticket" class="fmt-btn active" onclick="setFmt('ticket')">Ticket</button>
  </div>
  <button class="print-btn" onclick="window.print()">&#128438; Imprimir</button>
</div>

<div id="wrap">
  <div id="inner">
    <div class="doc-copy">${receiptHtml}</div>
  </div>
</div>

<script>
var FMT = {
  a4: {
    pageSize: 'A4 portrait',
    wrapW: '210mm',
    innerDir: 'column',
    docDisplay: 'block',
    ticketDisplay: 'none',
    docScale: 1,
  },
  a5: {
    pageSize: 'A5 portrait',
    wrapW: '148mm',
    innerDir: 'column',
    docDisplay: 'block',
    ticketDisplay: 'none',
    docScale: 0.88,
  },
  ticket: {
    pageSize: '80mm auto',
    wrapW: '80mm',
    innerDir: 'column',
    docDisplay: 'none',
    ticketDisplay: 'block',
    docScale: 1,
  },
};

function setFmt(f) {
  var c = FMT[f] || FMT.a4;
  document.getElementById('dyn').textContent =
    '@page{size:' + c.pageSize + ';margin:6mm;}' +
    '#wrap{padding:' + (f==='ticket'?'8px':'16px') + ';justify-content:center;}' +
    '#inner{width:' + c.wrapW + ';display:flex;flex-direction:' + c.innerDir + ';}' +
    '.doc{display:' + c.docDisplay + ';transform:scale(' + c.docScale + ');transform-origin:top left;width:' + (c.docScale < 1 ? (100/c.docScale)+'%' : '100%') + ';}' +
    '.ticket{display:' + c.ticketDisplay + ';}' +
    '@media print{.doc{transform:none;width:100%;}}';

  ['a4','a5','ticket'].forEach(function(k){
    document.getElementById('btn-'+k).classList.toggle('active', k===f);
  });
}

setFmt('ticket');
</script>
</body>
</html>`;
}

/* ─── helpers ─────────────────────────────────────────────────── */

function fmt(v) { return Number(v || 0).toLocaleString("pt-AO") + " Kz"; }
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-AO", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function tipoLabel(t) {
  return { mensalidade:"Mensalidade", matricula:"Matrícula", emolumento:"Emolumento", outro:"Outro" }[t] || t;
}
function metodoPag(m) {
  return { dinheiro:"Dinheiro", transferencia:"Transferência Bancária", multicaixa:"Multicaixa" }[m] || m || "—";
}
const hoje = new Date().toLocaleDateString("pt-AO");

function buildLogo(escola, nome) {
  if (escola?.logo) {
    const abs = window.location.origin + "/storage/" + escola.logo;
    return `<img src="${abs}" style="width:50px;height:50px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,.15);flex-shrink:0;"
      onerror="this.outerHTML='<div class=\\'logo-box\\'>${(nome||"E")[0].toUpperCase()}</div>'" />`;
  }
  return `<div class="logo-box">${(nome || "E")[0].toUpperCase()}</div>`;
}

/* ─── ticket compacto ─────────────────────────────────────────── */

function buildTicketSingle(p, escola) {
  const escolaNome = escola?.nome || "Educajá";
  const logoImg    = escola?.logo
    ? `<img src="${window.location.origin}/storage/${escola.logo}" style="height:30px;object-fit:contain;" onerror="this.style.display='none'"/><br/>`
    : "";
  const aluno    = p.aluno?.user?.nome || "—";
  const numAluno = p.aluno?.numero_aluno || "";
  const descricao = tipoLabel(p.tipo) + (p.mes_referencia ? ` ${p.mes_referencia}` : "");
  return `
<div class="ticket">
  <div class="tk-center">${logoImg}<div class="tk-bold">${escolaNome}</div><div style="font-size:9px;">Sistema de Gestão Escolar</div></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:12px;">FACTURA-RECIBO</div>
  <div class="tk-center" style="font-size:9px;color:#555;">Nº ${p.referencia || "—"}</div>
  <hr class="tk-sep"/>
  <div class="tk-row"><span class="tk-label">Aluno:</span><span>${aluno}</span></div>
  ${numAluno ? `<div class="tk-row"><span class="tk-label">Nº:</span><span>${numAluno}</span></div>` : ""}
  <div class="tk-row"><span class="tk-label">Turma:</span><span>${p.aluno?.matriculas?.[0]?.turma?.nome || "—"}</span></div>
  <hr class="tk-sep"/>
  <div class="tk-row"><span class="tk-label">Descrição:</span><span>${descricao}</span></div>
  <div class="tk-row"><span class="tk-label">Método:</span><span>${metodoPag(p.metodo)}</span></div>
  <div class="tk-row"><span class="tk-label">Data Pag.:</span><span>${fmtDate(p.data_pagamento)}</span></div>
  <div class="tk-row"><span class="tk-label">Emissão:</span><span>${hoje}</span></div>
  <hr class="tk-sep"/>
  <div class="tk-total"><span>TOTAL</span><span>${fmt(p.valor)}</span></div>
  <div class="tk-sig">Tesoureiro(a)</div>
  <div class="tk-sig">Encarregado / Aluno</div>
</div>`;
}

function buildTicketConsolidado(pagamentos, escola) {
  const escolaNome = escola?.nome || "Educajá";
  const logoImg    = escola?.logo
    ? `<img src="${window.location.origin}/storage/${escola.logo}" style="height:30px;object-fit:contain;" onerror="this.style.display='none'"/><br/>`
    : "";
  const total = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const linhas = pagamentos.map(p =>
    `<div class="tk-row"><span>${tipoLabel(p.tipo)}${p.mes_referencia?" "+p.mes_referencia:""}</span><span>${fmt(p.valor)}</span></div>`
  ).join("");
  return `
<div class="ticket">
  <div class="tk-center">${logoImg}<div class="tk-bold">${escolaNome}</div></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold">RECIBO DE COBRANÇAS</div>
  <div class="tk-center" style="font-size:9px;color:#555;">${pagamentos.length} pagamento(s) · ${hoje}</div>
  <hr class="tk-sep"/>
  ${linhas}
  <hr class="tk-sep"/>
  <div class="tk-total"><span>TOTAL</span><span>${fmt(total)}</span></div>
  <div class="tk-sig">Tesoureiro(a)</div>
  <div class="tk-sig">Encarregado / Aluno</div>
</div>`;
}

function buildTicketMatricula(m, escola) {
  const escolaNome = escola?.nome || "Educajá";
  const logoImg    = escola?.logo
    ? `<img src="${window.location.origin}/storage/${escola.logo}" style="height:30px;object-fit:contain;" onerror="this.style.display='none'"/><br/>`
    : "";
  return `
<div class="ticket">
  <div class="tk-center">${logoImg}<div class="tk-bold">${escolaNome}</div></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold">COMPROVATIVO DE MATRÍCULA</div>
  <hr class="tk-sep"/>
  <div class="tk-row"><span class="tk-label">Aluno:</span><span>${m.aluno?.user?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Nº:</span><span>${m.aluno?.numero_aluno || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Turma:</span><span>${m.turma?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Curso:</span><span>${m.turma?.classe?.curso?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Ano Lect.:</span><span>${m.ano_letivo || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Estado:</span><span>${m.status || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Data:</span><span>${fmtDate(m.data_matricula)}</span></div>
  <hr class="tk-sep"/>
  <div class="tk-center" style="font-size:9px;color:#555;">Emitido em ${hoje}</div>
  <div class="tk-sig">Director(a) / Secretaria</div>
  <div class="tk-sig">Encarregado / Aluno</div>
</div>`;
}

/* ─── recibo full card ────────────────────────────────────────── */

function buildSingle(p, escola, carteira = null) {
  const escolaNome = escola?.nome || "Educajá";
  const aluno      = p.aluno?.user?.nome || "—";
  const numAluno   = p.aluno?.numero_aluno || "";
  const turma      = p.aluno?.matriculas?.[0]?.turma?.nome || "—";
  const descricao  = tipoLabel(p.tipo) + (p.mes_referencia ? ` — ${p.mes_referencia}` : "");

  return `
${buildTicketSingle(p, escola)}
<div class="doc">
  <div class="header">
    ${buildLogo(escola, escolaNome)}
    <div class="escola-info">
      <div class="escola-nome">${escolaNome}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </div>
    <div class="doc-type">
      <div class="doc-label">FACTURA-RECIBO</div>
      <div class="doc-ref">Nº ${p.referencia || "—"}</div>
    </div>
  </div>
  <div class="meta-row">
    <div class="meta-item"><span class="meta-label">Emissão</span><span class="meta-value">${hoje}</span></div>
    <div class="meta-item"><span class="meta-label">Data Pagamento</span><span class="meta-value">${fmtDate(p.data_pagamento)}</span></div>
    <div class="meta-item"><span class="meta-label">Método</span><span class="meta-value">${metodoPag(p.metodo)}</span></div>
    <div class="meta-item"><span class="meta-label">Estado</span><span class="meta-value status-pago">PAGO</span></div>
  </div>
  <div class="sec-title">Dados do Aluno</div>
  <div class="aluno-box">
    <div class="aluno-row"><span class="aluno-label">Nome completo</span><span class="aluno-value">${aluno}</span></div>
    ${numAluno ? `<div class="aluno-row"><span class="aluno-label">Nº de Aluno</span><span class="aluno-value">${numAluno}</span></div>` : ""}
    <div class="aluno-row"><span class="aluno-label">Turma</span><span class="aluno-value">${turma}</span></div>
  </div>
  <div class="sec-title">Descrição do Pagamento</div>
  <table class="items-table">
    <thead><tr>
      <th class="th-first">Descrição</th>
      <th style="width:150px">Referência</th>
      <th class="th-last" style="width:120px">Valor</th>
    </tr></thead>
    <tbody><tr>
      <td>${descricao}</td>
      <td class="td-mono">${p.referencia || "—"}</td>
      <td class="td-right">${fmt(p.valor)}</td>
    </tr></tbody>
    <tfoot><tr>
      <td colspan="2" class="tf-label">TOTAL</td>
      <td class="tf-valor">${fmt(p.valor)}</td>
    </tr></tfoot>
  </table>
  ${buildCarteiraBlock(carteira)}
  <div class="assinaturas">
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Tesoureiro(a)</div></div>
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Encarregado de Educação / Aluno</div></div>
  </div>
  <div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; ${hoje}</div>
</div>`;
}

function buildConsolidado(pagamentos, escola, carteira = null) {
  const escolaNome = escola?.nome || "Educajá";
  const total      = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
  const alunoIds   = [...new Set(pagamentos.map(p => p.aluno?.id).filter(Boolean))];
  const mesmAluno  = alunoIds.length === 1;
  const primeiro   = pagamentos[0]?.aluno;
  const metodos    = [...new Set(pagamentos.map(p => p.metodo).filter(Boolean))];
  const metodoStr  = metodos.length === 1 ? metodoPag(metodos[0]) : "Vários";
  const datas      = pagamentos.map(p => p.data_pagamento).filter(Boolean).sort();
  const dataStr    = datas.length ? fmtDate(datas[datas.length - 1]) : hoje;

  const linhas = pagamentos.map(p => `
    <tr>
      ${!mesmAluno ? `<td>${p.aluno?.user?.nome || "—"}</td>` : ""}
      <td>${tipoLabel(p.tipo)}${p.mes_referencia ? ` — ${p.mes_referencia}` : ""}</td>
      <td class="td-mono">${p.referencia || "—"}</td>
      <td>${metodoPag(p.metodo)}</td>
      <td class="td-right">${fmt(p.valor)}</td>
    </tr>`).join("");

  const colspan = mesmAluno ? 4 : 5;
  const alunoBlock = mesmAluno ? `
    <div class="sec-title">Dados do Aluno</div>
    <div class="aluno-box">
      <div class="aluno-row"><span class="aluno-label">Nome completo</span><span class="aluno-value">${primeiro?.user?.nome || "—"}</span></div>
      ${primeiro?.numero_aluno ? `<div class="aluno-row"><span class="aluno-label">Nº de Aluno</span><span class="aluno-value">${primeiro.numero_aluno}</span></div>` : ""}
      <div class="aluno-row"><span class="aluno-label">Turma</span><span class="aluno-value">${primeiro?.matriculas?.[0]?.turma?.nome || "—"}</span></div>
    </div>` : "";

  return `
${buildTicketConsolidado(pagamentos, escola)}
<div class="doc">
  <div class="header">
    ${buildLogo(escola, escolaNome)}
    <div class="escola-info">
      <div class="escola-nome">${escolaNome}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </div>
    <div class="doc-type">
      <div class="doc-label">RECIBO DE COBRANÇAS</div>
      <div class="doc-ref">${pagamentos.length} pagamento(s)</div>
    </div>
  </div>
  <div class="meta-row">
    <div class="meta-item"><span class="meta-label">Emissão</span><span class="meta-value">${hoje}</span></div>
    <div class="meta-item"><span class="meta-label">Data Pagamento</span><span class="meta-value">${dataStr}</span></div>
    <div class="meta-item"><span class="meta-label">Método</span><span class="meta-value">${metodoStr}</span></div>
    <div class="meta-item"><span class="meta-label">Estado</span><span class="meta-value status-pago">PAGO</span></div>
  </div>
  ${alunoBlock}
  <div class="sec-title">Detalhes dos Pagamentos</div>
  <table class="items-table">
    <thead><tr>
      ${!mesmAluno ? `<th class="th-first">Aluno</th>` : `<th class="th-first">Descrição</th>`}
      ${mesmAluno ? "" : `<th>Descrição</th>`}
      <th style="width:140px">Referência</th>
      <th style="width:110px">Método</th>
      <th class="th-last" style="width:110px">Valor</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
    <tfoot><tr>
      <td colspan="${colspan - 1}" class="tf-label">TOTAL GERAL</td>
      <td class="tf-valor">${fmt(total)}</td>
    </tr></tfoot>
  </table>
  ${buildCarteiraBlock(carteira)}
  <div class="assinaturas">
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Tesoureiro(a)</div></div>
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Encarregado de Educação / Aluno</div></div>
  </div>
  <div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; ${hoje}</div>
</div>`;
}

/* ─── comprovativo de matrícula ───────────────────────────────── */

const statusMatLabel = {
  pendente:"Pendente", activa:"Activa", confirmada:"Confirmada",
  transferida:"Transferida", concluida:"Concluída", cancelada:"Cancelada",
};

function buildComprovativoSingle(m, escola) {
  const escolaNome = escola?.nome || "Educajá";
  const aluno      = m.aluno?.user?.nome || "—";
  const numAluno   = m.aluno?.numero_aluno || "—";
  const turma      = m.turma?.nome || "—";
  const curso      = m.turma?.classe?.curso?.nome || "—";
  const status     = statusMatLabel[m.status] || m.status;
  const statusCls  = m.status === "activa" ? "status-pago" : m.status === "pendente" ? "status-pend" : "";

  return `
${buildTicketMatricula(m, escola)}
<div class="doc">
  <div class="header">
    ${buildLogo(escola, escolaNome)}
    <div class="escola-info">
      <div class="escola-nome">${escolaNome}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </div>
    <div class="doc-type">
      <div class="doc-label">COMPROVATIVO DE MATRÍCULA</div>
      <div class="doc-ref">Ano Lectivo: ${m.ano_letivo || "—"}</div>
    </div>
  </div>
  <div class="meta-row">
    <div class="meta-item"><span class="meta-label">Emissão</span><span class="meta-value">${hoje}</span></div>
    <div class="meta-item"><span class="meta-label">Data Matrícula</span><span class="meta-value">${fmtDate(m.data_matricula)}</span></div>
    <div class="meta-item"><span class="meta-label">Turma</span><span class="meta-value">${turma}</span></div>
    <div class="meta-item"><span class="meta-label">Estado</span><span class="meta-value ${statusCls}">${status}</span></div>
  </div>
  <div class="sec-title">Dados do Aluno</div>
  <div class="aluno-box">
    <div class="aluno-row"><span class="aluno-label">Nome completo</span><span class="aluno-value">${aluno}</span></div>
    <div class="aluno-row"><span class="aluno-label">Nº de Aluno</span><span class="aluno-value">${numAluno}</span></div>
    ${m.aluno?.data_nascimento ? `<div class="aluno-row"><span class="aluno-label">Data de Nascimento</span><span class="aluno-value">${fmtDate(m.aluno.data_nascimento)}</span></div>` : ""}
    ${m.aluno?.bi ? `<div class="aluno-row"><span class="aluno-label">Bilhete de Identidade</span><span class="aluno-value">${m.aluno.bi}</span></div>` : ""}
    ${m.aluno?.nome_pai ? `<div class="aluno-row"><span class="aluno-label">Nome do Pai</span><span class="aluno-value">${m.aluno.nome_pai}</span></div>` : ""}
    ${m.aluno?.nome_mae ? `<div class="aluno-row"><span class="aluno-label">Nome da Mãe</span><span class="aluno-value">${m.aluno.nome_mae}</span></div>` : ""}
    ${m.aluno?.telefone_responsavel ? `<div class="aluno-row"><span class="aluno-label">Tel. Responsável</span><span class="aluno-value">${m.aluno.telefone_responsavel}</span></div>` : ""}
    ${m.aluno?.endereco ? `<div class="aluno-row"><span class="aluno-label">Endereço</span><span class="aluno-value">${m.aluno.endereco}</span></div>` : ""}
  </div>
  <div class="sec-title">Dados da Matrícula</div>
  <div class="aluno-box">
    <div class="aluno-row"><span class="aluno-label">Turma</span><span class="aluno-value">${turma}</span></div>
    <div class="aluno-row"><span class="aluno-label">Curso</span><span class="aluno-value">${curso}</span></div>
    <div class="aluno-row"><span class="aluno-label">Ano Lectivo</span><span class="aluno-value">${m.ano_letivo || "—"}</span></div>
    <div class="aluno-row"><span class="aluno-label">Estado</span><span class="aluno-value ${statusCls}">${status}</span></div>
  </div>
  <div class="assinaturas">
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Director(a) / Secretaria</div></div>
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Encarregado de Educação / Aluno</div></div>
  </div>
  <div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; ${hoje}</div>
</div>`;
}

function buildComprovativoConsolidado(matriculas, escola) {
  const escolaNome = escola?.nome || "Educajá";

  const linhas = matriculas.map(m => `
    <tr>
      <td>${m.aluno?.user?.nome || "—"}</td>
      <td class="td-mono">${m.aluno?.numero_aluno || "—"}</td>
      <td>${m.turma?.nome || "—"}</td>
      <td>${m.turma?.classe?.curso?.nome || "—"}</td>
      <td>${m.ano_letivo || "—"}</td>
      <td>${fmtDate(m.data_matricula)}</td>
      <td><span class="${m.status === "activa" ? "badge-pago" : "badge-pend"}">${statusMatLabel[m.status] || m.status}</span></td>
    </tr>`).join("");

  return `
<div class="doc">
  <div class="header">
    ${buildLogo(escola, escolaNome)}
    <div class="escola-info">
      <div class="escola-nome">${escolaNome}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </div>
    <div class="doc-type">
      <div class="doc-label">LISTA DE MATRÍCULAS</div>
      <div class="doc-ref">${matriculas.length} aluno(s)</div>
    </div>
  </div>
  <div class="meta-row">
    <div class="meta-item"><span class="meta-label">Data de Emissão</span><span class="meta-value">${hoje}</span></div>
    <div class="meta-item"><span class="meta-label">Total de Alunos</span><span class="meta-value">${matriculas.length}</span></div>
    <div class="meta-item"><span class="meta-label">Confirmadas</span><span class="meta-value status-pago">${matriculas.filter(m => m.status === "activa").length}</span></div>
    <div class="meta-item"><span class="meta-label">Pendentes</span><span class="meta-value status-pend">${matriculas.filter(m => m.status === "pendente").length}</span></div>
  </div>
  <div class="sec-title">Relação de Alunos Matriculados</div>
  <table class="items-table">
    <thead><tr>
      <th class="th-first">Aluno</th>
      <th style="width:80px">Nº</th>
      <th style="width:80px">Turma</th>
      <th>Curso</th>
      <th style="width:70px">Ano</th>
      <th style="width:85px">Data Mat.</th>
      <th class="th-last" style="width:100px">Estado</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="assinaturas">
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Director(a) / Secretaria</div></div>
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Encarregado de Educação</div></div>
  </div>
  <div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; ${hoje}</div>
</div>`;
}
