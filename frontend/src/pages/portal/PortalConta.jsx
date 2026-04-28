import { useState } from "react";
import { KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

export default function PortalConta() {
  const { user } = useAuthStore();
  const [form, setForm]   = useState({ senha_atual:"", nova_senha:"", nova_senha_confirmation:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState(null);

  const handleSenha = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null);
    try {
      const res = await api.post("/portal/alterar-senha", form);
      setMsg({ type:"success", text: res.data.message });
      setForm({ senha_atual:"", nova_senha:"", nova_senha_confirmation:"" });
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.message || "Erro ao alterar senha." });
    } finally { setSaving(false); }
  };

  const fotoUrl = user?.foto ? `/storage/${user.foto}` : null;

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-slate-800">Minha Conta</h1>

      {/* Perfil */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold overflow-hidden">
            {fotoUrl ? <img src={fotoUrl} alt="" className="w-full h-full object-cover"/> : (user?.nome?.[0] ?? "A").toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">{user?.nome}</h2>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>
        <dl className="space-y-2 text-sm border-t border-slate-100 pt-4">
          <div className="flex justify-between">
            <dt className="text-slate-400">Email</dt>
            <dd className="font-medium text-slate-700">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Tipo de conta</dt>
            <dd className="font-medium text-slate-700 capitalize">{user?.tipo}</dd>
          </div>
        </dl>
      </div>

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={18} className="text-slate-500"/>
          <h2 className="font-semibold text-slate-800">Alterar Senha</h2>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-4
            ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {msg.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSenha} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Senha Actual</label>
            <input type="password" required value={form.senha_atual}
              onChange={e => setForm({...form, senha_atual: e.target.value})} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nova Senha</label>
            <input type="password" required minLength={6} value={form.nova_senha}
              onChange={e => setForm({...form, nova_senha: e.target.value})} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar Nova Senha</label>
            <input type="password" required value={form.nova_senha_confirmation}
              onChange={e => setForm({...form, nova_senha_confirmation: e.target.value})} className={inp}/>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">
            {saving ? "A guardar..." : "Alterar Senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
