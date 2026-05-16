/**
 * imprimirRecibo(pagamento|pagamentos[], escola)
 * imprimirComprovativoMatricula(matricula|matriculas[], escola)
 *
 * Abre janela com selector de formato: A4 · A5 · Ticket
 * Cada impresso tem duas cópias: Aluno + Escola
 */

export function buildReciboHtml(pagamento, escola, carteira = null, viaNumber = 1) {
  const lista = Array.isArray(pagamento) ? pagamento : [pagamento];
  const title = lista.length === 1 ? "Factura-Recibo" : "Recibo de Cobranças";
  const body  = lista.length === 1 ? buildSingle(lista[0], escola, carteira, viaNumber) : buildConsolidado(lista, escola, carteira, viaNumber);
  return buildFormatWrapper(title, body, escola?.formato_impressao);
}

function openHtml(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank", "width=960,height=800");
  if (win) win.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
}

export function imprimirRecibo(pagamento, escola, carteira = null, viaNumber = 1) {
  openHtml(buildReciboHtml(pagamento, escola, carteira, viaNumber));
}

/* Bloco da carteira (aluno) — usado no recibo individual e consolidado. */
function buildCarteiraBlock(c) {
  if (!c) return "";
  const fmtV = (v) => Number(v || 0).toLocaleString("pt-PT");
  const saldo = (c.saldo ?? (Number(c.total_pago||0) - Number(c.total_pendente||0)));
  const saldoCls = saldo >= 0 ? "color:#16a34a" : "color:#dc2626";
  const temSaldoCart = c.saldo_carteira !== undefined && c.saldo_carteira !== null;
  const saldoCartCls = Number(c.saldo_carteira||0) > 0 ? "color:#4f46e5" : "color:#94a3b8";
  return `
<div class="sec-title">Saldo da Carteira</div>
<div class="aluno-box" style="display:grid;grid-template-columns:repeat(${temSaldoCart ? 4 : 3},1fr);gap:12px;padding-bottom:14px">
  <div style="text-align:center">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Total Pago</div>
    <div style="font-weight:700;color:#16a34a;font-size:13px;margin-top:2px">${fmtV(c.total_pago)} Kz</div>
  </div>
  <div style="text-align:center;border-left:1px solid #e2e8f0;${temSaldoCart ? "" : "border-right:1px solid #e2e8f0"}">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Pendente</div>
    <div style="font-weight:700;color:#d97706;font-size:13px;margin-top:2px">${fmtV(c.total_pendente)} Kz</div>
  </div>
  <div style="text-align:center;${temSaldoCart ? "border-left:1px solid #e2e8f0" : ""}">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Saldo</div>
    <div style="font-weight:700;font-size:13px;margin-top:2px;${saldoCls}">${fmtV(saldo)} Kz</div>
  </div>
  ${temSaldoCart ? `
  <div style="text-align:center;border-left:1px solid #e2e8f0">
    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">Em Carteira</div>
    <div style="font-weight:700;font-size:13px;margin-top:2px;${saldoCartCls}">${fmtV(c.saldo_carteira)} Kz</div>
  </div>` : ""}
</div>`;
}

export function imprimirComprovativoMatricula(matricula, escola) {
  const lista = Array.isArray(matricula) ? matricula : [matricula];
  const title = lista.length === 1 ? "Comprovativo de Matrícula" : "Lista de Matrículas";
  const body  = lista.length === 1 ? buildComprovativoSingle(lista[0], escola) : buildComprovativoConsolidado(lista, escola);
  openHtml(buildFormatWrapper(title, body, escola?.formato_impressao));
}

/* ─── janela de impressão com selector de formato ─────────────── */

function buildFormatWrapper(title, receiptHtml, formatoDefault = "a4") {
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
  font-size:13px;color:#000;font-weight:700;
  padding:6mm 4mm;
  margin-bottom:6px;
  display:none;
  -webkit-font-smoothing:none;
  text-rendering:geometricPrecision;
}
.tk-center{text-align:center;}
.tk-bold{font-weight:900;}
.tk-sep{border:none;border-top:1.5px dashed #000;margin:5px 0;}
.tk-row{display:flex;justify-content:space-between;padding:3px 0;gap:6px;font-weight:700;}
.tk-label{color:#000;font-weight:700;}
.tk-row span:last-child{font-weight:800;text-align:right;}
.tk-item{padding:3px 0;border-bottom:1px dotted #aaa;}
.tk-item:last-child{border-bottom:none;}
.tk-item-desc{font-weight:800;font-size:13px;}
.tk-item-mes{font-size:12px;font-weight:700;color:#000;margin-top:1px;}
.tk-item-val{display:flex;justify-content:space-between;font-size:13px;font-weight:800;margin-top:1px;}
.tk-total{display:flex;justify-content:space-between;font-size:15px;font-weight:900;padding:5px 0;border-top:2px solid #000;border-bottom:2px solid #000;margin-top:5px;}
.tk-sig{margin-top:8mm;border-top:1px solid #000;font-size:10px;color:#000;font-weight:700;text-align:center;padding-top:2px;}

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
    <button id="btn-ticket" class="fmt-btn" onclick="setFmt('ticket')">Ticket (POS)</button>
    <span id="fmt-config" style="color:#94a3b8;font-size:11px;margin-left:8px"></span>
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
    pageMargin: '6mm',
    wrapW: '210mm',
    innerDir: 'column',
    docDisplay: 'block',
    ticketDisplay: 'none',
    docScale: 1,
  },
  a5: {
    pageSize: 'A5 portrait',
    pageMargin: '6mm',
    wrapW: '148mm',
    innerDir: 'column',
    docDisplay: 'block',
    ticketDisplay: 'none',
    docScale: 0.88,
  },
  ticket: {
    pageSize: '80mm auto',
    pageMargin: '0',  // suprime cabeçalho/rodapé do browser (URL/data verticais)
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
    '@page{size:' + c.pageSize + ';margin:' + c.pageMargin + ';}' +
    '#wrap{padding:' + (f==='ticket'?'8px':'16px') + ';justify-content:center;}' +
    '#inner{width:' + c.wrapW + ';display:flex;flex-direction:' + c.innerDir + ';}' +
    '.doc{display:' + c.docDisplay + ';transform:scale(' + c.docScale + ');transform-origin:top left;width:' + (c.docScale < 1 ? (100/c.docScale)+'%' : '100%') + ';}' +
    '.ticket{display:' + c.ticketDisplay + ';' + (f==='ticket' ? 'border:none !important;padding:3mm 4mm !important;' : '') + '}' +
    '@media print{.doc{transform:none;width:100%;}' + (f==='ticket' ? '.ticket{border:none !important;}' : '') + '}';

  ['a4','a5','ticket'].forEach(function(k){
    document.getElementById('btn-'+k).classList.toggle('active', k===f);
  });
}

var DEFAULT_FMT = ${JSON.stringify(["a4","a5","ticket"].includes(formatoDefault) ? formatoDefault : "a4")};
console.log('[Educajá] Formato configurado:', DEFAULT_FMT);
document.getElementById('fmt-config').textContent = '(configurado: ' + DEFAULT_FMT.toUpperCase() + ')';
setFmt(DEFAULT_FMT);
</script>
</body>
</html>`;
}

/* ─── helpers ─────────────────────────────────────────────────── */

function fmt(v) { return Number(v || 0).toLocaleString("pt-PT") + " Kz"; }
function buildQrUrl(p, escola, size = 160) {
  const codigo = escola?.codigo || "esc";
  const ref    = p.referencia || `PAG-${p.id}`;
  const hash   = p.hash_factura || "";
  const origin = (typeof window !== "undefined" && window.location?.origin) ? window.location.origin : "";
  const data = `${origin}/verificar-recibo/${codigo}/${encodeURIComponent(ref)}${hash ? `?h=${hash}` : ""}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&qzone=2&data=${encodeURIComponent(data)}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-AO", { day:"2-digit", month:"2-digit", year:"numeric" });
}
function tipoLabel(t) {
  return { mensalidade:"Mensalidade", matricula:"Matrícula", emolumento:"Emolumento", outro:"Outro" }[t] || t;
}
const NOMES_MES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function fmtMesRef(mr) {
  if (!mr) return "";
  let m = String(mr).match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const idx = parseInt(m[2], 10) - 1;
    if (idx >= 0 && idx < 12) return `${NOMES_MES[idx]} ${m[1]}`;
  }
  return String(mr);
}
function metodoPag(m) {
  return { dinheiro:"Dinheiro", transferencia:"Transferência Bancária", multicaixa:"Multicaixa" }[m] || m || "—";
}
const hoje = new Date().toLocaleDateString("pt-AO");

export function pickMatricula(aluno) {
  const lista = aluno?.matriculas || [];
  if (!lista.length) return null;
  const score = (m) => {
    let s = 0;
    if (m?.status === "activa")     s += 100;
    if (m?.status === "confirmada") s += 80;
    const ano = String(m?.ano_letivo || m?.turma?.ano_letivo || "");
    const m4  = ano.match(/(\d{4})/g);
    if (m4 && m4.length) s += parseInt(m4[m4.length - 1], 10);
    s += (m?.id || 0) / 1e9;
    return s;
  };
  return [...lista].sort((a, b) => score(b) - score(a))[0];
}

function anoLectivoDeMes(mesRef) {
  if (!mesRef) return "";
  const m = String(mesRef).match(/(\d{4})-(\d{2})/);
  if (m) {
    const ano = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10);
    return mes >= 9 ? `${ano}-${ano + 1}` : `${ano - 1}-${ano}`;
  }
  const anos = String(mesRef).match(/\d{4}/g);
  if (anos && anos.length === 1) return `${anos[0]}-${parseInt(anos[0], 10) + 1}`;
  return "";
}

function resolveAnoLectivo(matricula, turma, pagamento) {
  return matricula?.ano_letivo
      || turma?.ano_letivo
      || anoLectivoDeMes(pagamento?.mes_referencia)
      || "—";
}

function buildLogo(escola, nome) {
  if (escola?.logo) {
    const abs = window.location.origin + "/storage/" + escola.logo;
    return `<img src="${abs}" style="width:50px;height:50px;border-radius:12px;object-fit:contain;background:rgba(255,255,255,.15);flex-shrink:0;"
      onerror="this.outerHTML='<div class=\\'logo-box\\'>${(nome||"E")[0].toUpperCase()}</div>'" />`;
  }
  return `<div class="logo-box">${(nome || "E")[0].toUpperCase()}</div>`;
}

/* ─── ticket compacto ─────────────────────────────────────────── */

function buildTicketCarteiraBlock(c) {
  if (!c) return "";
  const fmtV = (v) => Number(v || 0).toLocaleString("pt-PT");
  const anterior     = (c.saldo_carteira_anterior !== undefined && c.saldo_carteira_anterior !== null) ? Number(c.saldo_carteira_anterior) : null;
  const actual       = (c.saldo_carteira_actual   !== undefined && c.saldo_carteira_actual   !== null) ? Number(c.saldo_carteira_actual)
                     : (c.saldo_carteira          !== undefined && c.saldo_carteira          !== null) ? Number(c.saldo_carteira) : null;
  if (actual === null && anterior === null) return ""; // sem dados de carteira → não mostrar nada
  return `
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:13px;">SALDO CARTEIRA</div>
  <hr class="tk-sep"/>
  ${anterior !== null ? `<div class="tk-row"><span class="tk-label">Anterior:</span><span>${fmtV(anterior)} Kz</span></div>` : ""}
  ${actual   !== null ? `<div class="tk-row" style="font-size:14px;"><span class="tk-label">Actual:</span><span>${fmtV(actual)} Kz</span></div>` : ""}`;
}

function viaLabel(n, pagamentos) {
  const lista = Array.isArray(pagamentos) ? pagamentos : [pagamentos];
  if (lista.some(p => p && p._offline)) {
    return "RECIBO PROVISÓRIO — PENDENTE DE SINCRONIZAÇÃO";
  }
  const num = Math.max(1, Number(n || 1));
  if (num === 1) return "1ª VIA — ORIGINAL";
  if (num === 2) return "2ª VIA — REIMPRESSO";
  return `${num}ª VIA — REIMPRESSO`;
}

function offlineBanner(pagamentos) {
  const lista = Array.isArray(pagamentos) ? pagamentos : [pagamentos];
  if (!lista.some(p => p && p._offline)) return "";
  return `
<div style="background:#fef3c7;border-bottom:2px solid #f59e0b;color:#92400e;padding:10px 24px;font-size:11px;font-weight:700;text-align:center;letter-spacing:.04em;">
  ⚠ DOCUMENTO PROVISÓRIO — EMITIDO OFFLINE. Será reemitido com nº oficial assim que voltar a internet.
</div>`;
}

function offlineTicketBanner(pagamentos) {
  const lista = Array.isArray(pagamentos) ? pagamentos : [pagamentos];
  if (!lista.some(p => p && p._offline)) return "";
  return `
<div class="tk-center" style="background:#000;color:#fff;padding:3px 0;font-size:10px;letter-spacing:.04em;font-weight:900;">
  ★ PROVISÓRIO OFFLINE ★
</div>`;
}

function buildTicketSingle(p, escola, carteira = null, viaNumber = 1) {
  const escolaNome = escola?.nome || "Educajá";
  const logoImg    = escola?.logo && !p?._offline
    ? `<img src="${window.location.origin}/storage/${escola.logo}" style="height:72px;max-width:60mm;object-fit:contain;margin-bottom:3px;" onerror="this.style.display='none'"/><br/>`
    : "";
  const aluno    = p.aluno?.user?.nome || "—";
  const numAluno = p.aluno?.numero_aluno || "—";
  const matricula = pickMatricula(p.aluno);
  const turmaT    = matricula?.turma;
  const cursoT    = turmaT?.classe?.curso?.nome || "—";
  const classeT   = turmaT?.classe?.nome || "—";
  const turmaNome = turmaT?.nome || "—";
  const turnoT    = turmaT?.turnoObj?.nome || turmaT?.turno || "—";
  const anoLectT  = resolveAnoLectivo(matricula, turmaT, p);
  const multaV    = Number(p.multa_valor || 0);
  const bolsaV    = Number(p.bolsa_valor || 0);
  const cartV     = Number(p.valor_carteira || 0);
  const entregueV = Number(p.valor_entregue || 0);
  const totalP    = Number(p.valor || 0) + multaV - bolsaV;
  const restoCash = Math.max(0, totalP - cartV);
  const trocoV    = entregueV > 0 ? entregueV - restoCash : 0;
  const isCarteiraTotal = p.metodo === "carteira";
  return `
<div class="ticket">
  ${offlineTicketBanner(p)}
  <div class="tk-center">${logoImg}<div class="tk-bold" style="font-size:14px;">${escolaNome}</div><div style="font-size:10px;font-weight:700;">Sistema de Gestão Escolar</div></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:14px;">${p?._offline ? "FACTURA-RECIBO (PROVISÓRIO)" : "FACTURA-RECIBO"}</div>
  <div class="tk-center" style="font-size:11px;font-weight:700;">Nº ${p.referencia || "—"}</div>
  <hr class="tk-sep"/>
  <div class="tk-row"><span class="tk-label">Aluno:</span><span>${aluno}</span></div>
  <div class="tk-row"><span class="tk-label">Nº:</span><span>${numAluno}</span></div>
  <div class="tk-row"><span class="tk-label">Curso:</span><span>${cursoT}</span></div>
  <div class="tk-row"><span class="tk-label">Classe:</span><span>${classeT}</span></div>
  <div class="tk-row"><span class="tk-label">Turma:</span><span>${turmaNome}</span></div>
  <div class="tk-row"><span class="tk-label">Turno:</span><span>${turnoT}</span></div>
  <div class="tk-row"><span class="tk-label">Ano Lect.:</span><span>${anoLectT}</span></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:12px;">DESCRIÇÃO</div>
  <hr class="tk-sep"/>
  <div class="tk-item">
    <div class="tk-item-desc">${tipoLabel(p.tipo)}</div>
    ${p.mes_referencia ? `<div class="tk-item-mes">Mês pago: ${fmtMesRef(p.mes_referencia)}</div>` : ""}
    <div class="tk-item-val"><span>Valor:</span><span>${fmt(p.valor)}</span></div>
    ${multaV > 0 ? `<div class="tk-item-val"><span>Multa:</span><span>${fmt(multaV)}</span></div>` : ""}
    ${bolsaV > 0 ? `<div class="tk-item-val"><span>Bolsa:</span><span>-${fmt(bolsaV)}</span></div>` : ""}
  </div>
  <hr class="tk-sep"/>
  <div class="tk-row"><span class="tk-label">Data Pag.:</span><span>${fmtDate(p.data_pagamento)}</span></div>
  <div class="tk-row"><span class="tk-label">Emissão:</span><span>${hoje}</span></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:12px;">ENTREGOU</div>
  <hr class="tk-sep"/>
  ${isCarteiraTotal
    ? `<div class="tk-row"><span class="tk-label">Carteira:</span><span>${fmt(totalP)}</span></div>`
    : `${restoCash > 0 ? `<div class="tk-row"><span class="tk-label">${metodoPag(p.metodo)}:</span><span>${fmt(restoCash)}</span></div>` : ""}
       ${cartV > 0 ? `<div class="tk-row"><span class="tk-label">Carteira:</span><span>${fmt(cartV)}</span></div>` : ""}`}
  <div class="tk-total"><span>TOTAL</span><span>${fmt(totalP)}</span></div>
  ${entregueV > 0 && !isCarteiraTotal ? `<div class="tk-row"><span class="tk-label">Valor Entregue:</span><span>${fmt(entregueV)}</span></div>` : ""}
  ${entregueV > 0 && trocoV > 0 ? `<div class="tk-row"><span class="tk-label">Troco:</span><span>${fmt(trocoV)}</span></div>` : ""}
  ${buildTicketCarteiraBlock(carteira)}
  ${p?._offline ? "" : `<div style="text-align:center;margin-top:6mm;">
    <img src="${buildQrUrl(p, escola, 110)}" alt="QR" style="width:24mm;height:24mm;"/>
    <div style="font-size:8px;color:#666;margin-top:2px;">Verificar autenticidade</div>
  </div>`}
  <div class="tk-sig">Tesoureiro(a)</div>
  <div class="tk-sig">Encarregado / Aluno</div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:10px;letter-spacing:.05em;">${viaLabel(viaNumber, p)}</div>
</div>`;
}

function buildTicketConsolidado(pagamentos, escola, carteira = null, viaNumber = 1) {
  const isOffline  = pagamentos.some(p => p?._offline);
  const escolaNome = escola?.nome || "Educajá";
  const logoImg    = escola?.logo && !isOffline
    ? `<img src="${window.location.origin}/storage/${escola.logo}" style="height:72px;max-width:60mm;object-fit:contain;margin-bottom:3px;" onerror="this.style.display='none'"/><br/>`
    : "";
  const total = pagamentos.reduce((s, p) =>
    s + Number(p.valor || 0) + Number(p.multa_valor || 0) - Number(p.bolsa_valor || 0), 0);
  const cartTotal = pagamentos.reduce((s, p) => s + Number(p.valor_carteira || 0), 0);
  const entregueTotal = pagamentos.reduce((s, p) => s + Number(p.valor_entregue || 0), 0);
  const restoCashTotal = Math.max(0, total - cartTotal);
  const trocoTotal     = entregueTotal > 0 ? entregueTotal - restoCashTotal : 0;
  const metodoPrincipal = pagamentos[0]?.metodo;
  const isCarteiraTotal = metodoPrincipal === "carteira";
  const alunoIds = [...new Set(pagamentos.map(p => p.aluno?.id).filter(Boolean))];
  const mesmoAluno = alunoIds.length === 1;
  const primeiro   = pagamentos[0]?.aluno;
  const matricula  = pickMatricula(primeiro);
  const turmaT     = matricula?.turma;
  const cabecalhoAluno = mesmoAluno ? `
  <div class="tk-row"><span class="tk-label">Aluno:</span><span>${primeiro?.user?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Nº:</span><span>${primeiro?.numero_aluno || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Curso:</span><span>${turmaT?.classe?.curso?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Classe:</span><span>${turmaT?.classe?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Turma:</span><span>${turmaT?.nome || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Turno:</span><span>${turmaT?.turnoObj?.nome || turmaT?.turno || "—"}</span></div>
  <div class="tk-row"><span class="tk-label">Ano Lect.:</span><span>${resolveAnoLectivo(matricula, turmaT, pagamentos[0])}</span></div>
  <hr class="tk-sep"/>` : "";
  const linhas = pagamentos.map(p => {
    const nomeAluno = !mesmoAluno ? `<div class="tk-item-mes" style="font-size:11px;">Aluno: ${p.aluno?.user?.nome || "—"}</div>` : "";
    const mV = Number(p.multa_valor || 0);
    const bV = Number(p.bolsa_valor || 0);
    return `<div class="tk-item">
      <div class="tk-item-desc">${tipoLabel(p.tipo)}</div>
      ${p.mes_referencia ? `<div class="tk-item-mes">Mês pago: ${fmtMesRef(p.mes_referencia)}</div>` : ""}
      ${nomeAluno}
      <div class="tk-item-val"><span>Valor:</span><span>${fmt(p.valor)}</span></div>
      ${mV > 0 ? `<div class="tk-item-val"><span>Multa:</span><span>${fmt(mV)}</span></div>` : ""}
      ${bV > 0 ? `<div class="tk-item-val"><span>Bolsa:</span><span>-${fmt(bV)}</span></div>` : ""}
    </div>`;
  }).join("");
  return `
<div class="ticket">
  ${offlineTicketBanner(pagamentos)}
  <div class="tk-center">${logoImg}<div class="tk-bold" style="font-size:14px;">${escolaNome}</div><div style="font-size:10px;font-weight:700;">Sistema de Gestão Escolar</div></div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:14px;">${isOffline ? "RECIBO DE COBRANÇAS (PROVISÓRIO)" : "RECIBO DE COBRANÇAS"}</div>
  <div class="tk-center" style="font-size:11px;font-weight:700;">${pagamentos.length} pagamento(s) · ${hoje}</div>
  <hr class="tk-sep"/>
  ${cabecalhoAluno}
  <div class="tk-center tk-bold" style="font-size:12px;">DESCRIÇÃO DOS SERVIÇOS</div>
  <hr class="tk-sep"/>
  ${linhas}
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:12px;">ENTREGOU</div>
  <hr class="tk-sep"/>
  ${isCarteiraTotal
    ? `<div class="tk-row"><span class="tk-label">Carteira:</span><span>${fmt(total)}</span></div>`
    : `${restoCashTotal > 0 ? `<div class="tk-row"><span class="tk-label">${metodoPag(metodoPrincipal)}:</span><span>${fmt(restoCashTotal)}</span></div>` : ""}
       ${cartTotal > 0 ? `<div class="tk-row"><span class="tk-label">Carteira:</span><span>${fmt(cartTotal)}</span></div>` : ""}`}
  <div class="tk-total"><span>TOTAL</span><span>${fmt(total)}</span></div>
  ${entregueTotal > 0 && !isCarteiraTotal ? `<div class="tk-row"><span class="tk-label">Valor Entregue:</span><span>${fmt(entregueTotal)}</span></div>` : ""}
  ${entregueTotal > 0 && trocoTotal > 0 ? `<div class="tk-row"><span class="tk-label">Troco:</span><span>${fmt(trocoTotal)}</span></div>` : ""}
  ${mesmoAluno ? buildTicketCarteiraBlock(carteira) : ""}
  ${isOffline ? "" : `<div style="text-align:center;margin-top:6mm;">
    <img src="${buildQrUrl(pagamentos[0], escola, 110)}" alt="QR" style="width:24mm;height:24mm;"/>
    <div style="font-size:8px;color:#666;margin-top:2px;">${pagamentos[0]?.lote_id || ""}</div>
  </div>`}
  <div class="tk-sig">Tesoureiro(a)</div>
  <div class="tk-sig">Encarregado / Aluno</div>
  <hr class="tk-sep"/>
  <div class="tk-center tk-bold" style="font-size:10px;letter-spacing:.05em;">${viaLabel(viaNumber, pagamentos)}</div>
</div>`;
}

function buildTicketMatricula(m, escola) {
  const escolaNome = escola?.nome || "Educajá";
  const logoImg    = escola?.logo
    ? `<img src="${window.location.origin}/storage/${escola.logo}" style="height:72px;max-width:60mm;object-fit:contain;margin-bottom:3px;" onerror="this.style.display='none'"/><br/>`
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

function buildSingle(p, escola, carteira = null, viaNumber = 1) {
  const escolaNome = escola?.nome || "Educajá";
  const aluno      = p.aluno?.user?.nome || "—";
  const numAluno   = p.aluno?.numero_aluno || "";
  const turma      = pickMatricula(p.aluno)?.turma?.nome || "—";
  const descricao  = tipoLabel(p.tipo) + (p.mes_referencia ? ` — ${fmtMesRef(p.mes_referencia)}` : "");
  const multaV     = Number(p.multa_valor || 0);
  const bolsaV     = Number(p.bolsa_valor || 0);
  const totalP     = Number(p.valor || 0) + multaV - bolsaV;

  return `
${buildTicketSingle(p, escola, carteira, viaNumber)}
<div class="doc">
  ${offlineBanner(p)}
  <div class="header">
    ${buildLogo(escola, escolaNome)}
    <div class="escola-info">
      <div class="escola-nome">${escolaNome}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </div>
    <div class="doc-type">
      <div class="doc-label">${p?._offline ? "FACTURA-RECIBO PROVISÓRIO" : "FACTURA-RECIBO"}</div>
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
    <tbody>
      <tr>
        <td>${descricao}</td>
        <td class="td-mono">${p.referencia || "—"}</td>
        <td class="td-right">${fmt(p.valor)}</td>
      </tr>
      ${multaV > 0 ? `<tr>
        <td>Multa por atraso</td>
        <td class="td-mono">—</td>
        <td class="td-right" style="color:#d97706">${fmt(multaV)}</td>
      </tr>` : ""}
      ${bolsaV > 0 ? `<tr>
        <td>Bolsa aplicada</td>
        <td class="td-mono">—</td>
        <td class="td-right" style="color:#16a34a">-${fmt(bolsaV)}</td>
      </tr>` : ""}
    </tbody>
    <tfoot><tr>
      <td colspan="2" class="tf-label">TOTAL</td>
      <td class="tf-valor">${fmt(totalP)}</td>
    </tr></tfoot>
  </table>
  ${buildCarteiraBlock(carteira)}
  <div style="display:flex;align-items:flex-end;gap:24px;padding:8px 28px 16px">
    <div style="flex:1;display:flex;gap:40px;">
      <div style="flex:1"><div class="ass-linha" style="height:1px;background:#94a3b8;margin-top:36px;margin-bottom:6px;"></div><div class="ass-label">Tesoureiro(a)</div></div>
      <div style="flex:1"><div class="ass-linha" style="height:1px;background:#94a3b8;margin-top:36px;margin-bottom:6px;"></div><div class="ass-label">Encarregado de Educação / Aluno</div></div>
    </div>
    ${p?._offline ? "" : `<div style="text-align:center;">
      <img src="${buildQrUrl(p, escola)}" alt="QR" style="width:90px;height:90px;border:1px solid #e5e7eb;padding:3px;border-radius:4px;background:#fff;"/>
      <div style="font-size:8px;color:#94a3b8;margin-top:3px;">Verificar autenticidade</div>
    </div>`}
  </div>
  <div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; ${hoje} &nbsp;·&nbsp; <strong>${viaLabel(viaNumber, p)}</strong></div>
</div>`;
}

function buildConsolidado(pagamentos, escola, carteira = null, viaNumber = 1) {
  const isOffline  = pagamentos.some(p => p?._offline);
  const escolaNome = escola?.nome || "Educajá";
  const total      = pagamentos.reduce((s, p) =>
    s + Number(p.valor || 0) + Number(p.multa_valor || 0) - Number(p.bolsa_valor || 0), 0);
  const alunoIds   = [...new Set(pagamentos.map(p => p.aluno?.id).filter(Boolean))];
  const mesmAluno  = alunoIds.length === 1;
  const primeiro   = pagamentos[0]?.aluno;
  const metodos    = [...new Set(pagamentos.map(p => p.metodo).filter(Boolean))];
  const metodoStr  = metodos.length === 1 ? metodoPag(metodos[0]) : "Vários";
  const datas      = pagamentos.map(p => p.data_pagamento).filter(Boolean).sort();
  const dataStr    = datas.length ? fmtDate(datas[datas.length - 1]) : hoje;

  const linhas = pagamentos.map(p => {
    const mV = Number(p.multa_valor || 0);
    const bV = Number(p.bolsa_valor || 0);
    const aPagar = Number(p.valor || 0) + mV - bV;
    const extra  = (mV > 0 || bV > 0)
      ? `<div style="font-size:9px;color:#94a3b8;margin-top:2px">${
          [mV > 0 ? `multa ${fmt(mV)}` : "", bV > 0 ? `bolsa -${fmt(bV)}` : ""].filter(Boolean).join(" · ")
        }</div>`
      : "";
    return `
    <tr>
      ${!mesmAluno ? `<td>${p.aluno?.user?.nome || "—"}</td>` : ""}
      <td>${tipoLabel(p.tipo)}${p.mes_referencia ? ` — ${fmtMesRef(p.mes_referencia)}` : ""}${extra}</td>
      <td class="td-mono">${p.referencia || "—"}</td>
      <td>${metodoPag(p.metodo)}</td>
      <td class="td-right">${fmt(aPagar)}</td>
    </tr>`;
  }).join("");

  const colspan = mesmAluno ? 4 : 5;
  const alunoBlock = mesmAluno ? `
    <div class="sec-title">Dados do Aluno</div>
    <div class="aluno-box">
      <div class="aluno-row"><span class="aluno-label">Nome completo</span><span class="aluno-value">${primeiro?.user?.nome || "—"}</span></div>
      ${primeiro?.numero_aluno ? `<div class="aluno-row"><span class="aluno-label">Nº de Aluno</span><span class="aluno-value">${primeiro.numero_aluno}</span></div>` : ""}
      <div class="aluno-row"><span class="aluno-label">Turma</span><span class="aluno-value">${pickMatricula(primeiro)?.turma?.nome || "—"}</span></div>
    </div>` : "";

  return `
${buildTicketConsolidado(pagamentos, escola, carteira, viaNumber)}
<div class="doc">
  ${offlineBanner(pagamentos)}
  <div class="header">
    ${buildLogo(escola, escolaNome)}
    <div class="escola-info">
      <div class="escola-nome">${escolaNome}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </div>
    <div class="doc-type">
      <div class="doc-label">${isOffline ? "RECIBO PROVISÓRIO" : "RECIBO DE COBRANÇAS"}</div>
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
  <div style="display:flex;align-items:flex-end;gap:24px;padding:8px 28px 16px">
    <div style="flex:1;display:flex;gap:40px;">
      <div style="flex:1"><div style="height:1px;background:#94a3b8;margin-top:36px;margin-bottom:6px;"></div><div class="ass-label">Tesoureiro(a)</div></div>
      <div style="flex:1"><div style="height:1px;background:#94a3b8;margin-top:36px;margin-bottom:6px;"></div><div class="ass-label">Encarregado de Educação / Aluno</div></div>
    </div>
    ${isOffline ? "" : `<div style="text-align:center;">
      <img src="${buildQrUrl(pagamentos[0], escola)}" alt="QR" style="width:90px;height:90px;border:1px solid #e5e7eb;padding:3px;border-radius:4px;background:#fff;"/>
      <div style="font-size:8px;color:#94a3b8;margin-top:3px;">Verificar lote: ${pagamentos[0]?.lote_id || pagamentos[0]?.referencia || ""}</div>
    </div>`}
  </div>
  <div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; ${hoje} &nbsp;·&nbsp; <strong>${viaLabel(viaNumber, pagamentos)}</strong></div>
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
