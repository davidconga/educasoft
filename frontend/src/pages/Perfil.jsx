import { useEffect, useRef, useState } from "react";
import { Camera, Save, KeyRound, Eye, EyeOff, CheckCircle, AlertCircle, User } from "lucide-react";
import api from "../services/api";
import { useAuthStore } from "../store/auth";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

export default function Perfil() {
  const setAuth = useAuthStore(s => s.setAuth);
  const authToken = useAuthStore(s => s.token);
  const authEscola = useAuthStore(s => s.escola);
  const authTenantId = useAuthStore(s => s.tenantId);

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:"", email:"", telefone:"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const [senha, setSenha] = useState({ senha_atual:"", nova_senha:"", nova_senha_confirmation:"" });
  const [showSenha, setShowSenha] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState(null);

  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoRef = useRef();

  const showMsg = (set, text, type="success") => {
    set({ text, type });
    setTimeout(() => set(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/portal/perfil");
      setPerfil(r.data);
      setForm({
        nome: r.data.user?.nome ?? "",
        email: r.data.user?.email ?? "",
        telefone: r.data.user?.telefone ?? "",
      });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const fotoPath  = perfil?.aluno?.foto || perfil?.professor?.foto;
  const fotoUrl   = fotoPath ? `/storage/${fotoPath}?t=${perfil?._bust ?? 0}` : null;
  const podeFoto  = !!(perfil?.aluno || perfil?.professor);
  const initials  = (form.nome || "U").split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const r = await api.put("/portal/perfil", form);
      // Atualiza auth store com nome/email novos
      setAuth(authToken, r.data.user, authEscola, authTenantId);
      showMsg(setMsg, "Perfil actualizado.");
      load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      const firstErr = errs ? Object.values(errs)[0]?.[0] : null;
      showMsg(setMsg, firstErr || err.response?.data?.message || "Erro ao guardar.", "error");
    } finally { setSaving(false); }
  };

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      await api.post("/portal/perfil/foto", fd);
      setPerfil(p => ({ ...p, _bust: Date.now() }));
      load();
      showMsg(setMsg, "Foto actualizada.");
    } catch (err) {
      showMsg(setMsg, err.response?.data?.message || "Erro ao enviar foto.", "error");
    } finally {
      setUploadingFoto(false);
      if (fotoRef.current) fotoRef.current.value = "";
    }
  };

  const handleSenha = async (e) => {
    e.preventDefault();
    if (senha.nova_senha !== senha.nova_senha_confirmation) {
      showMsg(setMsgSenha, "Nova senha e confirmação não coincidem.", "error");
      return;
    }
    setSavingSenha(true); setMsgSenha(null);
    try {
      await api.post("/portal/alterar-senha", senha);
      setSenha({ senha_atual:"", nova_senha:"", nova_senha_confirmation:"" });
      showMsg(setMsgSenha, "Senha alterada com sucesso.");
    } catch (err) {
      showMsg(setMsgSenha, err.response?.data?.message || "Erro ao alterar senha.", "error");
    } finally { setSavingSenha(false); }
  };

  if (loading) return <p className="text-center text-slate-400 py-16 text-sm">A carregar...</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <User size={20} className="text-slate-400"/>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meu Perfil</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestão dos seus dados de acesso e identificação</p>
        </div>
      </div>

      {/* Hero / foto */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-6">
        <div
          className={`relative shrink-0 ${podeFoto ? "cursor-pointer group" : ""}`}
          onClick={() => podeFoto && fotoRef.current?.click()}
          title={podeFoto ? "Clique para alterar a foto" : "Foto não disponível para o seu tipo de utilizador"}
        >
          <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto}/>
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-violet-200">
            {fotoUrl ? (
              <img src={fotoUrl} alt={form.nome} className="w-full h-full object-cover"/>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">{initials}</div>
            )}
          </div>
          {podeFoto && (
            <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingFoto ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Camera size={20} className="text-white"/>}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-slate-800">{form.nome}</p>
          <p className="text-sm text-slate-500 capitalize">{perfil?.user?.tipo}</p>
          {perfil?.aluno?.numero_aluno && (
            <p className="text-xs text-slate-400 font-mono mt-1">Nº Aluno: {perfil.aluno.numero_aluno}</p>
          )}
          {perfil?.professor?.numero_professor && (
            <p className="text-xs text-slate-400 font-mono mt-1">Nº Professor: {perfil.professor.numero_professor}</p>
          )}
          {authEscola?.nome && (
            <p className="text-xs text-slate-400 mt-1">{authEscola.nome}</p>
          )}
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border
          ${msg.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
          {msg.type === "error" ? <AlertCircle size={14}/> : <CheckCircle size={14}/>} {msg.text}
        </div>
      )}

      {/* Dados básicos */}
      <form onSubmit={handleSavePerfil} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"/>
          <h2 className="text-sm font-semibold text-slate-700">Dados Pessoais</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
            <input className={inp} required value={form.nome} onChange={e => setForm(s => ({...s, nome:e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
            <input type="email" className={inp} required value={form.email} onChange={e => setForm(s => ({...s, email:e.target.value}))}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
            <input className={inp} value={form.telefone} onChange={e => setForm(s => ({...s, telefone:e.target.value}))}/>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            <Save size={14}/> {saving ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </form>

      {/* Senha */}
      <form onSubmit={handleSenha} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"/>
          <h2 className="text-sm font-semibold text-slate-700">Alterar Senha</h2>
        </div>

        {msgSenha && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border
            ${msgSenha.type === "error" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {msgSenha.type === "error" ? <AlertCircle size={14}/> : <CheckCircle size={14}/>} {msgSenha.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Senha actual *</label>
            <div className="relative">
              <input type={showSenha ? "text" : "password"} required minLength={6}
                value={senha.senha_atual} onChange={e => setSenha(s => ({...s, senha_atual:e.target.value}))} className={inp}/>
              <button type="button" onClick={() => setShowSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showSenha ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nova senha *</label>
            <input type={showSenha ? "text" : "password"} required minLength={6}
              value={senha.nova_senha} onChange={e => setSenha(s => ({...s, nova_senha:e.target.value}))} className={inp}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar nova *</label>
            <input type={showSenha ? "text" : "password"} required minLength={6}
              value={senha.nova_senha_confirmation} onChange={e => setSenha(s => ({...s, nova_senha_confirmation:e.target.value}))} className={inp}/>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={savingSenha}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            <KeyRound size={14}/> {savingSenha ? "A alterar..." : "Alterar senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
