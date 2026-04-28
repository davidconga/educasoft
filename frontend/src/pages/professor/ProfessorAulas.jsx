import { useState, useEffect } from "react";
import { Plus, Video, ExternalLink, X, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../services/api";

const STATUS_COLOR = { agendada:"bg-blue-50 text-blue-700", em_curso:"bg-emerald-50 text-emerald-700", concluida:"bg-slate-100 text-slate-500", cancelada:"bg-red-50 text-red-600" };
const STATUS_LABEL = { agendada:"Agendada", em_curso:"Em Curso", concluida:"Concluída", cancelada:"Cancelada" };
const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50";

export default function ProfessorAulas() {
  const [prof,     setProf]     = useState(null);
  const [aulas,    setAulas]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [form,     setForm]     = useState({ turma_id:"", disciplina_id:"", titulo:"", descricao:"", data_inicio:"", data_fim:"" });

  const load = () => {
    Promise.all([
      api.get("/portal/professor/me"),
      api.get("/aulas-remotas?per_page=50"),
    ]).then(([rP, rA]) => {
      setProf(rP.data);
      setAulas(rA.data?.data ?? rA.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const discsDaTurma = (prof?.disciplinas ?? []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      await api.post("/aulas-remotas", {
        ...form,
        professor_id: prof?.id,
        turma_id:     Number(form.turma_id),
        disciplina_id: Number(form.disciplina_id),
      });
      setMsg({ type:"success", text:"Aula agendada com sucesso." });
      setModal(false);
      setForm({ turma_id:"", disciplina_id:"", titulo:"", descricao:"", data_inicio:"", data_fim:"" });
      load();
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.message || "Erro ao agendar aula." });
    } finally { setSaving(false); }
  };

  const alterarStatus = async (id, status) => {
    await api.put(`/aulas-remotas/${id}`, { status });
    setAulas(p => p.map(a => a.id === id ? { ...a, status } : a));
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Aulas Online</h1>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={15} /> Nova Aula
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
          <button className="ml-auto" onClick={() => setMsg(null)}><X size={13} /></button>
        </div>
      )}

      {aulas.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
            Sem aulas registadas. Clique em "Nova Aula" para agendar.
          </div>
        : (
          <div className="space-y-3">
            {aulas.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{a.titulo}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {a.turma?.nome} · {a.disciplina?.nome}
                    </p>
                    {a.descricao && <p className="text-sm text-slate-400 mt-1">{a.descricao}</p>}
                    <p className="text-xs text-slate-400 mt-2">
                      {a.data_inicio ? new Date(a.data_inicio).toLocaleString("pt-AO", { dateStyle:"long", timeStyle:"short" }) : ""}
                      {a.data_fim ? ` → ${new Date(a.data_fim).toLocaleString("pt-AO", { timeStyle:"short" })}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {a.link_jitsi && (
                      <a href={a.link_jitsi} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                        <Video size={13} /> Entrar
                      </a>
                    )}
                    {a.status === "agendada" && (
                      <button onClick={() => alterarStatus(a.id, "em_curso")}
                        className="text-xs border border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        Iniciar
                      </button>
                    )}
                    {a.status === "em_curso" && (
                      <button onClick={() => alterarStatus(a.id, "concluida")}
                        className="text-xs border border-slate-200 text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors">
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {/* Modal nova aula */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Nova Aula Online</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Turma</label>
                  <select value={form.turma_id} onChange={e => setForm({...form, turma_id: e.target.value})} required className={inp}>
                    <option value="">Seleccionar...</option>
                    {(prof?.turmas ?? []).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Disciplina</label>
                  <select value={form.disciplina_id} onChange={e => setForm({...form, disciplina_id: e.target.value})} required className={inp}>
                    <option value="">Seleccionar...</option>
                    {discsDaTurma.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Título</label>
                <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required className={inp} placeholder="Ex: Aula de revisão" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição (opcional)</label>
                <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} rows={2} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Início</label>
                  <input type="datetime-local" value={form.data_inicio} onChange={e => setForm({...form, data_inicio: e.target.value})} required className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Fim (opcional)</label>
                  <input type="datetime-local" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} className={inp} />
                </div>
              </div>
              <button type="submit" disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
                {saving ? "A agendar..." : "Agendar Aula"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
