import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, CheckCircle, AlertCircle, Printer } from "lucide-react";
import api from "../../services/api";

const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50";

const ESTADOS = [
  { value: "presente",            label: "P",  full: "Presente",            cls: "bg-emerald-500 text-white" },
  { value: "falta_justificada",   label: "FJ", full: "Falta Justificada",   cls: "bg-amber-400 text-white" },
  { value: "falta_injustificada", label: "FI", full: "Falta Injustificada", cls: "bg-red-500 text-white" },
];

function hoje() { return new Date().toISOString().slice(0, 10); }

function printFolha({ turmaLabel, discLabel, data, alunos }) {
  const rows = alunos.map(a => {
    const e = ESTADOS.find(x => x.value === a.estado);
    return `<tr>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${a.ord}</td>
      <td style="border:1px solid #ccc;padding:4px 8px">${a.nome ?? ""}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;color:${
        a.estado === "presente" ? "#059669" : a.estado === "falta_justificada" ? "#d97706" : "#dc2626"
      }">${e?.label ?? "?"}</td>
    </tr>`;
  }).join("");
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Folha de Presenças</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style>
  </head><body>
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <div><h2 style="margin:0">Folha de Presenças</h2>
        <p style="margin:4px 0;color:#555">Turma: <b>${turmaLabel}</b> &nbsp;|&nbsp; Disciplina: <b>${discLabel}</b> &nbsp;|&nbsp; Data: <b>${data}</b></p>
      </div>
      <button onclick="window.print()" style="padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer">Imprimir</button>
    </div>
    <table><thead><tr style="background:#1e293b;color:#fff">
      <th style="border:1px solid #475569;padding:6px;width:40px">Nº</th>
      <th style="border:1px solid #475569;padding:6px;text-align:left">Nome do Aluno</th>
      <th style="border:1px solid #475569;padding:6px;width:60px">Estado</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div style="margin-top:40px;display:flex;justify-content:flex-end">
      <div style="text-align:center"><div style="border-top:1px solid #333;width:200px;margin-top:40px;padding-top:6px">Assinatura do Professor</div></div>
    </div>
  </body></html>`);
  w.document.close();
}

export default function ProfessorPresencas() {
  const [prof,    setProf]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [turmaId, setTurmaId] = useState("");
  const [discId,  setDiscId]  = useState("");
  const [data,    setData]    = useState(hoje());
  const [alunos,  setAlunos]  = useState([]);
  const [draft,   setDraft]   = useState({});
  const [loadingA,setLoadingA]= useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => {
    api.get("/portal/professor/me")
      .then(r => setProf(r.data))
      .finally(() => setLoading(false));
  }, []);

  const discsDaTurma = (() => {
    if (!turmaId || !prof) return [];
    return (prof.turmas ?? []).find(t => String(t.id) === String(turmaId))?.disciplinas ?? [];
  })();

  const turmaLabel = (prof?.turmas ?? []).find(t => String(t.id) === String(turmaId))?.nome ?? "";
  const discLabel  = discsDaTurma.find(d => String(d.id) === String(discId))?.nome ?? "Geral";

  const loadAlunos = useCallback(async () => {
    if (!turmaId || !data) { setAlunos([]); setDraft({}); return; }
    setLoadingA(true); setMsg(null);
    try {
      const { data: res } = await api.get("/presencas", {
        params: { turma_id: turmaId, disciplina_id: discId || undefined, data }
      });
      setAlunos(res.alunos ?? []);
      const d = {};
      (res.alunos ?? []).forEach(a => { d[a.aluno_id] = { estado: a.estado }; });
      setDraft(d);
    } catch { setMsg({ type: "error", text: "Erro ao carregar alunos." }); }
    finally  { setLoadingA(false); }
  }, [turmaId, discId, data]);

  useEffect(() => { loadAlunos(); }, [loadAlunos]);

  const setEstado = (alunoId, estado) =>
    setDraft(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], estado } }));

  const marcarTodos = (estado) =>
    setDraft(prev => Object.fromEntries(alunos.map(a => [a.aluno_id, { estado }])));

  const handleSave = async () => {
    if (!turmaId || !alunos.length) return;
    setSaving(true); setMsg(null);
    try {
      const presencas = alunos.map(a => ({
        aluno_id: a.aluno_id,
        estado:   draft[a.aluno_id]?.estado ?? "presente",
      }));
      const res = await api.post("/presencas/bulk", {
        turma_id: turmaId, disciplina_id: discId || null, data, presencas
      });
      setMsg({ type: "success", text: res.data.message });
    } catch { setMsg({ type: "error", text: "Erro ao guardar." }); }
    finally  { setSaving(false); }
  };

  const totais = { presente: 0, falta_justificada: 0, falta_injustificada: 0 };
  alunos.forEach(a => { const e = draft[a.aluno_id]?.estado ?? "presente"; totais[e] = (totais[e] ?? 0) + 1; });

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Registo de Presenças</h1>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Turma</label>
            <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setDiscId(""); }} className={sel}>
              <option value="">Seleccionar...</option>
              {(prof?.turmas ?? []).map(t => {
                const label = [t.classe?.curso?.nome, t.classe?.nome, t.nome].filter(Boolean).join(" · ");
                return <option key={t.id} value={t.id}>{label}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Disciplina</label>
            <select value={discId} onChange={e => setDiscId(e.target.value)} disabled={!turmaId} className={`${sel} disabled:opacity-50`}>
              <option value="">Geral</option>
              {discsDaTurma.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={sel} />
          </div>
          <div className="flex items-end">
            <button onClick={loadAlunos} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          {msg.text}
        </div>
      )}

      {!turmaId && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Seleccione uma turma para registar presenças.
        </div>
      )}

      {loadingA && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A carregar...</div>}

      {!loadingA && turmaId && alunos.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem alunos nesta turma.</div>
      )}

      {!loadingA && alunos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-slate-700">{alunos.length} alunos</span>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{totais.presente} P</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{totais.falta_justificada} FJ</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{totais.falta_injustificada} FI</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => marcarTodos("presente")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Todos Presentes</button>
              <button onClick={() => printFolha({ turmaLabel, discLabel, data, alunos: alunos.map(a => ({ ...a, estado: draft[a.aluno_id]?.estado ?? "presente" })) })}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                <Printer size={12} /> Imprimir
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-xs font-medium">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 w-12">Nº</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">Nome do Aluno</th>
                <th className="text-center px-5 py-2.5 text-xs font-semibold text-slate-500 w-64">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alunos.map((a, idx) => {
                const estado = draft[a.aluno_id]?.estado ?? "presente";
                return (
                  <tr key={a.aluno_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    <td className="px-5 py-2.5 text-slate-400 font-mono text-xs">{a.ord}</td>
                    <td className="px-5 py-2.5 font-medium text-slate-800">{a.nome}</td>
                    <td className="px-5 py-2.5">
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
          <div className="px-5 py-3 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">P = Presente</span>
            <span className="text-amber-600 font-medium">FJ = Falta Justificada</span>
            <span className="text-red-600 font-medium">FI = Falta Injustificada</span>
          </div>
        </div>
      )}
    </div>
  );
}
