import { useState, useEffect } from "react";
import { FileText, Printer, Settings2, ShieldCheck } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const hoje = new Date().toISOString().split("T")[0];
const PERIODOS = ["1º Trimestre", "2º Trimestre", "3º Trimestre", "1º Semestre", "2º Semestre", "Exame Final", "Exame de Recurso"];

// Gera código alfanumérico único para cada folha
function gerarCodigoFolha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function gerarFolhaProva(cfg, escola, folhas, tenantId) {
  const baseUrl    = window.location.origin;
  const logoUrl    = escola?.logo ? `${baseUrl}/storage/${escola.logo}` : null;
  const escolaNome = escola?.nome || "EduSoft";

  const dataPretty = cfg.data
    ? new Date(cfg.data + "T12:00:00").toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" })
    : "___/___/______";

  const numLinhas   = parseInt(cfg.num_linhas)    || 28;
  const numLinhasP2 = parseInt(cfg.num_linhas_p2) || 38;
  const numLinhasP3 = parseInt(cfg.num_linhas_p3) || 38;
  const numLinhasP4 = parseInt(cfg.num_linhas_p4) || 38;

  const questoes = cfg.questoes.filter(q => q.trim()).map((q, i) => `
    <div class="questao">
      <div class="questao-num">Q${i + 1}</div>
      <div class="questao-texto">${q}</div>
    </div>`).join("");

  const copias = folhas.map(({ codigo }, ci) => {
    const verifyUrl = `${baseUrl}/verificar-prova/${codigo}?tenant=${tenantId}`;
    const qrData    = encodeURIComponent(verifyUrl);

    const linhas   = Array.from({ length: numLinhas },   () => `<div class="linha"></div>`).join("");
    const linhasP2 = Array.from({ length: numLinhasP2 }, () => `<div class="linha"></div>`).join("");
    const linhasP3 = Array.from({ length: numLinhasP3 }, () => `<div class="linha"></div>`).join("");
    const linhasP4 = Array.from({ length: numLinhasP4 }, () => `<div class="linha"></div>`).join("");

    return `
<!-- ═══════════════ CÓPIA ${ci + 1} — PÁGINA 1 ═══════════════ -->
${ci > 0 ? '<div class="page-break"></div>' : ""}

<!-- Marca de água anti-fraude -->
<div class="marca-agua">${escolaNome.toUpperCase()} — DOCUMENTO OFICIAL — ${codigo}</div>

<!-- Cabeçalho -->
<div class="cabecalho">
  <div class="logo-wrap">
    ${logoUrl
      ? `<img src="${logoUrl}" alt="Logo" onerror="this.outerHTML='<div class=logo-placeholder>${escolaNome[0]}</div>'"/>`
      : `<div class="logo-placeholder">${escolaNome[0]}</div>`}
  </div>
  <div class="escola-info">
    <div class="escola-nome">${escolaNome}</div>
    ${escola?.endereco ? `<div class="escola-sub">${escola.endereco}</div>` : ""}
    ${escola?.telefone ? `<div class="escola-contact">Tel: ${escola.telefone}</div>` : ""}
  </div>
  <div class="ministerio">
    <strong>REPÚBLICA DE ANGOLA</strong><br/>
    Ministério da Educação<br/>
    Ano Lectivo ${cfg.ano_letivo || new Date().getFullYear()}
  </div>
</div>

<!-- Título -->
<div class="titulo-prova">
  <div class="titulo-label">Prova de ${cfg.disciplina || "_________________________"}</div>
  <div class="subtitulo">${cfg.periodo || ""} &nbsp;·&nbsp; Duração: ${cfg.duracao || "___"} minutos</div>
</div>

<!-- Faixa de informações -->
<div class="info-faixa">
  <div class="info-item"><span class="info-label">Classe:</span><span class="info-value">${cfg.classe || ""}</span></div>
  <div class="info-item"><span class="info-label">Turma:</span><span class="info-value">${cfg.turma || ""}</span></div>
  <div class="info-item"><span class="info-label">Data:</span><span class="info-value">${dataPretty}</span></div>
  <div class="info-item"><span class="info-label">Cotação:</span><span class="info-value">${cfg.cotacao ? cfg.cotacao + " val." : ""}</span></div>
  <div class="info-item"><span class="info-label">Professor(a):</span><span class="info-value">${cfg.professor || ""}</span></div>
</div>

<!-- Dados do aluno -->
<div class="aluno-box">
  <div class="aluno-field"><span class="aluno-label">Nome do Aluno:</span><div class="aluno-line"></div></div>
  <div class="aluno-field"><span class="aluno-label">Nº:</span><div class="aluno-line"></div></div>
  <div class="aluno-field"><span class="aluno-label">Assinatura:</span><div class="aluno-line"></div></div>
</div>

<!-- Classificação + Anti-fraude -->
<div class="classif-wrap">
  <div class="classif-box">
    <div class="classif-title">Grupo I</div>
    <div class="classif-value"></div>
  </div>
  <div class="classif-box">
    <div class="classif-title">Grupo II</div>
    <div class="classif-value"></div>
  </div>
  <div class="classif-box">
    <div class="classif-title">Grupo III</div>
    <div class="classif-value"></div>
  </div>
  <div class="classif-box final">
    <div class="classif-title">Classificação Final</div>
    <div class="classif-value" style="font-size:22pt;"></div>
  </div>
  <div class="classif-assinatura">
    <div class="classif-ass-label">Assinatura do Professor(a)</div>
    <div class="ass-linha"></div>
    <div class="classif-ass-label" style="margin-top:6px;">Visto do Encarregado de Educação</div>
    <div class="ass-linha"></div>
  </div>
  <!-- Anti-fraude: QR + código -->
  <div class="antifraude-box">
    <div class="qr-wrap" id="qr-${ci}"></div>
    <div class="codigo-folha">${codigo}</div>
    <div class="antifraude-label">Documento Oficial</div>
  </div>
</div>

<!-- Instruções -->
${cfg.instrucoes ? `
<div class="instrucoes">
  <strong>Instruções:</strong> ${cfg.instrucoes}
</div>` : ""}

<!-- Questões -->
${questoes ? `
<div class="questoes-section">
  <div class="questoes-title">Questões</div>
  ${questoes}
</div>` : ""}

<!-- Linhas de resposta -->
<div class="resposta-section">
  ${!questoes ? `<div class="resposta-title">Respostas</div>` : ""}
  ${linhas}
</div>

<!-- Rodapé pág 1 -->
<div class="rodape">
  <span>${escolaNome} · ${cfg.disciplina || "Prova"} · ${cfg.periodo || ""} · ${cfg.ano_letivo || new Date().getFullYear()}</span>
  <span class="codigo-rodape">🔒 ${codigo}</span>
  <span>Pág. 1 / 4</span>
</div>

<!-- ═══════════════ CÓPIA ${ci + 1} — PÁGINA 2 ═══════════════ -->
<div class="page-break"></div>
<div class="marca-agua">${escolaNome.toUpperCase()} — DOCUMENTO OFICIAL — ${codigo}</div>

<div class="cont-header">
  <span class="cont-title">Continuação — ${cfg.disciplina || "Prova"} &nbsp;|&nbsp; Pág. 2</span>
  <span class="cont-aluno">Nome: <span class="cont-line" style="width:240px;"></span> &nbsp; Nº: <span class="cont-line" style="width:60px;"></span></span>
</div>

${linhasP2}

<div class="rodape">
  <span>${escolaNome} · ${cfg.disciplina || "Prova"} · ${cfg.periodo || ""} · ${cfg.ano_letivo || new Date().getFullYear()}</span>
  <span class="codigo-rodape">🔒 ${codigo}</span>
  <span>Pág. 2 / 4</span>
</div>

<!-- ═══════════════ CÓPIA ${ci + 1} — PÁGINA 3 ═══════════════ -->
<div class="page-break"></div>
<div class="marca-agua">${escolaNome.toUpperCase()} — DOCUMENTO OFICIAL — ${codigo}</div>

<div class="cont-header">
  <span class="cont-title">Continuação — ${cfg.disciplina || "Prova"} &nbsp;|&nbsp; Pág. 3</span>
  <span class="cont-aluno">Nome: <span class="cont-line" style="width:240px;"></span> &nbsp; Nº: <span class="cont-line" style="width:60px;"></span></span>
</div>

${linhasP3}

<div class="rodape">
  <span>${escolaNome} · ${cfg.disciplina || "Prova"} · ${cfg.periodo || ""} · ${cfg.ano_letivo || new Date().getFullYear()}</span>
  <span class="codigo-rodape">🔒 ${codigo}</span>
  <span>Pág. 3 / 4</span>
</div>

<!-- ═══════════════ CÓPIA ${ci + 1} — PÁGINA 4 ═══════════════ -->
<div class="page-break"></div>
<div class="marca-agua">${escolaNome.toUpperCase()} — DOCUMENTO OFICIAL — ${codigo}</div>

<div class="cont-header">
  <span class="cont-title">Continuação — ${cfg.disciplina || "Prova"} &nbsp;|&nbsp; Pág. 4</span>
  <span class="cont-aluno">Nome: <span class="cont-line" style="width:240px;"></span> &nbsp; Nº: <span class="cont-line" style="width:60px;"></span></span>
</div>

${linhasP4}

<div class="rodape">
  <span>${escolaNome} · ${cfg.disciplina || "Prova"} · ${cfg.periodo || ""} · ${cfg.ano_letivo || new Date().getFullYear()}</span>
  <span class="codigo-rodape">🔒 ${codigo}</span>
  <span>Pág. 4 / 4</span>
</div>

<script>
(function(){
  var qrEl = document.getElementById('qr-${ci}');
  if (!qrEl) return;
  var s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload = function() {
    new QRCode(qrEl, {
      text: '${qrData}',
      width: 56, height: 56,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  };
  document.head.appendChild(s);
})();
</script>
`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Folha de Prova — ${cfg.disciplina || "Prova"}</title>
<style>
@page { size: A3 portrait; margin: 10mm 12mm; }
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Times New Roman',Times,serif;font-size:12pt;color:#000;background:#fff;position:relative;}

/* ── MARCA DE ÁGUA ── */
.marca-agua{
  position:fixed;top:50%;left:50%;
  transform:translate(-50%,-50%) rotate(-35deg);
  font-size:32pt;font-weight:900;
  color:rgba(0,0,0,0.04);
  white-space:nowrap;pointer-events:none;z-index:0;
  letter-spacing:.12em;text-transform:uppercase;
}

/* ── CABEÇALHO ── */
.cabecalho{
  display:flex;align-items:center;gap:12px;
  border-bottom:2.5px solid #000;
  padding-bottom:8px;margin-bottom:8px;position:relative;z-index:1;
}
.logo-wrap{width:65px;height:65px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.logo-wrap img{width:65px;height:65px;object-fit:contain;}
.logo-placeholder{width:65px;height:65px;border:2px solid #000;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22pt;font-weight:900;}
.escola-info{flex:1;text-align:center;}
.escola-nome{font-size:15pt;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}
.escola-sub{font-size:9pt;margin-top:2px;color:#444;}
.escola-contact{font-size:8pt;color:#555;margin-top:1px;}
.ministerio{text-align:right;font-size:8pt;color:#444;line-height:1.5;}

/* ── TÍTULO ── */
.titulo-prova{text-align:center;margin:8px 0 6px;position:relative;z-index:1;}
.titulo-label{display:inline-block;border:2.5px solid #000;padding:5px 32px;font-size:14pt;font-weight:900;text-transform:uppercase;letter-spacing:.08em;}
.subtitulo{font-size:10pt;margin-top:4px;color:#222;}

/* ── FAIXA INFO ── */
.info-faixa{display:flex;gap:0;border:1.5px solid #000;margin:6px 0;position:relative;z-index:1;}
.info-item{flex:1;border-right:1.5px solid #000;padding:3px 8px;display:flex;align-items:baseline;gap:4px;}
.info-item:last-child{border-right:none;}
.info-label{font-size:8pt;font-weight:700;text-transform:uppercase;white-space:nowrap;color:#333;}
.info-value{font-size:9pt;font-weight:600;flex:1;border-bottom:1px dotted #999;min-width:30px;}

/* ── ALUNO ── */
.aluno-box{border:1.5px solid #000;padding:6px 10px;margin:6px 0;display:grid;grid-template-columns:2fr 1fr 1fr;gap:0 12px;position:relative;z-index:1;}
.aluno-field{display:flex;align-items:baseline;gap:5px;padding:3px 0;}
.aluno-label{font-size:8pt;font-weight:700;text-transform:uppercase;white-space:nowrap;}
.aluno-line{flex:1;border-bottom:1.5px solid #000;}

/* ── CLASSIFICAÇÃO + ANTI-FRAUDE ── */
.classif-wrap{display:flex;gap:8px;margin:6px 0;align-items:stretch;position:relative;z-index:1;}
.classif-box{border:2px solid #000;padding:6px 10px;min-width:90px;text-align:center;}
.classif-box.final{background:#f0f0f0;border-width:2.5px;}
.classif-title{font-size:8pt;font-weight:700;text-transform:uppercase;margin-bottom:4px;border-bottom:1px solid #000;padding-bottom:3px;}
.classif-value{font-size:18pt;font-weight:900;height:28px;line-height:28px;}
.classif-assinatura{flex:1;border:1.5px solid #000;padding:6px 10px;}
.classif-ass-label{font-size:8pt;font-weight:700;text-transform:uppercase;margin-bottom:2px;}
.ass-linha{border-bottom:1px solid #000;margin-top:20px;}

/* ── ANTI-FRAUDE ── */
.antifraude-box{
  border:1.5px solid #000;padding:4px 6px;min-width:80px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  background:#fafafa;
}
.qr-wrap{width:56px;height:56px;}
.qr-wrap img{width:56px;height:56px;}
.codigo-folha{font-family:'Courier New',monospace;font-size:7pt;font-weight:700;letter-spacing:.06em;text-align:center;word-break:break-all;}
.antifraude-label{font-size:6pt;color:#666;text-transform:uppercase;letter-spacing:.08em;}

/* ── INSTRUÇÕES ── */
.instrucoes{border:1.5px solid #999;border-radius:4px;padding:5px 10px;margin:6px 0;background:#f9f9f9;font-size:8.5pt;color:#333;position:relative;z-index:1;}
.instrucoes strong{font-size:9pt;display:inline;margin-right:4px;}

/* ── QUESTÕES ── */
.questoes-section{margin:8px 0 6px;position:relative;z-index:1;}
.questoes-title{font-size:9pt;font-weight:700;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:6px;}
.questao{display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;}
.questao-num{background:#000;color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9pt;font-weight:700;flex-shrink:0;margin-top:1px;}
.questao-texto{font-size:10pt;line-height:1.5;flex:1;}

/* ── LINHAS ── */
.resposta-section{margin:6px 0;position:relative;z-index:1;}
.resposta-title{font-size:9pt;font-weight:700;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:3px;margin-bottom:4px;}
.linha{border-bottom:1px solid #bbb;height:10mm;margin-bottom:0;}

/* ── CABEÇALHO DE CONTINUAÇÃO ── */
.cont-header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1.5px solid #000;padding-bottom:5px;margin-bottom:6px;position:relative;z-index:1;}
.cont-title{font-size:11pt;font-weight:700;}
.cont-aluno{font-size:9pt;display:flex;align-items:baseline;gap:4px;}
.cont-line{display:inline-block;border-bottom:1px solid #999;vertical-align:baseline;}

/* ── PAGE BREAK ── */
.page-break{page-break-before:always;}

/* ── RODAPÉ ── */
.rodape{
  position:fixed;bottom:0;left:0;right:0;
  border-top:1px solid #ccc;padding:3px 12mm;
  font-size:8pt;color:#666;
  display:flex;justify-content:space-between;align-items:center;
  background:#fff;z-index:10;
}
.codigo-rodape{font-family:'Courier New',monospace;font-size:7.5pt;color:#555;font-weight:700;}

/* ── TOOLBAR ── */
.toolbar{position:sticky;top:0;z-index:999;background:#1e293b;padding:8px 16px;display:flex;align-items:center;gap:12px;}

@media print{
  .toolbar{display:none;}
  .marca-agua{position:fixed;}
  body{background:#fff;}
}
</style>
</head>
<body>

<div class="toolbar">
  <span style="color:#94a3b8;font-size:12px;font-weight:600;">FOLHA DE PROVA A3 — ${cfg.disciplina || ""} · ${folhas.length} cópia(s)</span>
  <button onclick="window.print()" style="margin-left:auto;padding:6px 18px;background:#22c55e;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">🖨️ Imprimir A3</button>
</div>

${copias}

</body>
</html>`;

  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export default function FolhaProva() {
  const { escola: escolaStore, tenantId } = useAuthStore();
  const anoAtual = String(new Date().getFullYear());

  const [escola,      setEscola]      = useState(escolaStore);
  const [gerando,     setGerando]     = useState(false);
  const [turmas,      setTurmas]      = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [numCopias,   setNumCopias]   = useState(1);

  const [cfg, setCfg] = useState({
    disciplina:    "",
    classe:        "",
    turma:         "",
    periodo:       "1º Trimestre",
    data:          hoje,
    duracao:       "120",
    cotacao:       "20",
    professor:     "",
    ano_letivo:    anoAtual,
    instrucoes:    "Leia atentamente as questões antes de responder. Responda com letra legível. É proibido o uso de corretor.",
    questoes:      ["", "", ""],
    num_linhas:    "28",
    num_linhas_p2: "38",
    num_linhas_p3: "38",
    num_linhas_p4: "38",
  });

  useEffect(() => {
    // Busca dados frescos da escola (incluindo logo)
    api.get("/configuracoes/escola")
      .then(r => setEscola(e => ({ ...e, ...r.data })))
      .catch(() => {});
    api.get("/turmas").then(r => setTurmas(r.data.data || r.data)).catch(() => {});
    api.get("/disciplinas").then(r => setDisciplinas(r.data.data || r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const setQuestao = (i, v) => setCfg(c => {
    const q = [...c.questoes]; q[i] = v; return { ...c, questoes: q };
  });
  const addQuestao    = () => setCfg(c => ({ ...c, questoes: [...c.questoes, ""] }));
  const removeQuestao = (i) => setCfg(c => ({ ...c, questoes: c.questoes.filter((_, idx) => idx !== i) }));

  const handleGerar = async () => {
    if (gerando) return;
    setGerando(true);
    const folhas = Array.from({ length: numCopias || 1 }, () => ({
      codigo:      gerarCodigoFolha(),
      disciplina:  cfg.disciplina,
      periodo:     cfg.periodo   || null,
      data_prova:  cfg.data      || null,
      classe:      cfg.classe    || null,
      turma:       cfg.turma     || null,
      professor:   cfg.professor || null,
      ano_letivo:  cfg.ano_letivo || null,
    }));
    try { await api.post("/folhas-prova/registar", { folhas }); } catch (_) { /* imprimir mesmo assim */ }
    gerarFolhaProva(cfg, escola, folhas, tenantId);
    setGerando(false);
  };

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const Field = ({ label, children }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="flex gap-6 h-full -m-6 overflow-hidden">

      {/* ─── Painel esquerdo ─── */}
      <div className="w-80 shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Settings2 size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-700">Configuração da Prova</h2>
        </div>

        <div className="p-4 space-y-4 flex-1">

          <Field label="Disciplina">
            <input list="disc-list" value={cfg.disciplina} onChange={e => set("disciplina", e.target.value)}
              placeholder="Ex: Matemática" className={inp} />
            <datalist id="disc-list">{disciplinas.map(d => <option key={d.id} value={d.nome} />)}</datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Classe">
              <input value={cfg.classe} onChange={e => set("classe", e.target.value)} placeholder="Ex: 10ª" className={inp} />
            </Field>
            <Field label="Turma">
              <input list="turma-list" value={cfg.turma} onChange={e => set("turma", e.target.value)} placeholder="Ex: A" className={inp} />
              <datalist id="turma-list">{turmas.map(t => <option key={t.id} value={t.nome} />)}</datalist>
            </Field>
          </div>

          <Field label="Período / Momento">
            <select value={cfg.periodo} onChange={e => set("periodo", e.target.value)} className={inp}>
              {PERIODOS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" value={cfg.data} onChange={e => set("data", e.target.value)} className={inp} />
            </Field>
            <Field label="Duração (min)">
              <input type="number" value={cfg.duracao} onChange={e => set("duracao", e.target.value)} min="30" step="15" className={inp} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cotação">
              <input type="number" value={cfg.cotacao} onChange={e => set("cotacao", e.target.value)} min="1" className={inp} />
            </Field>
            <Field label="Ano Lectivo">
              <input value={cfg.ano_letivo} onChange={e => set("ano_letivo", e.target.value)} className={inp} />
            </Field>
          </div>

          <Field label="Professor(a)">
            <input value={cfg.professor} onChange={e => set("professor", e.target.value)} placeholder="Nome do docente" className={inp} />
          </Field>

          <Field label="Instruções">
            <textarea value={cfg.instrucoes} onChange={e => set("instrucoes", e.target.value)}
              rows={3} className={`${inp} resize-none`} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Linhas pág. 1">
              <input type="number" value={cfg.num_linhas} onChange={e => set("num_linhas", e.target.value)} min="5" max="50" className={inp} />
            </Field>
            <Field label="Linhas pág. 2">
              <input type="number" value={cfg.num_linhas_p2} onChange={e => set("num_linhas_p2", e.target.value)} min="5" max="60" className={inp} />
            </Field>
            <Field label="Linhas pág. 3">
              <input type="number" value={cfg.num_linhas_p3} onChange={e => set("num_linhas_p3", e.target.value)} min="5" max="60" className={inp} />
            </Field>
            <Field label="Linhas pág. 4">
              <input type="number" value={cfg.num_linhas_p4} onChange={e => set("num_linhas_p4", e.target.value)} min="5" max="60" className={inp} />
            </Field>
          </div>

          {/* Número de cópias */}
          <Field label="Nº de cópias a imprimir">
            <input type="number" value={numCopias} onChange={e => setNumCopias(Math.max(1, Math.min(60, parseInt(e.target.value)||1)))}
              min="1" max="60" className={inp} />
          </Field>

          {/* Questões */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Questões (opcional)</label>
              <button onClick={addQuestao} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Adicionar</button>
            </div>
            <div className="space-y-2">
              {cfg.questoes.map((q, i) => (
                <div key={i} className="flex gap-1 items-start">
                  <span className="w-5 h-5 rounded-full bg-gray-800 text-white text-[10px] flex items-center justify-center mt-2 shrink-0 font-bold">{i+1}</span>
                  <textarea value={q} onChange={e => setQuestao(i, e.target.value)}
                    rows={2} placeholder={`Questão ${i+1}...`} className={`${inp} resize-none flex-1`} />
                  {cfg.questoes.length > 1 && (
                    <button onClick={() => removeQuestao(i)} className="text-red-400 hover:text-red-600 mt-2 text-xs px-1">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleGerar} disabled={gerando}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <Printer size={16} /> {gerando ? "A registar..." : `Gerar ${numCopias > 1 ? `${numCopias} cópias` : "& Imprimir"} A3`}
          </button>
        </div>
      </div>

      {/* ─── Painel direito (prévia) ─── */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 pr-6">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText size={22} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {cfg.disciplina ? `Prova de ${cfg.disciplina}` : "Folha de Prova A3"}
              </h2>
              <p className="text-sm text-slate-400">
                {[cfg.classe, cfg.turma, cfg.periodo, cfg.ano_letivo].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 font-medium uppercase mb-1">Formato</p>
              <p className="font-semibold text-slate-700">A3 · 4 páginas</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 font-medium uppercase mb-1">Cópias</p>
              <p className="font-semibold text-slate-700">{numCopias} cópia{numCopias !== 1 ? "s" : ""} · {numCopias * 4} páginas</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 font-medium uppercase mb-1">Duração / Cotação</p>
              <p className="font-semibold text-slate-700">{cfg.duracao} min · {cfg.cotacao} val.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-400 font-medium uppercase mb-1">Questões</p>
              <p className="font-semibold text-slate-700">{cfg.questoes.filter(q => q.trim()).length} definida(s)</p>
            </div>
          </div>

          {/* Anti-fraude info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={16} className="text-blue-600" />
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Mecanismo Anti-fraude</p>
            </div>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>✓ Código único por folha (12 caracteres)</li>
              <li>✓ QR code com identificação da prova</li>
              <li>✓ Marca de água diagonal em cada página</li>
              <li>✓ Código no rodapé de cada página</li>
              <li>✓ {numCopias} cópia{numCopias !== 1 ? "s" : ""} com código{numCopias !== 1 ? "s" : ""} distintos</li>
            </ul>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 text-sm mb-2">Estrutura da folha</p>
            <p>✓ Cabeçalho com logo · dados da escola · Ministério da Educação</p>
            <p>✓ Título · faixa de informações · campos do aluno</p>
            <p>✓ Grelha de classificação por grupos + assinaturas</p>
            {cfg.instrucoes && <p>✓ Instruções ao aluno</p>}
            {cfg.questoes.some(q => q.trim()) && <p>✓ {cfg.questoes.filter(q => q.trim()).length} questão(ões) impressas</p>}
            <p>✓ {cfg.num_linhas} linhas (pág. 1) · {cfg.num_linhas_p2} (pág. 2) · {cfg.num_linhas_p3} (pág. 3) · {cfg.num_linhas_p4} (pág. 4)</p>
          </div>

          <button onClick={handleGerar} disabled={gerando}
            className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <Printer size={16} /> {gerando ? "A registar..." : `Gerar ${numCopias > 1 ? `${numCopias} cópias` : "& Imprimir"} A3`}
          </button>
        </div>
      </div>
    </div>
  );
}
