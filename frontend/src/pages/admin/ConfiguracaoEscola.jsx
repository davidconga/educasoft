import { useState, useEffect, useRef } from "react";
import { Save, Upload, Building2, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";
import SaftButton from "../../components/SaftButton";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

export default function ConfiguracaoEscola() {
  const updateEscola = useAuthStore(s => s.updateEscola);
  const [form, setForm]       = useState({ nome:"", email:"", nif:"", telefone:"", endereco:"" });
  const [logo, setLogo]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [msg, setMsg]         = useState(null);
  const fileRef               = useRef();

  useEffect(() => {
    api.get("/configuracoes/escola")
      .then(r => {
        setForm({ nome: r.data.nome || "", email: r.data.email || "", nif: r.data.nif || "", telefone: r.data.telefone || "", endereco: r.data.endereco || "" });
        if (r.data.logo) setPreview(`/storage/${r.data.logo}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.put("/configuracoes/escola", form);
      updateEscola(r.data || form);
      showMsg("Dados da escola actualizados com sucesso.");
    } catch (err) {
      showMsg(err.response?.data?.message || "Erro ao guardar.", "error");
    } finally { setSaving(false); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogo(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logo) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("logo", logo);
    try {
      const r = await api.post("/configuracoes/escola/logo", fd);
      updateEscola({ logo: r.data?.logo });
      showMsg("Logo actualizado com sucesso.");
      setLogo(null);
    } catch (err) {
      showMsg(err.response?.data?.message || "Erro ao enviar logo.", "error");
    } finally { setUploadingLogo(false); }
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Dados da Escola</h1>
        </div>
        <SaftButton variant="outline"/>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Logotipo</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
            {preview
              ? <img src={preview} alt="Logo" className="w-full h-full object-contain p-1" />
              : <Building2 size={28} className="text-slate-300" />
            }
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Upload size={14} /> Escolher imagem
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            {logo && (
              <button
                type="button"
                onClick={handleLogoUpload}
                disabled={uploadingLogo}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
              >
                <Save size={14} /> {uploadingLogo ? "A enviar..." : "Guardar logo"}
              </button>
            )}
            <p className="text-xs text-slate-400">PNG, JPG. Máximo 2 MB.</p>
          </div>
        </div>
      </div>

      {/* Dados */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Informações Gerais</h2>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome da Escola *</label>
          <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp} placeholder="Ex: Colégio São Miguel" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} placeholder="geral@escola.ao" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Telefone</label>
            <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={inp} placeholder="+244 9xx xxx xxx" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">NIF (fiscal)</label>
            <input value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} className={inp} placeholder="Ex: 5417000000" />
            <p className="text-xs text-slate-400 mt-1">Usado nos recibos fiscais e na exportação SAFT-AO</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Endereço</label>
          <textarea value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} rows={2} className={`${inp} resize-none`} placeholder="Rua, Bairro, Município, Província" />
        </div>

        <div className="pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors">
            <Save size={15} /> {saving ? "A guardar..." : "Guardar Alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
