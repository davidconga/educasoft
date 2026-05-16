import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { CreditCard, CheckCircle, AlertCircle, PlugZap, Loader2, Save, Eye, EyeOff } from "lucide-react";

export default function SuperAdminIntelize() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [config, setConfig]   = useState(null);
  const [form, setForm]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    api.get("/integracoes/intelize")
      .then(r => { setConfig(r.data); setForm(toForm(r.data)); })
      .finally(() => setLoading(false));
  }, []);

  function toForm(c) {
    return {
      activo:          !!c.activo,
      base_url:        c.base_url || "",
      username:        c.username || "",
      password:        "",
      entidade:        c.entidade || "",
      criador:         c.criador || "",
      auth_path:       c.auth_path || "/auth",
      references_path: c.references_path || "/references",
      validade_dias:   c.validade_dias ?? 30,
      token_ttl_min:   c.token_ttl_min ?? 50,
      webhook_secret:  "",
    };
  }

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 5500);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const guardar = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/integracoes/intelize", form);
      setConfig(data); setForm(toForm(data));
      showMsg("Configuração guardada.");
    } catch (err) {
      const d = err.response?.data;
      const detail = d?.errors ? Object.values(d.errors).flat().join(" ") : (d?.message || "Falhou ao guardar.");
      showMsg(detail, "error");
    } finally { setSaving(false); }
  };

  const testar = async () => {
    setTesting(true);
    try {
      const { data } = await api.post("/integracoes/intelize/test");
      if (data.ok) showMsg(`Ligação OK — token recebido (HTTP ${data.status}).`);
      else showMsg(data.erro || "Falhou.", "error");
    } catch (err) {
      const d = err.response?.data;
      showMsg(d?.erro || d?.message || "Falhou ao testar.", "error");
    } finally { setTesting(false); }
  };

  if (loading || !form) return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 size={16} className="animate-spin" /> A carregar...
    </div>
  );

  const podeTestar = (config.username_set || form.username) && (config.password_set || form.password);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Intelize — Referências Multicaixa</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Gateway de pagamento por referência usado nas <strong>facturas das assinaturas das escolas</strong>.
        As credenciais são globais do operador.
      </p>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border mb-4
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" checked={form.activo} onChange={e => set("activo", e.target.checked)}
                 className="w-4 h-4 accent-blue-600" />
          <div>
            <div className="text-sm font-medium text-slate-800">Driver activo</div>
            <div className="text-xs text-slate-500">Quando activo, as facturas geram referências via Intelize.</div>
          </div>
        </label>

        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <Field label="Base URL" hint="Demo: https://demo.api.intelize.digital/v1 — Live: https://api.intelize.digital/v1">
            <input type="url" value={form.base_url} onChange={e => set("base_url", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Ambiente">
            <span className={`text-xs px-2 py-1 rounded font-medium inline-block ${form.base_url.includes("demo.") ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
              {form.base_url.includes("demo.") ? "Demo / Sandbox" : "Produção"}
            </span>
          </Field>

          <Field label="Username">
            <input type="text" value={form.username} onChange={e => set("username", e.target.value)} className={inputCls} autoComplete="off" />
          </Field>
          <Field label={config.password_set ? "Password (deixa vazio para manter)" : "Password"}>
            <div className="relative">
              <input type={showPwd ? "text" : "password"} value={form.password} onChange={e => set("password", e.target.value)}
                     className={inputCls + " pr-9"} autoComplete="new-password"
                     placeholder={config.password_set ? "•••••••• (definida)" : ""} />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </Field>

          <Field label="Entidade Multicaixa">
            <input type="text" value={form.entidade} onChange={e => set("entidade", e.target.value)} className={inputCls} placeholder="ex: 11111" />
          </Field>
          <Field label="Criador (header opcional)">
            <input type="text" value={form.criador} onChange={e => set("criador", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Auth path">
            <input type="text" value={form.auth_path} onChange={e => set("auth_path", e.target.value)} className={inputCls} />
          </Field>
          <Field label="References path">
            <input type="text" value={form.references_path} onChange={e => set("references_path", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Validade (dias)">
            <input type="number" min="1" max="365" value={form.validade_dias}
                   onChange={e => set("validade_dias", parseInt(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label="TTL do token (min)">
            <input type="number" min="1" max="1440" value={form.token_ttl_min}
                   onChange={e => set("token_ttl_min", parseInt(e.target.value) || 0)} className={inputCls} />
          </Field>

          <Field label={config.webhook_secret_set ? "Webhook secret (deixa vazio para manter)" : "Webhook secret"}
                 className="md:col-span-2">
            <div className="relative">
              <input type={showSecret ? "text" : "password"} value={form.webhook_secret}
                     onChange={e => set("webhook_secret", e.target.value)}
                     className={inputCls + " pr-9"} autoComplete="off"
                     placeholder={config.webhook_secret_set ? "•••••••• (definido)" : ""} />
              <button type="button" onClick={() => setShowSecret(v => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showSecret ? <EyeOff size={14}/> : <Eye size={14}/>}
              </button>
            </div>
          </Field>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
          <Save size={15} /> {saving ? "A guardar..." : "Guardar"}
        </button>
        <button onClick={testar} disabled={testing || !podeTestar}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
          <PlugZap size={15} /> {testing ? "A testar..." : "Testar autenticação"}
        </button>
        {!podeTestar && (
          <span className="text-xs text-slate-500">Define <strong>username</strong> e <strong>password</strong> antes de testar.</span>
        )}
      </div>

      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
        <p><strong>Notas:</strong></p>
        <p>Os caminhos <code className="bg-white px-1 rounded">auth_path</code> e <code className="bg-white px-1 rounded">references_path</code> só precisam de ser ajustados se a Intelize mudar a documentação.</p>
        <p>A password e o webhook secret são guardados encriptados na base de dados.</p>
      </div>
    </div>
  );
}

const inputCls = "w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function Field({ label, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
