import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, X, Users } from "lucide-react";
import api from "../../services/api";

export default function Turmas() {
  const [turmas, setTurmas]     = useState([]);
  const [cursos, setCursos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome:"", nivel:"", turno:"manha", ano_letivo:"2025-2026", capacidade:"40" });
  const [saving, setSaving] = useState(false);

  // Filtros
  const [busca, setBusca]           = useState("");
  const [filtroAno, setFiltroAno]   = useState("2025-2026");
  const [filtroCurso, setFiltroCurso] = useState("");
  const [filtroTurno, setFiltroTurno] = useState("");
  const [vista, setVista] = useState("cards"); // cards | tabela

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.get("/turmas"),
        api.get("/cursos").catch(() => ({ data: [] })),
      ]);
      setTurmas(tRes.data || []);
      setCursos(cRes.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post("/turmas", form); setShowForm(false); load(); }
    catch {} finally { setSaving(false); }
  };

  const turnoLabel = (t) => {
    const nm = t?.turnoObj?.nome || t?.turno || "—";
    const map = { manha: "🌅 Manhã", tarde: "🌇 Tarde", noite: "🌙 Noite" };
    return map[String(nm).toLowerCase()] || nm;
  };

  const anosLectivos = useMemo(() => {
    const s = new Set(turmas.map(t => t.ano_letivo).filter(Boolean));
    return [...s].sort().reverse();
  }, [turmas]);

  const turnosDistintos = useMemo(() => {
    const s = new Map();
    turmas.forEach(t => {
      const key = String(t?.turnoObj?.nome || t?.turno || "").trim();
      if (key) s.set(key.toLowerCase(), key);
    });
    return [...s.values()];
  }, [turmas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return turmas.filter(t => {
      if (filtroAno   && t.ano_letivo !== filtroAno) return false;
      if (filtroCurso && String(t.classe?.curso?.id) !== String(filtroCurso)) return false;
      if (filtroTurno) {
        const tn = String(t?.turnoObj?.nome || t?.turno || "").toLowerCase();
        if (tn !== filtroTurno.toLowerCase()) return false;
      }
      if (!q) return true;
      return [t.nome, t.classe?.nome, t.classe?.curso?.nome]
        .filter(Boolean).some(x => x.toLowerCase().includes(q));
    }).sort((a, b) => {
      const ca = (a.classe?.curso?.nome || "").localeCompare(b.classe?.curso?.nome || "");
      if (ca) return ca;
      const cl = (a.classe?.nome || "").localeCompare(b.classe?.nome || "");
      if (cl) return cl;
      return (a.nome || "").localeCompare(b.nome || "");
    });
  }, [turmas, busca, filtroAno, filtroCurso, filtroTurno]);

  // Agrupamento para vista de cards: por curso → classe
  const grupos = useMemo(() => {
    const g = {};
    filtradas.forEach(t => {
      const curso = t.classe?.curso?.nome || "Sem curso";
      const classe = t.classe?.nome || "Sem classe";
      if (!g[curso]) g[curso] = {};
      if (!g[curso][classe]) g[curso][classe] = [];
      g[curso][classe].push(t);
    });
    return g;
  }, [filtradas]);

  const totalAlunos = filtradas.reduce((s, t) => s + (t.ocupacao || t.matriculas_count || 0), 0);

  const limparFiltros = () => { setBusca(""); setFiltroAno("2025-2026"); setFiltroCurso(""); setFiltroTurno(""); };
  const filtroAtivo = busca || filtroAno !== "2025-2026" || filtroCurso || filtroTurno;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏫 Turmas</h1>
          <p className="text-xs text-slate-500 mt-1">
            {filtradas.length} de {turmas.length} turmas · {totalAlunos} alunos matriculados
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
            <button onClick={() => setVista("cards")}
              className={`px-3 py-2 text-xs font-medium ${vista === "cards" ? "bg-slate-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              Cards
            </button>
            <button onClick={() => setVista("tabela")}
              className={`px-3 py-2 text-xs font-medium ${vista === "tabela" ? "bg-slate-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              Tabela
            </button>
          </div>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Plus size={16} /> Nova Turma
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por curso, classe ou turma..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-1">Ano:</span>
            {anosLectivos.map(a => {
              const ativo = a === "2025-2026";
              const sel = filtroAno === a;
              return (
                <button key={a} onClick={() => setFiltroAno(sel ? "" : a)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors
                    ${sel
                      ? (ativo ? "bg-emerald-600 text-white border-emerald-600" : "bg-blue-600 text-white border-blue-600")
                      : (ativo ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                    }`}>
                  {a}{ativo && " ★"}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-1">Turno:</span>
            {turnosDistintos.map(t => {
              const sel = filtroTurno.toLowerCase() === t.toLowerCase();
              return (
                <button key={t} onClick={() => setFiltroTurno(sel ? "" : t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors
                    ${sel ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {t}
                </button>
              );
            })}
          </div>

          <select value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)}
            className="ml-auto border border-slate-200 rounded-md px-2 py-1.5 text-xs">
            <option value="">Todos os cursos</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          {filtroAtivo && (
            <button onClick={limparFiltros}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <X size={12} /> limpar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <p className="text-center text-gray-500 py-12">A carregar...</p>
      ) : filtradas.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <p className="text-sm">Nenhuma turma corresponde aos filtros.</p>
          {filtroAtivo && (
            <button onClick={limparFiltros} className="mt-3 text-xs text-blue-600 hover:underline">
              Limpar filtros
            </button>
          )}
        </div>
      ) : vista === "tabela" ? (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Curso</th>
                <th className="text-left px-4 py-2.5">Classe</th>
                <th className="text-left px-4 py-2.5">Turma</th>
                <th className="text-left px-4 py-2.5">Turno</th>
                <th className="text-center px-4 py-2.5">Ano</th>
                <th className="text-center px-4 py-2.5">Alunos</th>
                <th className="text-right px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">{t.classe?.curso?.nome || "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{t.classe?.nome || "—"}</td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{t.nome}</td>
                  <td className="px-4 py-2.5 text-slate-600">{turnoLabel(t)}</td>
                  <td className="px-4 py-2.5 text-center text-xs text-slate-500">{t.ano_letivo}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="text-xs text-slate-600">
                      {t.ocupacao ?? t.matriculas_count ?? 0} / {t.capacidade_efetiva || t.capacidade || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/turmas/${t.id}`} className="text-blue-600 hover:underline text-xs">Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Vista cards agrupada
        <div className="space-y-6">
          {Object.entries(grupos).map(([curso, classes]) => (
            <div key={curso}>
              <h2 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-xs uppercase tracking-wide">{curso}</span>
              </h2>
              {Object.entries(classes).map(([classe, lista]) => (
                <div key={classe} className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-2 ml-1">{classe}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lista.map(t => {
                      const ocupacao = t.ocupacao ?? t.matriculas_count ?? 0;
                      const cap = t.capacidade_efetiva || t.capacidade || 0;
                      const pct = cap ? Math.round(ocupacao / cap * 100) : 0;
                      return (
                        <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-base font-bold text-blue-800">{t.nome}</span>
                            <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{t.ano_letivo}</span>
                          </div>
                          <p className="text-xs text-slate-500">{turnoLabel(t)}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                            <span className="text-xs text-slate-600 inline-flex items-center gap-1">
                              <Users size={12} /> {ocupacao} / {cap || "—"}
                              {cap > 0 && <span className={`ml-1 ${pct >= 100 ? "text-red-500" : pct >= 80 ? "text-amber-500" : "text-emerald-500"}`}>({pct}%)</span>}
                            </span>
                            <Link to={`/turmas/${t.id}`} className="text-blue-600 hover:underline text-xs">Ver →</Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Modal: criar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nova Turma</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}
                  placeholder="Ex: 12ª A"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nível *</label>
                <input required value={form.nivel} onChange={e=>setForm({...form,nivel:e.target.value})}
                  placeholder="Ex: 12ª Classe" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
                  <select value={form.turno} onChange={e=>setForm({...form,turno:e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="manha">Manhã</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano Lectivo *</label>
                  <input required value={form.ano_letivo} onChange={e=>setForm({...form,ano_letivo:e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
                  <input type="number" value={form.capacidade} onChange={e=>setForm({...form,capacidade:e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-800 text-white py-2 rounded-lg disabled:opacity-60">{saving ? "A guardar..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
