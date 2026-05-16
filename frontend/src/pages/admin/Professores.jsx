import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Eye, EyeOff, X, AlertCircle, CheckCircle, RotateCcw } from "lucide-react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

export default function Professores() {
  const [professores, setProfessores] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form, setForm] = useState({ nome:"", email:"", telefone:"", especialidade:"", habilitacoes:"", data_admissao:"" });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  // modal senha
  const [senhaModal,   setSenhaModal]   = useState(null);
  const [senhaForm,    setSenhaForm]    = useState({ password:"", password_confirmation:"" });
  const [showSenha,    setShowSenha]    = useState(false);
  const [savingSenha,  setSavingSenha]  = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [msgSenha,     setMsgSenha]     = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/professores");
    setProfessores(data.data || data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await api.post("/professores", form);
      setShowForm(false);
      setForm({ nome:"", email:"", telefone:"", especialidade:"", habilitacoes:"", data_admissao:"" });
      load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const abrirSenha = (prof) => {
    setSenhaModal(prof);
    setSenhaForm({ password:"", password_confirmation:"" });
    setMsgSenha(null);
    setShowSenha(false);
  };

  const handleDefinirSenha = async (e) => {
    e.preventDefault();
    if (senhaForm.password !== senhaForm.password_confirmation) {
      setMsgSenha({ type:"error", text:"As senhas não coincidem." }); return;
    }
    setSavingSenha(true); setMsgSenha(null);
    try {
      const res = await api.patch(`/professores/${senhaModal.id}/definir-senha`, senhaForm);
      setMsgSenha({ type:"success", text: res.data.message });
      setSenhaForm({ password:"", password_confirmation:"" });
    } catch (err) {
      setMsgSenha({ type:"error", text: err.response?.data?.message || "Erro ao definir senha." });
    } finally { setSavingSenha(false); }
  };

  const handleReset = async () => {
    if (!window.confirm("Repor senha para \"educasoft123\"?")) return;
    setResetting(true); setMsgSenha(null);
    try {
      const res = await api.patch(`/professores/${senhaModal.id}/reset-senha`);
      setMsgSenha({ type:"success", text: res.data.message });
    } catch {
      setMsgSenha({ type:"error", text:"Erro ao repor senha." });
    } finally { setResetting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Professores</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
          + Novo Professor
        </button>
      </div>

      {loading ? <p className="text-center text-slate-400 py-12">A carregar...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professores.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                  {p.foto ? (
                    <img src={`/storage/${p.foto}`} alt={p.user?.nome} className="w-full h-full object-cover"/>
                  ) : (
                    <div className="w-full h-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold">
                      {p.user?.nome?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate">{p.user?.nome}</p>
                  <p className="text-xs text-slate-400 font-mono">{p.numero_professor}</p>
                </div>
                <button onClick={() => abrirSenha(p)}
                  title="Definir senha"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-colors flex-shrink-0">
                  <KeyRound size={15} />
                </button>
              </div>
              <p className="text-sm text-slate-500 truncate">{p.user?.email}</p>
              {p.especialidade && <p className="text-sm text-slate-500 mt-1">{p.especialidade}</p>}
              {p.disciplinas?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {p.disciplinas.slice(0, 3).map(d => (
                    <span key={d.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{d.nome}</span>
                  ))}
                  {p.disciplinas.length > 3 && (
                    <span className="text-xs text-slate-400">+{p.disciplinas.length - 3}</span>
                  )}
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-slate-100">
                {p.id ? (
                  <Link to={`/professores/${p.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                    Ver detalhes →
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400 italic">Sem ID — registo inválido</span>
                )}
              </div>
            </div>
          ))}
          {professores.length === 0 && (
            <p className="col-span-3 text-center text-slate-400 py-12">Nenhum professor registado.</p>
          )}
        </div>
      )}

      {/* Modal definir senha */}
      {senhaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">Definir Senha</h2>
                <p className="text-xs text-slate-400 mt-0.5">{senhaModal.user?.nome}</p>
              </div>
              <button onClick={() => setSenhaModal(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={16} />
              </button>
            </div>

            {msgSenha && (
              <div className={`mx-5 mt-4 flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border
                ${msgSenha.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                {msgSenha.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {msgSenha.text}
              </div>
            )}

            <form onSubmit={handleDefinirSenha} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nova Senha</label>
                <div className="relative">
                  <input type={showSenha ? "text" : "password"} required minLength={6}
                    value={senhaForm.password}
                    onChange={e => setSenhaForm({ ...senhaForm, password: e.target.value })}
                    className={inp} placeholder="Mínimo 6 caracteres" />
                  <button type="button" onClick={() => setShowSenha(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar Senha</label>
                <input type={showSenha ? "text" : "password"} required minLength={6}
                  value={senhaForm.password_confirmation}
                  onChange={e => setSenhaForm({ ...senhaForm, password_confirmation: e.target.value })}
                  className={inp} placeholder="Repetir senha" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={savingSenha}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">
                  <KeyRound size={14} />
                  {savingSenha ? "A guardar..." : "Definir Senha"}
                </button>
                <button type="button" onClick={handleReset} disabled={resetting}
                  title="Repor para senha padrão (educasoft123)"
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium px-3 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
                  <RotateCcw size={14} />
                  {resetting ? "..." : "Repor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal novo professor */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Novo Professor</h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={16} />
              </button>
            </div>
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                  <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Admissão</label>
                  <input type="date" value={form.data_admissao} onChange={e => setForm({...form, data_admissao: e.target.value})} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Especialidade</label>
                  <input value={form.especialidade} onChange={e => setForm({...form, especialidade: e.target.value})} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Habilitações</label>
                  <input value={form.habilitacoes} onChange={e => setForm({...form, habilitacoes: e.target.value})} className={inp} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">
                  {saving ? "A guardar..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
