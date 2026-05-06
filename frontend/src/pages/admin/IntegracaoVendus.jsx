import { useState, useEffect } from "react";
import { Save, Receipt, CheckCircle, AlertCircle, PlugZap, Eye, EyeOff } from "lucide-react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

export default function IntegracaoVendus() {
  const [form, setForm] = useState({
    ativo: false,
    api_key: "",
    register_id: "",
    serie: "",
    modo: "live",
  });
  const [estado, setEstado] = useState({ api_key_set: false, api_key_hint: "" });
  const [showKey, setShowKey]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    api.get("/configuracoes/vendus")
      .then(r => {
        setForm(f => ({
          ...f,
          ativo:       !!r.data.ativo,
          register_id: r.data.register_id || "",
          serie:       r.data.serie || "",
          modo:        r.data.modo || "live",
        }));
        setEstado({ api_key_set: !!r.data.api_key_set, api_key_hint: r.data.api_key_hint || "" });
      })
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ativo:       form.ativo,
        register_id: form.register_id || null,
        serie:       form.serie || null,
        modo:        form.modo || "live",
      };
      if (form.api_key) payload.api_key = form.api_key;

      const r = await api.put("/configuracoes/vendus", payload);
      setEstado({ api_key_set: !!r.data.api_key_set, api_key_hint: r.data.api_key_hint || "" });
      setForm(f => ({ ...f, api_key: "" }));
      showMsg("Configurações Vendus guardadas.");
    } catch (err) {
      showMsg(err.response?.data?.message || "Erro ao guardar.", "error");
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await api.post("/configuracoes/vendus/test");
      if (r.data?.ok) showMsg(`Ligação OK (HTTP ${r.data.status}).`);
      else showMsg(r.data?.erro || "Falhou.", "error");
    } catch (err) {
      showMsg(err.response?.data?.erro || err.response?.data?.message || "Falhou ao testar.", "error");
    } finally { setTesting(false); }
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Receipt size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Integração Vendus</h1>
      </div>

      <p className="text-sm text-slate-500">
        Liga a tua conta <a href="https://www.vendus.co.ao" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Vendus</a> para emitir facturas e recibos electrónicos certificados a partir do Educajá.
      </p>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.ativo}
            onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
          <span className="text-sm font-medium text-slate-700">Activar emissão de documentos via Vendus</span>
        </label>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">API Key Vendus *</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={form.api_key}
              onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
              className={`${inp} pr-10`}
              placeholder={estado.api_key_set ? estado.api_key_hint : "cole aqui a chave"}
              autoComplete="off"
            />
            <button type="button" onClick={() => setShowKey(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {estado.api_key_set
              ? "Chave actual guardada (mascarada). Deixa em branco para manter a actual."
              : "Obténs a API Key na tua conta Vendus → Definições → Chaves API."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Register ID</label>
            <input value={form.register_id}
              onChange={e => setForm(f => ({ ...f, register_id: e.target.value }))}
              className={inp} placeholder="ex: 12345" />
            <p className="text-xs text-slate-400 mt-1">ID do terminal/caixa Vendus</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Série</label>
            <input value={form.serie}
              onChange={e => setForm(f => ({ ...f, serie: e.target.value }))}
              className={inp} placeholder="ex: A" />
            <p className="text-xs text-slate-400 mt-1">Série dos documentos (opcional)</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Ambiente</label>
          <select value={form.modo}
            onChange={e => setForm(f => ({ ...f, modo: e.target.value }))}
            className={inp}>
            <option value="live">Produção (live)</option>
            <option value="test">Teste / Sandbox</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors">
            <Save size={15} /> {saving ? "A guardar..." : "Guardar Alterações"}
          </button>
          <button type="button" onClick={handleTest} disabled={testing || !estado.api_key_set}
            className="flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
            <PlugZap size={15} /> {testing ? "A testar..." : "Testar ligação"}
          </button>
        </div>
        {!estado.api_key_set && (
          <p className="text-xs text-slate-400">Guarda a chave primeiro para poderes testar a ligação.</p>
        )}
      </form>
    </div>
  );
}
