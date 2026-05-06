import { useState, useEffect, useMemo } from "react";
import { LogIn, LogOut, ChevronLeft, ChevronRight, Plus, X, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../../services/api";

const meses = ["", "Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const ESTADOS = [
  { v: "presente",          l: "Presente",         cls: "bg-emerald-500 text-white",  short: "P" },
  { v: "atrasado",          l: "Atrasado",         cls: "bg-amber-500 text-white",    short: "A" },
  { v: "ausente",           l: "Ausente",          cls: "bg-red-500 text-white",      short: "F" },
  { v: "falta_justificada", l: "Falta justificada",cls: "bg-blue-500 text-white",     short: "FJ" },
  { v: "ferias",            l: "Férias",           cls: "bg-purple-500 text-white",   short: "Fe" },
  { v: "baixa_medica",      l: "Baixa médica",     cls: "bg-pink-500 text-white",     short: "BM" },
  { v: "folga",             l: "Folga",            cls: "bg-slate-400 text-white",    short: "Fg" },
];
const estadoCfg = (v) => ESTADOS.find(e => e.v === v);

export default function PresencasFuncionarios() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const [grelha, setGrelha]     = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [editando, setEditando] = useState(null); // {funcionario, dia, presenca?}
  const [form, setForm]         = useState({ estado: "presente", entrada: "", saida: "", justificacao: "", observacao: "" });
  const [saving, setSaving]     = useState(false);

  const [clockMsg, setClockMsg] = useState(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [gRes, dRes, fRes] = await Promise.all([
        api.get(`/presencas-funcionarios/grelha-mes?mes=${mes}&ano=${ano}`),
        api.get(`/presencas-funcionarios/dashboard?mes=${mes}&ano=${ano}`),
        api.get("/funcionarios?per_page=500"),
      ]);
      setGrelha(gRes.data);
      setDashboard(dRes.data);
      setFuncionarios(fRes.data.data || fRes.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, [mes, ano]);

  const proxMes = () => { if (mes === 12) { setMes(1); setAno(ano + 1); } else setMes(mes + 1); };
  const antMes  = () => { if (mes === 1)  { setMes(12); setAno(ano - 1); } else setMes(mes - 1); };

  const clock = async (funcionario_id, tipo) => {
    try {
      const r = await api.post(`/presencas-funcionarios/clock-${tipo}`, { funcionario_id });
      setClockMsg({ type: "ok", text: r.data.message });
      carregar();
    } catch (e) {
      setClockMsg({ type: "err", text: e.response?.data?.message || "Erro." });
    }
    setTimeout(() => setClockMsg(null), 3500);
  };

  const abrirEditar = (func, dia, presenca = null) => {
    setEditando({ funcionario: func, dia, presenca });
    if (presenca) {
      setForm({
        estado: presenca.estado,
        entrada: (presenca.entrada || "").slice(0, 5),
        saida:   (presenca.saida   || "").slice(0, 5),
        justificacao: presenca.justificacao || "",
        observacao:   presenca.observacao   || "",
      });
    } else {
      setForm({ estado: "presente", entrada: "", saida: "", justificacao: "", observacao: "" });
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!editando) return;
    setSaving(true);
    try {
      const data = {
        funcionario_id: editando.funcionario.id,
        data: `${ano}-${String(mes).padStart(2, "0")}-${String(editando.dia).padStart(2, "0")}`,
        estado: form.estado,
        entrada: form.entrada || null,
        saida:   form.saida   || null,
        justificacao: form.justificacao || null,
        observacao:   form.observacao   || null,
      };
      if (editando.presenca) {
        await api.put(`/presencas-funcionarios/${editando.presenca.id}`, data);
      } else {
        await api.post("/presencas-funcionarios", data);
      }
      setEditando(null);
      carregar();
    } catch (e) {
      alert(e.response?.data?.message || "Erro a guardar.");
    } finally { setSaving(false); }
  };

  const apagar = async () => {
    if (!editando?.presenca) return;
    if (!confirm("Eliminar este registo de presença?")) return;
    await api.delete(`/presencas-funcionarios/${editando.presenca.id}`);
    setEditando(null);
    carregar();
  };

  const dias = useMemo(() => Array.from({ length: grelha?.dias_no_mes || 0 }, (_, i) => i + 1), [grelha]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📋 Presenças — Funcionários</h1>
          <p className="text-xs text-slate-500 mt-1">Registo diário de entrada, saída e estado.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={antMes} className="border border-slate-200 rounded-md p-1.5 hover:bg-slate-50">
            <ChevronLeft size={16}/>
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
            {meses[mes]} {ano}
          </span>
          <button onClick={proxMes} className="border border-slate-200 rounded-md p-1.5 hover:bg-slate-50">
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      {/* KPIs */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Presentes hoje"   v={dashboard.hoje.presentes}   tot={dashboard.hoje.total_activos} cor="bg-emerald-50 text-emerald-700" />
          <Stat label="Atrasados hoje"   v={dashboard.hoje.atrasados}   cor="bg-amber-50 text-amber-700" />
          <Stat label="Ausentes hoje"    v={dashboard.hoje.ausentes}    cor="bg-red-50 text-red-700" />
          <Stat label="Sem registo hoje" v={dashboard.hoje.sem_registo} cor="bg-slate-100 text-slate-600" />
        </div>
      )}

      {/* Clock-in/out rápido */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Marcação rápida (hoje)</h2>
        <div className="flex flex-wrap gap-2">
          <ClockSelector funcionarios={funcionarios} onClock={clock} />
          {clockMsg && (
            <span className={`text-xs px-3 py-1.5 rounded-md inline-flex items-center gap-1
              ${clockMsg.type === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {clockMsg.type === "ok" ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
              {clockMsg.text}
            </span>
          )}
        </div>
      </div>

      {/* Grelha mensal */}
      {loading ? (
        <p className="text-center text-slate-400 py-12">A carregar...</p>
      ) : grelha?.funcionarios?.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <p className="text-sm">Nenhum funcionário activo.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 sticky left-0 bg-slate-50 font-medium text-slate-500 uppercase z-10 min-w-[180px]">Funcionário</th>
                  {dias.map(d => (
                    <th key={d} className="px-1 py-2 text-center font-medium text-slate-500 min-w-[28px]">{d}</th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium text-slate-500 min-w-[60px]">Horas</th>
                  <th className="px-2 py-2 text-center font-medium text-red-500" title="Faltas">F</th>
                  <th className="px-2 py-2 text-center font-medium text-amber-600" title="Atrasos">A</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {grelha.funcionarios.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 sticky left-0 bg-white font-medium text-slate-800 z-10">
                      <div className="text-sm">{f.nome}</div>
                      <div className="text-[10px] text-slate-500">{f.cargo}</div>
                    </td>
                    {dias.map(d => {
                      const p = f.dias[d];
                      const cfg = p ? estadoCfg(p.estado) : null;
                      return (
                        <td key={d} className="text-center p-0">
                          <button onClick={() => abrirEditar(f, d, p)}
                            title={p ? `${cfg?.l || p.estado}${p.entrada ? ` · ${p.entrada}-${p.saida || "?"}` : ""}` : "Sem registo (clica para adicionar)"}
                            className={`w-7 h-7 m-0.5 rounded text-[10px] font-bold transition-colors
                              ${p ? cfg?.cls + " hover:opacity-80" : "border border-dashed border-slate-200 text-slate-300 hover:bg-slate-100 hover:border-slate-300"}`}>
                            {p ? cfg?.short : ""}
                          </button>
                        </td>
                      );
                    })}
                    <td className="text-center font-mono text-xs text-slate-700">{Number(f.totais.horas || 0).toFixed(1)}h</td>
                    <td className="text-center font-bold text-red-500">{f.totais.faltas || 0}</td>
                    <td className="text-center font-bold text-amber-600">{f.totais.atrasos || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legenda */}
          <div className="border-t border-slate-100 px-4 py-3 flex flex-wrap gap-2">
            {ESTADOS.map(e => (
              <span key={e.v} className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                <span className={`w-4 h-4 rounded text-[9px] font-bold inline-flex items-center justify-center ${e.cls}`}>{e.short}</span>
                {e.l}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Modal editar/criar registo */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold">{editando.presenca ? "Editar" : "Registar"} presença</h2>
              <p className="text-xs text-slate-500 mt-1">
                {editando.funcionario.nome} — <strong>{editando.dia}/{String(mes).padStart(2,"0")}/{ano}</strong>
              </p>
            </div>
            <form onSubmit={guardar} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
                <select required value={form.estado}
                  onChange={e => setForm({...form, estado: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
                </select>
              </div>
              {(form.estado === "presente" || form.estado === "atrasado") && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Entrada</label>
                    <input type="time" value={form.entrada}
                      onChange={e => setForm({...form, entrada: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Saída</label>
                    <input type="time" value={form.saida}
                      onChange={e => setForm({...form, saida: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              )}
              {(form.estado === "falta_justificada" || form.estado === "baixa_medica") && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Justificação *</label>
                  <textarea required={form.estado === "falta_justificada" || form.estado === "baixa_medica"}
                    rows="2" value={form.justificacao}
                    onChange={e => setForm({...form, justificacao: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
                <input value={form.observacao}
                  onChange={e => setForm({...form, observacao: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                {editando.presenca && (
                  <button type="button" onClick={apagar}
                    className="text-xs text-red-600 hover:underline mr-auto">
                    Eliminar
                  </button>
                )}
                <button type="button" onClick={() => setEditando(null)}
                  className="border border-slate-300 text-slate-700 py-2 px-4 rounded-lg text-sm hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
                  {saving ? "..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, v, tot, cor }) {
  return (
    <div className={`${cor} rounded-2xl p-4`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {v}{tot != null && <span className="text-base font-normal opacity-70"> / {tot}</span>}
      </p>
    </div>
  );
}

function ClockSelector({ funcionarios, onClock }) {
  const [sel, setSel] = useState("");
  return (
    <>
      <select value={sel} onChange={e => setSel(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px]">
        <option value="">— Escolhe funcionário —</option>
        {funcionarios.filter(f => f.estado === "activo").map(f => (
          <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>
        ))}
      </select>
      <button onClick={() => sel && onClock(sel, "in")}
        disabled={!sel}
        className="bg-emerald-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-emerald-500 disabled:opacity-50 inline-flex items-center gap-1">
        <LogIn size={14}/> Entrada
      </button>
      <button onClick={() => sel && onClock(sel, "out")}
        disabled={!sel}
        className="bg-amber-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-amber-500 disabled:opacity-50 inline-flex items-center gap-1">
        <LogOut size={14}/> Saída
      </button>
    </>
  );
}
