import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, Printer, CheckCircle, AlertCircle, ClipboardCheck, BarChart2 } from "lucide-react";
import api from "../../services/api";

const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

const ESTADOS = [
  { value: "presente",           label: "P",   full: "Presente",             cls: "bg-emerald-500 text-white" },
  { value: "falta_justificada",  label: "FJ",  full: "Falta Justificada",    cls: "bg-amber-400 text-white" },
  { value: "falta_injustificada",label: "FI",  full: "Falta Injustificada",  cls: "bg-red-500 text-white" },
];

function estadoCls(v) {
  return ESTADOS.find(e => e.value === v)?.cls ?? "bg-slate-200 text-slate-600";
}
function estadoLabel(v) {
  return ESTADOS.find(e => e.value === v)?.label ?? "?";
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

function printPresencas({ turmas, disciplinas, turmaId, discId, data, alunos, escolaNome, logoUrl }) {
  const turma = turmas.find(t => String(t.id) === String(turmaId))?.nome ?? "";
  const disc  = discId ? (disciplinas.find(d => String(d.id) === String(discId))?.nome ?? "") : "Geral";
  const totPres = alunos.filter(a => a.estado === "presente").length;
  const totFJ   = alunos.filter(a => a.estado === "falta_justificada").length;
  const totFI   = alunos.filter(a => a.estado === "falta_injustificada").length;

  const rows = alunos.map(a => `
    <tr>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${a.ord}</td>
      <td style="border:1px solid #ccc;padding:4px 8px">${a.nome ?? ""}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;color:${
        a.estado === "presente" ? "#059669" : a.estado === "falta_justificada" ? "#d97706" : "#dc2626"
      }">${estadoLabel(a.estado)}</td>
      <td style="border:1px solid #ccc;padding:4px 8px">${a.observacao ?? ""}</td>
    </tr>`).join("");
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px" onerror="this.style.display='none'">` : "";

  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Folha de Presenças</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}h2{margin:0}table{border-collapse:collapse;width:100%}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
    .stats{display:flex;gap:16px;margin-bottom:12px;font-size:11px}
    @media print{button{display:none}}</style>
  </head><body>
    <div class="hdr">
      <div style="display:flex;align-items:center">
        ${logoHtml}
        <div>
          ${escolaNome ? `<p style="margin:0 0 2px;font-weight:bold;font-size:13px">${escolaNome}</p>` : ""}
          <h2>Folha de Presenças</h2>
          <p style="margin:4px 0;color:#555">Turma: <b>${turma}</b> &nbsp;|&nbsp; Disciplina: <b>${disc}</b> &nbsp;|&nbsp; Data: <b>${data}</b></p>
        </div>
      </div>
      <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer">Imprimir</button>
    </div>
    <div class="stats">
      <span style="color:#059669">✔ Presentes: <b>${totPres}</b></span>
      <span style="color:#d97706">FJ: <b>${totFJ}</b></span>
      <span style="color:#dc2626">FI: <b>${totFI}</b></span>
      <span>Total: <b>${alunos.length}</b></span>
    </div>
    <table>
      <thead><tr style="background:#1e293b;color:#fff">
        <th style="border:1px solid #475569;padding:6px;width:40px">Nº</th>
        <th style="border:1px solid #475569;padding:6px;text-align:left">Nome do Aluno</th>
        <th style="border:1px solid #475569;padding:6px;width:50px">Estado</th>
        <th style="border:1px solid #475569;padding:6px;text-align:left">Observação</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:40px;display:flex;justify-content:flex-end">
      <div style="text-align:center">
        <div style="border-top:1px solid #333;width:200px;margin-top:40px;padding-top:6px">Assinatura do Professor</div>
      </div>
    </div>
  </body></html>`);
  w.document.close();
}

function printRelatorio({ turmas, disciplinas, turmaId, discId, dataInicio, dataFim, alunos, escolaNome, logoUrl }) {
  const turma = turmas.find(t => String(t.id) === String(turmaId))?.nome ?? "";
  const disc  = discId ? (disciplinas.find(d => String(d.id) === String(discId))?.nome ?? "Todas") : "Todas";
  const rows = alunos.map(a => `
    <tr>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${a.ord}</td>
      <td style="border:1px solid #ccc;padding:4px 8px">${a.nome ?? ""}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${a.total_aulas}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#059669">${a.presentes}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#d97706">${a.faltas_just}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#dc2626">${a.faltas_injust}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;color:${(a.percentagem??0)>=75?"#059669":"#dc2626"}">${a.percentagem != null ? a.percentagem + "%" : "—"}</td>
    </tr>`).join("");
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px" onerror="this.style.display='none'">` : "";

  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Relatório de Assiduidade</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}table{border-collapse:collapse;width:100%}
    @media print{button{display:none}}</style>
  </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div style="display:flex;align-items:center">
        ${logoHtml}
        <div>
          ${escolaNome ? `<p style="margin:0 0 2px;font-weight:bold;font-size:13px">${escolaNome}</p>` : ""}
          <h2 style="margin:0">Relatório de Assiduidade</h2>
          <p style="margin:4px 0;color:#555">Turma: <b>${turma}</b> &nbsp;|&nbsp; Disciplina: <b>${disc}</b> &nbsp;|&nbsp; Período: <b>${dataInicio}</b> a <b>${dataFim}</b></p>
        </div>
      </div>
      <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer">Imprimir</button>
    </div>
    <table>
      <thead><tr style="background:#1e293b;color:#fff">
        <th style="border:1px solid #475569;padding:6px;width:40px">Nº</th>
        <th style="border:1px solid #475569;padding:6px;text-align:left">Nome</th>
        <th style="border:1px solid #475569;padding:6px">Total</th>
        <th style="border:1px solid #475569;padding:6px;color:#6ee7b7">Pres.</th>
        <th style="border:1px solid #475569;padding:6px;color:#fcd34d">FJ</th>
        <th style="border:1px solid #475569;padding:6px;color:#fca5a5">FI</th>
        <th style="border:1px solid #475569;padding:6px">%</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:8px;font-size:11px;color:#666">FJ = Falta Justificada &nbsp;|&nbsp; FI = Falta Injustificada &nbsp;|&nbsp; % = Taxa de Presença</p>
  </body></html>`);
  w.document.close();
}

/* ── TAB A: Registo Diário ── */
/* Cascade Curso → Classe → Turno → Turma — reutilizável */
function CascadaTurma({ turmaId, setTurmaId }) {
  const [cursos,  setCursos]  = useState([]);
  const [turnos,  setTurnos]  = useState([]);
  const [classes, setClasses] = useState([]);
  const [turmas,  setTurmas]  = useState([]);
  const [cursoSel,  setCursoSel]  = useState("");
  const [classeSel, setClasseSel] = useState("");
  const [turnoSel,  setTurnoSel]  = useState("");

  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {});
    api.get("/turnos").then(r => setTurnos(r.data.data || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setClasseSel(""); setTurmaId(""); setClasses([]); setTurmas([]);
    if (!cursoSel) return;
    api.get(`/classes?curso_id=${cursoSel}`).then(r => setClasses(r.data)).catch(() => {});
  }, [cursoSel]);

  useEffect(() => {
    setTurmaId("");
    if (!classeSel) { setTurmas([]); return; }
    const params = new URLSearchParams({ classe_id: classeSel });
    if (turnoSel) params.append("turno_id", turnoSel);
    api.get(`/turmas?${params}`).then(r => setTurmas(r.data)).catch(() => {});
  }, [classeSel, turnoSel]);

  return (
    <>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Curso *</label>
        <select value={cursoSel} onChange={e => setCursoSel(e.target.value)} className={sel}>
          <option value="">Seleccionar...</option>
          {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Classe *</label>
        <select value={classeSel} onChange={e => setClasseSel(e.target.value)} disabled={!cursoSel} className={`${sel} disabled:opacity-50`}>
          <option value="">{cursoSel ? "Seleccionar..." : "← Curso"}</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Turno</label>
        <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)} disabled={!classeSel} className={`${sel} disabled:opacity-50`}>
          <option value="">Todos</option>
          {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Turma *</label>
        <select value={turmaId} onChange={e => setTurmaId(e.target.value)} disabled={!classeSel} className={`${sel} disabled:opacity-50`}>
          <option value="">{classeSel ? (turmas.length ? "Seleccionar..." : "Sem turmas") : "← Classe"}</option>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}{t.turnoObj ? ` · ${t.turnoObj.nome}` : ""}</option>)}
        </select>
      </div>
    </>
  );
}

function RegistoDiario({ turmas, disciplinas, escolaNome, logoUrl }) {
  const [turmaId, setTurmaId] = useState("");
  const [discId,  setDiscId]  = useState("");
  const [data,    setData]    = useState(hoje());
  const [alunos,  setAlunos]  = useState([]);
  const [draft,   setDraft]   = useState({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  const load = useCallback(async () => {
    if (!turmaId || !data) { setAlunos([]); setDraft({}); return; }
    setLoading(true); setMsg(null);
    try {
      const { data: res } = await api.get("/presencas", { params: { turma_id: turmaId, disciplina_id: discId || undefined, data } });
      setAlunos(res.alunos ?? []);
      const d = {};
      (res.alunos ?? []).forEach(a => { d[a.aluno_id] = { estado: a.estado, observacao: a.observacao }; });
      setDraft(d);
    } catch { setMsg({ type: "error", text: "Erro ao carregar alunos." }); }
    finally  { setLoading(false); }
  }, [turmaId, discId, data]);

  useEffect(() => { load(); }, [load]);

  const setEstado = (alunoId, estado) =>
    setDraft(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], estado } }));

  const marcarTodos = (estado) =>
    setDraft(prev => Object.fromEntries(alunos.map(a => [a.aluno_id, { ...prev[a.aluno_id], estado }])));

  const handleSave = async () => {
    if (!turmaId || !alunos.length) return;
    setSaving(true); setMsg(null);
    try {
      const presencas = alunos.map(a => ({
        aluno_id:   a.aluno_id,
        estado:     draft[a.aluno_id]?.estado ?? "presente",
        observacao: draft[a.aluno_id]?.observacao ?? "",
      }));
      const res = await api.post("/presencas/bulk", { turma_id: turmaId, disciplina_id: discId || null, data, presencas });
      setMsg({ type: "success", text: res.data.message });
    } catch { setMsg({ type: "error", text: "Erro ao guardar presenças." }); }
    finally  { setSaving(false); }
  };

  const totais = { presente: 0, falta_justificada: 0, falta_injustificada: 0 };
  alunos.forEach(a => { const e = draft[a.aluno_id]?.estado ?? "presente"; totais[e] = (totais[e] ?? 0) + 1; });

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <CascadaTurma turmaId={turmaId} setTurmaId={(id) => { setTurmaId(id); setDiscId(""); }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Disciplina (opcional)</label>
            <select value={discId} onChange={e => setDiscId(e.target.value)} disabled={!turmaId} className={`${sel} disabled:opacity-50`}>
              <option value="">Geral (sem disciplina)</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data *</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={sel} />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {!turmaId && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Seleccione uma turma para registar presenças.
        </div>
      )}

      {loading && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A carregar...</div>}

      {!loading && turmaId && alunos.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem alunos nesta turma.</div>
      )}

      {!loading && alunos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-slate-700">{alunos.length} alunos</span>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{totais.presente} Pres.</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{totais.falta_justificada} FJ</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{totais.falta_injustificada} FI</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => marcarTodos("presente")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Todos Presentes</button>
              <button onClick={() => printPresencas({ turmas, disciplinas, turmaId, discId, data, alunos: alunos.map(a => ({ ...a, ...draft[a.aluno_id] })), escolaNome, logoUrl })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <Printer size={12} /> Imprimir
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-12">Nº</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Nome do Aluno</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 w-64">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alunos.map((a, idx) => {
                  const estado = draft[a.aluno_id]?.estado ?? "presente";
                  return (
                    <tr key={a.aluno_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{a.ord}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{a.nome}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 justify-center">
                          {ESTADOS.map(e => (
                            <button key={e.value} onClick={() => setEstado(a.aluno_id, e.value)}
                              title={e.full}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                estado === e.value ? e.cls + " shadow-sm" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                              }`}>
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">P = Presente</span>
            <span className="text-amber-600 font-medium">FJ = Falta Justificada</span>
            <span className="text-red-600 font-medium">FI = Falta Injustificada</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── TAB B: Relatório ── */
function Relatorio({ turmas, disciplinas, escolaNome, logoUrl }) {
  const [turmaId,    setTurmaId]    = useState("");
  const [discId,     setDiscId]     = useState("");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(hoje());
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  const load = async () => {
    if (!turmaId) return;
    setLoading(true); setMsg(null); setDados(null);
    try {
      const { data } = await api.get("/presencas/relatorio", {
        params: { turma_id: turmaId, disciplina_id: discId || undefined, data_inicio: dataInicio, data_fim: dataFim }
      });
      setDados(data);
    } catch { setMsg({ type: "error", text: "Erro ao gerar relatório." }); }
    finally  { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <CascadaTurma turmaId={turmaId} setTurmaId={(id) => { setTurmaId(id); setDiscId(""); }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Disciplina</label>
            <select value={discId} onChange={e => setDiscId(e.target.value)} disabled={!turmaId} className={`${sel} disabled:opacity-50`}>
              <option value="">Todas</option>
              {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={sel} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={sel} />
          </div>
          <div className="flex items-end">
            <button onClick={load} disabled={!turmaId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              Gerar
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl border bg-red-50 text-red-700 border-red-200">
          <AlertCircle size={15} /> {msg.text}
        </div>
      )}

      {loading && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A gerar relatório...</div>}

      {dados && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{dados.alunos.length} alunos · {dados.data_inicio} a {dados.data_fim}</p>
            <button onClick={() => printRelatorio({ turmas, disciplinas, turmaId, discId, dataInicio, dataFim, alunos: dados.alunos, escolaNome, logoUrl })}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors">
              <Printer size={14} /> Imprimir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-10">Nº</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">Nome do Aluno</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-16">Total</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-16 text-emerald-300">Pres.</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-14 text-amber-300">FJ</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-14 text-red-300">FI</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-16">%</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-24">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dados.alunos.map((a, idx) => {
                  const pct = a.percentagem;
                  const ok  = pct == null || pct >= 75;
                  return (
                    <tr key={a.aluno_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-3 py-2 text-slate-400 font-mono text-xs">{a.ord}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{a.nome}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{a.total_aulas}</td>
                      <td className="px-3 py-2 text-center font-semibold text-emerald-600">{a.presentes}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{a.faltas_just}</td>
                      <td className="px-3 py-2 text-center text-red-600">{a.faltas_injust}</td>
                      <td className={`px-3 py-2 text-center font-bold ${pct == null ? "text-slate-300" : ok ? "text-emerald-600" : "text-red-600"}`}>
                        {pct != null ? pct + "%" : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {pct != null
                          ? <span className={`text-xs font-semibold ${ok ? "text-emerald-600" : "text-red-600"}`}>{ok ? "Regular" : "Em Risco"}</span>
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            % ≥ 75 = Regular &nbsp;|&nbsp; % &lt; 75 = Em Risco de Exclusão
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PÁGINA PRINCIPAL ── */
export default function Presencas() {
  const [tab,        setTab]        = useState("registo");
  const [turmas,     setTurmas]     = useState([]);
  const [disciplinas,setDisciplinas]= useState([]);
  const [escola,     setEscola]     = useState(null);

  useEffect(() => {
    api.get("/turmas").then(r => setTurmas(r.data));
    api.get("/disciplinas").then(r => setDisciplinas(r.data?.data ?? r.data ?? []));
    api.get("/configuracoes/escola").then(r => setEscola(r.data)).catch(() => {});
  }, []);

  const escolaNome = escola?.nome ?? null;
  const logoUrl    = escola?.logo ? `/storage/${escola.logo}` : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Presenças & Assiduidade</h1>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
          <button onClick={() => setTab("registo")}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${tab === "registo" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <ClipboardCheck size={14} /> Registo Diário
          </button>
          <button onClick={() => setTab("relatorio")}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${tab === "relatorio" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <BarChart2 size={14} /> Relatório
          </button>
        </div>
      </div>

      {tab === "registo"
        ? <RegistoDiario turmas={turmas} disciplinas={disciplinas} escolaNome={escolaNome} logoUrl={logoUrl} />
        : <Relatorio     turmas={turmas} disciplinas={disciplinas} escolaNome={escolaNome} logoUrl={logoUrl} />
      }
    </div>
  );
}
