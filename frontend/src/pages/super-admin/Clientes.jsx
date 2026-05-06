import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Search, Edit3, Save, X, FileText, Loader2, ArrowRightLeft } from "lucide-react";

const PLANO_COLOR = {
  basico:   "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-700",
  premium:  "bg-purple-100 text-purple-700",
};

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

export default function SuperAdminClientes() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [plano, setPlano] = useState("");
  const [activo, setActivo] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [mudancaForm, setMudancaForm] = useState(null);
  const [mudando, setMudando] = useState(false);

  useEffect(() => { api.get("/planos-admin?apenas_ativos=1").then((r) => setPlanos(r.data)); }, []);

  async function carregar() {
    setLoading(true);
    try {
      const params = {};
      if (busca) params.q = busca;
      if (plano) params.plano = plano;
      const { data } = await api.get("/clientes", { params });
      setList(data.data || data);
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, [busca, plano]);

  async function abrirDetalhe(escola) {
    setActivo(escola);
    setDetalhe(null);
    setEditing(false);
    const { data } = await api.get(`/clientes/${escola.id}`);
    setDetalhe(data);
    setForm({
      nif: data.cliente.nif || "",
      endereco: data.cliente.endereco || "",
      telefone: data.cliente.telefone || "",
      email_facturacao: data.cliente.email_facturacao || "",
      responsavel_facturacao: data.cliente.responsavel_facturacao || "",
      dia_vencimento: data.cliente.dia_vencimento ?? 5,
      valor_mensal: data.cliente.valor_mensal ?? "",
      desconto_pct: data.cliente.desconto_pct ?? 0,
      notas_facturacao: data.cliente.notas_facturacao || "",
    });
  }

  async function guardar() {
    if (!activo) return;
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.valor_mensal === "") payload.valor_mensal = null;
      await api.patch(`/clientes/${activo.id}`, payload);
      await abrirDetalhe(activo);
      setEditing(false);
      carregar();
    } finally { setSaving(false); }
  }

  async function emitirFactura() {
    if (!activo) return;
    setGerando(true);
    try {
      const { data } = await api.post("/facturas", { escola_id: activo.id });
      await abrirDetalhe(activo);
      alert(`Factura ${data.numero} emitida.`);
    } catch (e) {
      alert(e?.response?.data?.message || "Falha ao emitir factura.");
    } finally { setGerando(false); }
  }

  async function aplicarMudancaPlano() {
    if (!activo || !mudancaForm?.plano_id) return;
    setMudando(true);
    try {
      await api.post(`/clientes/${activo.id}/mudar-plano`, {
        plano_id: Number(mudancaForm.plano_id),
        preco_custom: mudancaForm.preco_custom ? Number(mudancaForm.preco_custom) : null,
        desconto_pct: mudancaForm.desconto_pct ? Number(mudancaForm.desconto_pct) : null,
        imediato: !!mudancaForm.imediato,
      });
      setMudancaForm(null);
      await abrirDetalhe(activo);
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || "Falha ao mudar plano.");
    } finally { setMudando(false); }
  }

  return (
    <div className="h-full flex">
      <aside className="w-96 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-gray-800 mb-1">Clientes</h1>
          <p className="text-xs text-gray-500 mb-3">Gestão de facturação das escolas.</p>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar..."
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="flex gap-1 text-xs">
            {[["", "Todos"], ["basico", "Básico"], ["standard", "Standard"], ["premium", "Premium"]].map(([v, l]) => (
              <button key={v} onClick={() => setPlano(v)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${plano === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? <p className="text-center text-gray-400 py-10 text-sm">A carregar...</p> :
           list.length === 0 ? <p className="text-center text-gray-400 py-10 text-sm">Sem clientes.</p> :
           list.map((c) => (
            <button key={c.id} onClick={() => abrirDetalhe(c)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${activo?.id === c.id ? "bg-blue-50" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{c.nome}</p>
                  <p className="text-[11px] text-gray-400 font-mono">{c.codigo}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${PLANO_COLOR[c.plano] ?? "bg-gray-100 text-gray-600"}`}>
                  {c.plano}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                <span>{c.facturas_total ?? 0} fact.</span>
                <span className={`font-semibold ${(c.valor_pendente ?? 0) > 0 ? "text-orange-600" : "text-gray-400"}`}>
                  {(c.valor_pendente ?? 0) > 0 ? `${formatAOA(c.valor_pendente)} pend.` : "Em dia"}
                </span>
              </div>
              {!c.ativo && <span className="inline-block mt-1 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Pendente</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {!activo ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p className="text-sm">Selecciona um cliente.</p>
          </div>
        ) : !detalhe ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{detalhe.cliente.nome}</h2>
                  <p className="text-xs text-gray-500 font-mono">{detalhe.cliente.codigo} · {detalhe.cliente.email}</p>
                </div>
                <div className="flex gap-2">
                  {!editing ? (
                    <button onClick={() => setEditing(true)}
                      className="text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                      <Edit3 size={12} /> Editar facturação
                    </button>
                  ) : (
                    <>
                      <button onClick={guardar} disabled={saving}
                        className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
                      </button>
                      <button onClick={() => { setEditing(false); abrirDetalhe(activo); }}
                        className="text-xs font-semibold border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        <X size={12} /> Cancelar
                      </button>
                    </>
                  )}
                  <button onClick={emitirFactura} disabled={gerando}
                    className="text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5">
                    {gerando ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Emitir factura
                  </button>
                </div>
              </div>

              {/* Assinatura activa */}
              {detalhe.assinatura_ativa && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase text-blue-700 font-semibold mb-0.5">Assinatura activa</p>
                    <p className="text-sm font-bold text-gray-800 capitalize">
                      {detalhe.assinatura_ativa.plano?.nome ?? detalhe.assinatura_ativa.plano?.codigo}
                      <span className="ml-2 text-xs font-normal text-gray-600">desde {new Date(detalhe.assinatura_ativa.data_inicio).toLocaleDateString("pt-AO")}</span>
                    </p>
                    {detalhe.assinatura_ativa.estado === "trial" && detalhe.assinatura_ativa.data_fim_trial && (
                      <p className="text-xs text-blue-700 mt-0.5">Trial termina em {new Date(detalhe.assinatura_ativa.data_fim_trial).toLocaleDateString("pt-AO")}</p>
                    )}
                  </div>
                  <button onClick={() => setMudancaForm({ plano_id: "", preco_custom: "", desconto_pct: "", imediato: false })}
                    className="text-xs font-semibold border border-blue-300 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                    <ArrowRightLeft size={12} /> Mudar plano
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Plano</p>
                  <p className={`text-sm font-bold capitalize ${PLANO_COLOR[detalhe.cliente.plano] ?? ""} inline-block px-2 py-0.5 rounded`}>{detalhe.cliente.plano}</p>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Valor mensal</p>
                  <p className="text-sm font-bold text-gray-800">{formatAOA(detalhe.valor_mensal)}</p>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Pago total</p>
                  <p className="text-sm font-bold text-green-700">{formatAOA(detalhe.totais.pago_total)}</p>
                </div>
                <div className="bg-gray-50 border rounded-lg p-3">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold mb-0.5">Pendente</p>
                  <p className="text-sm font-bold text-orange-600">{formatAOA(detalhe.totais.pendente_total)}</p>
                </div>
              </div>

              {/* Form de facturação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {[
                  ["NIF", "nif", "text"],
                  ["Telefone", "telefone", "text"],
                  ["Endereço", "endereco", "text"],
                  ["Email facturação", "email_facturacao", "email"],
                  ["Responsável facturação", "responsavel_facturacao", "text"],
                  ["Dia de vencimento", "dia_vencimento", "number", { min: 1, max: 28 }],
                  ["Valor mensal personalizado (AOA)", "valor_mensal", "number", { min: 0, step: "0.01", placeholder: "vazio = preço do plano" }],
                  ["Desconto (%)", "desconto_pct", "number", { min: 0, max: 100, step: "0.01" }],
                ].map(([label, field, type, extra = {}]) => (
                  <div key={field}>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">{label}</label>
                    <input type={type} value={form[field] ?? ""} onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      disabled={!editing} {...extra}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-600" />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Notas internas</label>
                  <textarea rows={2} value={form.notas_facturacao || ""} onChange={(e) => setForm({ ...form, notas_facturacao: e.target.value })}
                    disabled={!editing}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50" />
                </div>
              </div>
            </div>

            {/* Histórico de facturas */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Facturas ({detalhe.facturas.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Nº</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Período</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {detalhe.facturas.map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2 font-mono text-xs">{f.numero}</td>
                      <td className="px-5 py-2 text-xs text-gray-600">
                        {new Date(f.periodo_inicio).toLocaleDateString("pt-AO", { month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-2 text-right font-semibold">{formatAOA(f.total)}</td>
                      <td className="px-5 py-2 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          f.estado === "paga" ? "bg-green-100 text-green-700" :
                          f.estado === "anulada" ? "bg-gray-100 text-gray-500" :
                          "bg-yellow-100 text-yellow-700"}`}>
                          {f.estado}
                        </span>
                      </td>
                      <td className="px-5 py-2 text-center">
                        <button onClick={async () => {
                          const r = await api.get(`/facturas/${f.id}/pdf`, { responseType: "blob" });
                          const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
                          window.open(url, "_blank");
                        }} className="text-blue-600 hover:underline text-xs">PDF</button>
                      </td>
                    </tr>
                  ))}
                  {detalhe.facturas.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Sem facturas emitidas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Modal: mudar plano */}
      {mudancaForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setMudancaForm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800">Mudar plano</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {mudancaForm.imediato
                  ? "A mudança é aplicada hoje — a assinatura actual termina já e a nova arranca no momento."
                  : "A nova assinatura inicia no 1º dia do próximo mês. A actual termina no fim deste mês."}
              </p>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Novo plano *</label>
                <select value={mudancaForm.plano_id} onChange={(e) => setMudancaForm({ ...mudancaForm, plano_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">— selecciona —</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} — {formatAOA(p.preco_mensal)}/mês</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Preço custom (AOA)</label>
                  <input type="number" min="0" step="0.01" value={mudancaForm.preco_custom}
                    onChange={(e) => setMudancaForm({ ...mudancaForm, preco_custom: e.target.value })}
                    placeholder="vazio = preço do plano"
                    className="w-full px-3 py-2 text-sm border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Desconto (%)</label>
                  <input type="number" min="0" max="100" step="0.01" value={mudancaForm.desconto_pct}
                    onChange={(e) => setMudancaForm({ ...mudancaForm, desconto_pct: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg" />
                </div>
              </div>
              <label className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors
                ${mudancaForm.imediato ? "bg-orange-50 border-orange-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                <input type="checkbox" checked={!!mudancaForm.imediato}
                  onChange={(e) => setMudancaForm({ ...mudancaForm, imediato: e.target.checked })}
                  className="mt-0.5 accent-orange-600" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-800">Aplicar imediatamente</p>
                  <p className="text-gray-500">Marca esta opção para downgrade/upgrade que tem de aplicar já.
                    O cliente deve fazer logout/login para o frontend dele apanhar o novo plano.</p>
                </div>
              </label>
            </div>
            <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setMudancaForm(null)}
                className="text-xs font-semibold border border-gray-300 hover:bg-white text-gray-700 px-3 py-2 rounded-md">Cancelar</button>
              <button onClick={aplicarMudancaPlano} disabled={mudando || !mudancaForm.plano_id}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md flex items-center gap-1.5">
                {mudando ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightLeft size={12} />}
                Confirmar mudança
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
