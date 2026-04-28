import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, Printer, CheckCircle, AlertCircle, ClipboardCheck, BarChart2 } from "lucide-react";
import api from "../../services/api";

const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

const ESTADOS = [
  { value: "presente",            label: "P",  full: "Presente",            cls: "bg-emerald-500 text-white" },
  { value: "falta_justificada",   label: "FJ", full: "Falta Justificada",   cls: "bg-amber-400 text-white" },
  { value: "falta_injustificada", label: "FI", full: "Falta Injustificada", cls: "bg-red-500 text-white" },
];

function hoje() { return new Date().toISOString().slice(0, 10); }

function printRelatorio({ dataInicio, dataFim, professores, escolaNome, logoUrl }) {
  const rows = professores.map(p => `
    <tr>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${p.ord}</td>
      <td style="border:1px solid #ccc;padding:4px 8px">${p.nome ?? ""}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${p.numero ?? ""}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${p.total_dias}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#059669">${p.presentes}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#d97706">${p.faltas_just}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;color:#dc2626">${p.faltas_injust}</td>
      <td style="border:1px solid #ccc;padding:4px 8px;text-align:center;font-weight:bold;color:${(p.percentagem??100)>=90?"#059669":"#dc2626"}">${p.percentagem != null ? p.percentagem + "%" : "—"}</td>
    </tr>`).join("");
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px" onerror="this.style.display='none'">` : "";

  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Relatório de Presenças — Professores</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style>
  </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div style="display:flex;align-items:center">
        ${logoHtml}
        <div>
          ${escolaNome ? `<p style="margin:0 0 2px;font-weight:bold;font-size:13px">${escolaNome}</p>` : ""}
          <h2 style="margin:0">Relatório de Presenças — Professores</h2>
          <p style="margin:4px 0;color:#555">Período: <b>${dataInicio}</b> a <b>${dataFim}</b></p>
        </div>
      </div>
      <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer">Imprimir</button>
    </div>
    <table>
      <thead><tr style="background:#1e293b;color:#fff">
        <th style="border:1px solid #475569;padding:6px;width:40px">Nº</th>
        <th style="border:1px solid #475569;padding:6px;text-align:left">Professor</th>
        <th style="border:1px solid #475569;padding:6px">Nº Prof.</th>
        <th style="border:1px solid #475569;padding:6px">Dias Reg.</th>
        <th style="border:1px solid #475569;padding:6px;color:#6ee7b7">Pres.</th>
        <th style="border:1px solid #475569;padding:6px;color:#fcd34d">FJ</th>
        <th style="border:1px solid #475569;padding:6px;color:#fca5a5">FI</th>
        <th style="border:1px solid #475569;padding:6px">%</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`);
  w.document.close();
}

/* ── TAB A: Registo Diário ── */
function RegistoDiario() {
  const [data,    setData]    = useState(hoje());
  const [profs,   setProfs]   = useState([]);
  const [draft,   setDraft]   = useState({});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  const load = useCallback(async () => {
    if (!data) return;
    setLoading(true); setMsg(null);
    try {
      const { data: res } = await api.get("/presencas/professores", { params: { data } });
      setProfs(res.professores ?? []);
      const d = {};
      (res.professores ?? []).forEach(p => { d[p.professor_id] = { estado: p.estado, observacao: p.observacao }; });
      setDraft(d);
    } catch { setMsg({ type: "error", text: "Erro ao carregar professores." }); }
    finally  { setLoading(false); }
  }, [data]);

  useEffect(() => { load(); }, [load]);

  const setEstado = (profId, estado) =>
    setDraft(prev => ({ ...prev, [profId]: { ...prev[profId], estado } }));

  const marcarTodos = (estado) =>
    setDraft(prev => Object.fromEntries(profs.map(p => [p.professor_id, { ...prev[p.professor_id], estado }])));

  const handleSave = async () => {
    if (!profs.length) return;
    setSaving(true); setMsg(null);
    try {
      const presencas = profs.map(p => ({
        professor_id: p.professor_id,
        estado:       draft[p.professor_id]?.estado ?? "presente",
        observacao:   draft[p.professor_id]?.observacao ?? "",
      }));
      const res = await api.post("/presencas/professores/bulk", { data, presencas });
      setMsg({ type: "success", text: res.data.message });
    } catch { setMsg({ type: "error", text: "Erro ao guardar presenças." }); }
    finally  { setSaving(false); }
  };

  const totais = { presente: 0, falta_justificada: 0, falta_injustificada: 0 };
  profs.forEach(p => { const e = draft[p.professor_id]?.estado ?? "presente"; totais[e] = (totais[e] ?? 0) + 1; });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data *</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className={sel} />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
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

      {loading && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A carregar...</div>}

      {!loading && profs.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem professores registados.</div>
      )}

      {!loading && profs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-sm font-medium text-slate-700">{profs.length} professores</span>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">{totais.presente} Pres.</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{totais.falta_justificada} FJ</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{totais.falta_injustificada} FI</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => marcarTodos("presente")} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Todos Presentes</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-1.5 rounded-lg text-xs font-medium">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-10">Nº</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Professor</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-28">Nº Prof.</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 w-64">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {profs.map((p, idx) => {
                  const estado = draft[p.professor_id]?.estado ?? "presente";
                  return (
                    <tr key={p.professor_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{p.ord}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{p.nome}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs font-mono">{p.numero}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 justify-center">
                          {ESTADOS.map(e => (
                            <button key={e.value} onClick={() => setEstado(p.professor_id, e.value)}
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
        </div>
      )}
    </div>
  );
}

/* ── TAB B: Relatório ── */
function Relatorio({ escolaNome, logoUrl }) {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [dataFim, setDataFim] = useState(hoje());
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  const load = async () => {
    setLoading(true); setMsg(null); setDados(null);
    try {
      const { data } = await api.get("/presencas/professores/relatorio", {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setDados(data);
    } catch { setMsg({ type: "error", text: "Erro ao gerar relatório." }); }
    finally  { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={sel} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={sel} />
          </div>
          <div className="flex items-end">
            <button onClick={load} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">Gerar</button>
          </div>
        </div>
      </div>

      {msg && <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl border bg-red-50 text-red-700 border-red-200"><AlertCircle size={15}/>{msg.text}</div>}
      {loading && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A gerar relatório...</div>}

      {dados && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{dados.professores.length} professores · {dados.data_inicio} a {dados.data_fim}</p>
            <button onClick={() => printRelatorio({ dataInicio, dataFim, professores: dados.professores, escolaNome, logoUrl })}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-xl text-sm font-medium">
              <Printer size={14} /> Imprimir
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-10">Nº</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold">Professor</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-24">Nº Prof.</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-16">Dias Reg.</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-16 text-emerald-300">Pres.</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-12 text-amber-300">FJ</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-12 text-red-300">FI</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold w-16">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dados.professores.map((p, idx) => {
                  const pct = p.percentagem;
                  const ok  = pct == null || pct >= 90;
                  return (
                    <tr key={p.professor_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                      <td className="px-3 py-2 text-slate-400 font-mono text-xs">{p.ord}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{p.nome}</td>
                      <td className="px-3 py-2 text-center text-slate-500 font-mono text-xs">{p.numero}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{p.total_dias}</td>
                      <td className="px-3 py-2 text-center font-semibold text-emerald-600">{p.presentes}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{p.faltas_just}</td>
                      <td className="px-3 py-2 text-center text-red-600">{p.faltas_injust}</td>
                      <td className={`px-3 py-2 text-center font-bold ${pct == null ? "text-slate-300" : ok ? "text-emerald-600" : "text-red-600"}`}>
                        {pct != null ? pct + "%" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PresencasProfessores() {
  const [tab,    setTab]    = useState("registo");
  const [escola, setEscola] = useState(null);

  useEffect(() => {
    api.get("/configuracoes/escola").then(r => setEscola(r.data)).catch(() => {});
  }, []);

  const escolaNome = escola?.nome ?? null;
  const logoUrl    = escola?.logo ? `/storage/${escola.logo}` : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Presenças — Professores</h1>
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
      {tab === "registo" ? <RegistoDiario /> : <Relatorio escolaNome={escolaNome} logoUrl={logoUrl} />}
    </div>
  );
}
