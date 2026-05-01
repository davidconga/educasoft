import { useEffect, useState } from "react";
import { Bell, Send, RotateCcw, Settings, Mail, MessageCircle, AlertCircle, CheckCircle2, Clock, Search, Save, FlaskConical } from "lucide-react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

const STATUS_BADGE = {
  pendente: { cls: "bg-amber-100 text-amber-700", label: "Pendente", icon: Clock },
  enviado:  { cls: "bg-emerald-100 text-emerald-700", label: "Enviado", icon: CheckCircle2 },
  falhou:   { cls: "bg-rose-100 text-rose-700", label: "Falhou", icon: AlertCircle },
};

export default function Lembretes() {
  const [tab, setTab]               = useState("lista");
  const [list, setList]             = useState([]);
  const [load, setLoad]             = useState(true);
  const [statusF, setStatusF]       = useState("");
  const [canalF, setCanalF]         = useState("");
  const [busy, setBusy]             = useState(false);

  const [config, setConfig]         = useState(null);
  const [savingCfg, setSavingCfg]   = useState(false);
  const [testTel, setTestTel]       = useState("");
  const [testResult, setTestResult] = useState(null);

  const carregar = async () => {
    setLoad(true);
    try {
      const params = {};
      if (statusF) params.status = statusF;
      if (canalF)  params.canal  = canalF;
      const r = await api.get("/lembretes", { params });
      setList(r.data || []);
    } finally { setLoad(false); }
  };

  const carregarConfig = async () => {
    const r = await api.get("/lembretes/config");
    const c = r.data || {};
    setConfig({
      ...c,
      hora_envio: typeof c.hora_envio === "string" ? c.hora_envio.slice(0, 5) : "08:00",
      dias_antes_str:  Array.isArray(c.dias_antes)  ? c.dias_antes.join(", ")  : "",
      dias_depois_str: Array.isArray(c.dias_depois) ? c.dias_depois.join(", ") : "",
      sms_gateway_payload_template: typeof c.sms_gateway_payload_template === "string"
        ? c.sms_gateway_payload_template
        : JSON.stringify(c.sms_gateway_payload_template ?? {}, null, 2),
    });
  };

  useEffect(() => { carregar(); }, [statusF, canalF]);
  useEffect(() => { if (tab === "config" && !config) carregarConfig(); }, [tab]);

  const gerarHoje = async () => {
    setBusy(true);
    try {
      const r = await api.post("/lembretes/gerar");
      alert(`Candidatos: ${r.data.candidatos} · novos: ${r.data.criados} · já existiam: ${r.data.ja_existiam}`);
      carregar();
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao gerar lembretes.");
    } finally { setBusy(false); }
  };

  const processarPendentes = async () => {
    setBusy(true);
    try {
      const r = await api.post("/lembretes/processar");
      alert(r.data.message);
      carregar();
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao processar.");
    } finally { setBusy(false); }
  };

  const reenviar = async (l) => {
    try {
      await api.post(`/lembretes/${l.id}/reenviar`);
      carregar();
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao reenviar.");
    }
  };

  const guardarConfig = async (e) => {
    e.preventDefault();
    setSavingCfg(true);
    try {
      const payload = {
        ...config,
        dias_antes:  config.dias_antes_str.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)),
        dias_depois: config.dias_depois_str.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)),
      };
      delete payload.dias_antes_str;
      delete payload.dias_depois_str;
      const r = await api.put("/lembretes/config", payload);
      alert("Configuração guardada.");
      const c = r.data || {};
      setConfig({
        ...c,
        hora_envio: typeof c.hora_envio === "string" ? c.hora_envio.slice(0, 5) : "08:00",
        dias_antes_str:  Array.isArray(c.dias_antes)  ? c.dias_antes.join(", ")  : "",
        dias_depois_str: Array.isArray(c.dias_depois) ? c.dias_depois.join(", ") : "",
        sms_gateway_payload_template: typeof c.sms_gateway_payload_template === "string"
          ? c.sms_gateway_payload_template
          : JSON.stringify(c.sms_gateway_payload_template ?? {}, null, 2),
      });
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao guardar.");
    } finally { setSavingCfg(false); }
  };

  const testarSms = async () => {
    if (!testTel) return alert("Indique um número de telefone.");
    if (!config?.sms_gateway_url) {
      return alert("Preencha o URL do gateway antes de testar (não precisa guardar primeiro).");
    }
    setTestResult(null);
    try {
      const r = await api.post("/lembretes/teste-sms", {
        telefone:                     testTel,
        sms_gateway_url:              config.sms_gateway_url,
        sms_gateway_method:           config.sms_gateway_method,
        sms_gateway_api_key:          config.sms_gateway_api_key,
        sms_gateway_payload_template: config.sms_gateway_payload_template,
        sms_sender_id:                config.sms_sender_id,
      });
      setTestResult(r.data);
    } catch (e) {
      setTestResult({ ok: false, erro: e.response?.data?.message || e.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Lembretes de Pagamento</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("lista")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "lista" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}>
            Histórico
          </button>
          <button onClick={() => setTab("config")}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${tab === "config" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100"}`}>
            <Settings size={14} className="inline mr-1.5" /> Configuração
          </button>
        </div>
      </div>

      {tab === "lista" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
            <select value={statusF} onChange={e => setStatusF(e.target.value)} className={`${inp} w-auto min-w-[140px]`}>
              <option value="">Todos os estados</option>
              <option value="pendente">Pendentes</option>
              <option value="enviado">Enviados</option>
              <option value="falhou">Falhados</option>
            </select>
            <select value={canalF} onChange={e => setCanalF(e.target.value)} className={`${inp} w-auto min-w-[140px]`}>
              <option value="">Todos os canais</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <div className="flex-1" />
            <button onClick={gerarHoje} disabled={busy}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50">
              Gerar lembretes de hoje
            </button>
            <button onClick={processarPendentes} disabled={busy}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">
              <Send size={14} className="inline mr-1.5" /> Enviar pendentes
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {load ? (
              <p className="text-center text-slate-400 py-12">A carregar…</p>
            ) : list.length === 0 ? (
              <p className="text-center text-slate-400 py-12">Sem lembretes registados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Aluno</th>
                    <th className="text-left px-4 py-3 font-semibold">Canal</th>
                    <th className="text-left px-4 py-3 font-semibold">Destinatário</th>
                    <th className="text-left px-4 py-3 font-semibold">Gatilho</th>
                    <th className="text-center px-4 py-3 font-semibold">Tentativas</th>
                    <th className="text-center px-4 py-3 font-semibold">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold">Quando</th>
                    <th className="text-right px-4 py-3 font-semibold">Acções</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(l => {
                    const s = STATUS_BADGE[l.status] || STATUS_BADGE.pendente;
                    const Icon = s.icon;
                    return (
                      <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{l.aluno?.user?.nome || "—"}</div>
                          <div className="text-xs text-slate-400 font-mono">{l.pagamento?.referencia || ""}</div>
                        </td>
                        <td className="px-4 py-3">
                          {l.canal === "email"
                            ? <span className="inline-flex items-center gap-1.5 text-slate-600"><Mail size={14}/> Email</span>
                            : <span className="inline-flex items-center gap-1.5 text-slate-600"><MessageCircle size={14}/> SMS</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{l.destinatario}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {l.gatilho === "antes" && `${Math.abs(l.dias_offset)}d antes`}
                          {l.gatilho === "depois" && `${l.dias_offset}d depois`}
                          {l.gatilho === "manual" && "Manual"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500">{l.tentativas}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${s.cls}`}>
                            <Icon size={12} /> {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {l.enviado_em ? new Date(l.enviado_em).toLocaleString("pt-PT") : new Date(l.created_at).toLocaleString("pt-PT")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {l.status !== "enviado" && (
                            <button onClick={() => reenviar(l)} title="Reenviar"
                              className="p-1.5 hover:bg-blue-50 rounded text-blue-600">
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {list.some(l => l.status === "falhou") && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700">
              <AlertCircle size={16} className="inline mr-2" />
              Existem lembretes que falharam o envio. Passe o cursor no estado para ver os detalhes ou reenvie via o botão.
            </div>
          )}
        </>
      )}

      {tab === "config" && config && (
        <form onSubmit={guardarConfig} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Geral */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Canais</h3>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!config.email_activo}
                onChange={e => setConfig(c => ({ ...c, email_activo: e.target.checked }))}/>
              Enviar por email
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!config.sms_activo}
                onChange={e => setConfig(c => ({ ...c, sms_activo: e.target.checked }))}/>
              Enviar por SMS
            </label>

            <hr className="border-slate-100"/>

            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Dias antes do vencimento (separados por vírgula)</label>
              <input value={config.dias_antes_str || ""} placeholder="3, 1"
                onChange={e => setConfig(c => ({ ...c, dias_antes_str: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Dias depois do vencimento</label>
              <input value={config.dias_depois_str || ""} placeholder="1, 7, 15"
                onChange={e => setConfig(c => ({ ...c, dias_depois_str: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Hora de envio diário</label>
              <input type="time" value={config.hora_envio || "08:00"}
                onChange={e => setConfig(c => ({ ...c, hora_envio: e.target.value }))} className={inp}/>
              <p className="text-xs text-slate-400 mt-1">O cron deve correr a esta hora (ou superior). Veja o agendamento em <code>routes/console.php</code>.</p>
            </div>
          </div>

          {/* Email */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Template — Email</h3>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Assunto</label>
              <input value={config.email_assunto || ""}
                onChange={e => setConfig(c => ({ ...c, email_assunto: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Corpo</label>
              <textarea rows={8} value={config.email_template || ""}
                onChange={e => setConfig(c => ({ ...c, email_template: e.target.value }))}
                className={`${inp} resize-y font-mono text-xs`}/>
              <p className="text-xs text-slate-400 mt-1">
                Placeholders: <code>{"{aluno}"}</code> <code>{"{mes}"}</code> <code>{"{valor}"}</code> <code>{"{vencimento}"}</code> <code>{"{referencia}"}</code> <code>{"{escola}"}</code> <code>{"{dias_atraso}"}</code>
              </p>
            </div>
          </div>

          {/* SMS */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">SMS — Gateway HTTP</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Sender ID (origem)</label>
                <input value={config.sms_sender_id || ""} maxLength={20}
                  onChange={e => setConfig(c => ({ ...c, sms_sender_id: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">URL do gateway</label>
                <input type="url" value={config.sms_gateway_url || ""}
                  onChange={e => setConfig(c => ({ ...c, sms_gateway_url: e.target.value }))}
                  placeholder="https://api.provedor.ao/v1/sms" className={inp}/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Método HTTP</label>
                <select value={config.sms_gateway_method || "POST"}
                  onChange={e => setConfig(c => ({ ...c, sms_gateway_method: e.target.value }))} className={inp}>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">API key / token</label>
                <input value={config.sms_gateway_api_key || ""}
                  onChange={e => setConfig(c => ({ ...c, sms_gateway_api_key: e.target.value }))}
                  placeholder="Bearer xxx · ou utilizador:senha · ou token cru" className={inp}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Template do payload (JSON)</label>
              <textarea rows={4} value={config.sms_gateway_payload_template || ""}
                onChange={e => setConfig(c => ({ ...c, sms_gateway_payload_template: e.target.value }))}
                className={`${inp} resize-y font-mono text-xs`}/>
              <p className="text-xs text-slate-400 mt-1">
                Placeholders: <code>{"{telefone}"}</code> <code>{"{mensagem}"}</code> <code>{"{sender}"}</code>
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Template da mensagem SMS (≤ 480 chars)</label>
              <textarea rows={3} value={config.sms_template || ""} maxLength={480}
                onChange={e => setConfig(c => ({ ...c, sms_template: e.target.value }))}
                className={`${inp} resize-y font-mono text-xs`}/>
            </div>

            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-100">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Testar gateway</label>
                <input value={testTel} onChange={e => setTestTel(e.target.value)}
                  placeholder="+244 9XX XXX XXX" className={inp}/>
              </div>
              <button type="button" onClick={testarSms}
                className="px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium">
                <FlaskConical size={14} className="inline mr-1.5" /> Enviar teste
              </button>
              {testResult && (
                <div className={`px-3 py-2 rounded-lg text-xs font-mono w-full ${testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  <div className="font-bold">HTTP {testResult.status || 0} · {testResult.ok ? "OK" : (testResult.erro || "Falhou")}</div>
                  {testResult.url_usado && (
                    <div className="mt-1 text-[10px] opacity-70 break-all">URL: {testResult.url_usado}</div>
                  )}
                  {testResult.payload && (
                    <details className="mt-1 text-[10px] opacity-80">
                      <summary className="cursor-pointer">Payload enviado</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify(testResult.payload, null, 2)}</pre>
                    </details>
                  )}
                  {testResult.body && (
                    <details className="mt-1 text-[10px] opacity-80">
                      <summary className="cursor-pointer">Resposta do gateway</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all">{testResult.body}</pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end">
            <button type="submit" disabled={savingCfg}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
              <Save size={14} className="inline mr-1.5" /> {savingCfg ? "A guardar…" : "Guardar configuração"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
