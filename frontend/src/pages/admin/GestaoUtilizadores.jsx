import { useState, useEffect } from "react";
import { UserCog, UserPlus, Check, X, Edit2, Trash2, AlertCircle } from "lucide-react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

const TIPOS = [
  { value: "admin",       label: "Administrador" },
  { value: "secretaria",  label: "Secretaria"    },
  { value: "director",    label: "Director"      },
  { value: "tesouraria",  label: "Tesouraria"    },
  { value: "coordenador", label: "Coordenador"   },
];

const TIPO_CFG = {
  admin:       "bg-blue-50 text-blue-700",
  secretaria:  "bg-violet-50 text-violet-700",
  director:    "bg-amber-50 text-amber-700",
  tesouraria:  "bg-emerald-50 text-emerald-700",
  coordenador: "bg-sky-50 text-sky-700",
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormUtilizador({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(
    initial
      ? { nome: initial.nome, email: initial.email, telefone: initial.telefone || "", tipo: initial.tipo, password: "" }
      : { nome: "", email: "", telefone: "", tipo: "admin", password: "" }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (initial && !payload.password) delete payload.password;
      let res;
      if (initial) res = await api.put(`/utilizadores/${initial.id}`, payload);
      else         res = await api.post("/utilizadores", payload);
      onSaved(res.data);
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? Object.values(errs).flat().join(" ") : (err.response?.data?.message || "Erro ao guardar."));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome *</label>
        <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Email *</label>
        <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Telefone</label>
          <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo *</label>
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inp}>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">
          {initial ? "Nova senha (deixar em branco para manter)" : "Senha *"}
        </label>
        <input
          type="password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          required={!initial}
          minLength={6}
          className={inp}
          placeholder={initial ? "••••••" : ""}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
          {saving ? "A guardar..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export default function GestaoUtilizadores() {
  const [utilizadores, setUtilizadores] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [editing, setEditing]           = useState(null);
  const [toast, setToast]               = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    api.get("/utilizadores").then(r => setUtilizadores(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (user) => {
    setShowForm(false); setEditing(null);
    showToast(editing ? "Utilizador actualizado." : "Utilizador criado.");
    load();
  };

  const handleToggle = async (u) => {
    try {
      await api.patch(`/utilizadores/${u.id}/toggle-ativo`);
      showToast(u.ativo ? "Utilizador desactivado." : "Utilizador activado.");
      load();
    } catch { showToast("Erro ao actualizar.", "error"); }
  };

  const handleDelete = async (u) => {
    if (!confirm(`Eliminar o utilizador "${u.nome}"?`)) return;
    try {
      await api.delete(`/utilizadores/${u.id}`);
      showToast("Utilizador eliminado.");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Erro ao eliminar.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Utilizadores</h1>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <UserPlus size={15} /> Novo Utilizador
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <p className="text-center text-slate-400 py-16 text-sm">A carregar...</p>
        ) : utilizadores.length === 0 ? (
          <div className="text-center py-16">
            <UserCog size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400 text-sm">Nenhum utilizador administrativo criado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Telefone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {utilizadores.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.nome?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{u.email}</td>
                  <td className="px-5 py-4 text-slate-500">{u.telefone || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIPO_CFG[u.tipo] || "bg-slate-100 text-slate-600"}`}>
                      {TIPOS.find(t => t.value === u.tipo)?.label || u.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleToggle(u)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors
                        ${u.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-500 hover:bg-red-100"}`}
                    >
                      {u.ativo ? <><Check size={11} /> Activo</> : <><X size={11} /> Inactivo</>}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setEditing(u); setShowForm(true); }} title="Editar"
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50">
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => handleDelete(u)} title="Eliminar"
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? "Editar Utilizador" : "Novo Utilizador"} onClose={() => { setShowForm(false); setEditing(null); }}>
          <FormUtilizador
            initial={editing}
            onClose={() => { setShowForm(false); setEditing(null); }}
            onSaved={handleSaved}
          />
        </Modal>
      )}
    </div>
  );
}
