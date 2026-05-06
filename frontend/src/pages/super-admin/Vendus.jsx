import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Receipt, CheckCircle, AlertCircle, PlugZap, Loader2 } from "lucide-react";

export default function SuperAdminVendus() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [config, setConfig]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => {
    api.get("/integracoes/vendus")
      .then(r => setConfig(r.data))
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4500);
  };

  const testar = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/integracoes/vendus/test");
      if (data.ok) showMsg(`Ligação OK (HTTP ${data.status}).`);
      else showMsg(data.erro || "Falhou.", "error");
    } catch (err) {
      showMsg(err.response?.data?.erro || err.response?.data?.message || "Falhou ao testar.", "error");
    } finally { setTesting(false); }
  };

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 size={16} className="animate-spin" /> A carregar...
    </div>
  );

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <Receipt size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Integração Vendus (Operador)</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Credenciais globais para emissão de facturas <strong>do operador</strong> (assinaturas a escolas).
        Cada escola configura a sua própria conta na sua área de admin.
      </p>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border mb-4
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Linha label="Estado" value={
          config.api_key_set
            ? <span className="text-emerald-600 font-medium">Configurada</span>
            : <span className="text-amber-600 font-medium">Não configurada</span>
        }/>
        <Linha label="Base URL" value={<code className="text-xs bg-slate-100 px-2 py-1 rounded">{config.base_url}</code>} />
        <Linha label="API Key" value={config.api_key_set ? <code className="text-xs bg-slate-100 px-2 py-1 rounded">{config.api_key_hint}</code> : "—"} />
        <Linha label="Register ID" value={config.register_id || "—"} />
        <Linha label="Série" value={config.serie || "—"} />
        <Linha label="Ambiente" value={
          <span className={`text-xs px-2 py-1 rounded font-medium ${config.modo === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {config.modo === "live" ? "Produção" : "Teste / Sandbox"}
          </span>
        }/>
        <Linha label="Verify SSL" value={config.verify_ssl ? "Sim" : "Não"} />
        <Linha label="Timeout" value={`${config.timeout}s`} />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={testar} disabled={testing || !config.api_key_set}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
          <PlugZap size={15} /> {testing ? "A testar..." : "Testar ligação"}
        </button>
        {!config.api_key_set && (
          <span className="text-xs text-slate-500">Define <code className="bg-slate-100 px-1 rounded">VENDUS_API_KEY</code> no <code className="bg-slate-100 px-1 rounded">.env</code> do servidor.</span>
        )}
      </div>

      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
        <p><strong>Como configurar:</strong></p>
        <p>As credenciais globais são lidas do ficheiro <code className="bg-white px-1 rounded">.env</code>. Para alterar, edita-o no servidor e reinicia o serviço.</p>
        <p>Variáveis: <code className="bg-white px-1 rounded">VENDUS_API_KEY</code>, <code className="bg-white px-1 rounded">VENDUS_REGISTER_ID</code>, <code className="bg-white px-1 rounded">VENDUS_SERIE</code>, <code className="bg-white px-1 rounded">VENDUS_MODO</code>, <code className="bg-white px-1 rounded">VENDUS_BASE_URL</code>.</p>
      </div>
    </div>
  );
}

function Linha({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}
