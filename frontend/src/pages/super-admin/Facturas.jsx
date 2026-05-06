import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Search, FileText, CheckCircle2, XCircle, CreditCard, Loader2, AlertCircle, Receipt, ExternalLink, RefreshCw } from "lucide-react";

const ESTADO_BADGE = {
  paga:     "bg-green-100 text-green-700",
  pendente: "bg-yellow-100 text-yellow-700",
  vencida:  "bg-red-100 text-red-700",
  anulada:  "bg-gray-100 text-gray-500",
};

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

export default function SuperAdminFacturas() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [list, setList] = useState([]);
  const [totais, setTotais] = useState({ pendente: 0, pago_mes: 0, vencidas: 0 });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("");
  const [activo, setActivo] = useState(null);
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [showPagar, setShowPagar] = useState(false);
  const [pagarForm, setPagarForm] = useState({ metodo: "transferencia", transacao_ref: "" });

  async function carregar() {
    setLoading(true);
    try {
      const params = {};
      if (busca) params.q = busca;
      if (estado) params.estado = estado;
      const { data } = await api.get("/facturas", { params });
      setList(data.facturas?.data ?? []);
      setTotais(data.totais ?? { pendente: 0, pago_mes: 0, vencidas: 0 });
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, [busca, estado]);

  async function abrirDetalhe(f) {
    setActivo(null);
    setShowPagar(false);
    const { data } = await api.get(`/facturas/${f.id}`);
    setActivo(data);
  }

  async function pdf(idFactura) {
    const r = await api.get(`/facturas/${idFactura}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
    window.open(url, "_blank");
  }

  async function pdfComprovativo(idComp) {
    const r = await api.get(`/comprovativos/${idComp}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
    window.open(url, "_blank");
  }

  async function gerarReferencia() {
    if (!activo) return;
    setAcaoLoading(true);
    try {
      await api.post(`/facturas/${activo.id}/referencia`);
      await abrirDetalhe(activo);
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || "Falha ao gerar referência.");
    } finally { setAcaoLoading(false); }
  }

  async function marcarPaga() {
    if (!activo) return;
    setAcaoLoading(true);
    try {
      await api.post(`/facturas/${activo.id}/marcar-paga`, pagarForm);
      await abrirDetalhe(activo);
      setShowPagar(false);
      setPagarForm({ metodo: "transferencia", transacao_ref: "" });
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || "Falha ao marcar como paga.");
    } finally { setAcaoLoading(false); }
  }

  async function emitirVendus() {
    if (!activo) return;
    setAcaoLoading(true);
    try {
      const { data } = await api.post(`/facturas/${activo.id}/vendus/emitir`);
      if (!data.ok) alert(data.erro || "Falhou a emissão Vendus.");
      await abrirDetalhe(activo);
      carregar();
    } catch (e) {
      alert(e?.response?.data?.erro || e?.response?.data?.message || "Falhou a emissão Vendus.");
    } finally { setAcaoLoading(false); }
  }

  async function anular() {
    if (!activo) return;
    const motivo = prompt("Motivo da anulação:");
    if (motivo === null) return;
    setAcaoLoading(true);
    try {
      await api.post(`/facturas/${activo.id}/anular`, { motivo });
      await abrirDetalhe(activo);
      carregar();
    } finally { setAcaoLoading(false); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Facturação</h1>
        <p className="text-sm text-gray-500 mt-0.5">Facturas emitidas a clientes Educajá.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{formatAOA(totais.pendente)}</p>
            <p className="text-xs text-gray-500">Pendente</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{formatAOA(totais.pago_mes)}</p>
            <p className="text-xs text-gray-500">Pago este mês</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-800">{totais.vencidas}</p>
            <p className="text-xs text-gray-500">Vencidas</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar por nº, cliente ou NIF..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">Todos os estados</option>
            <option value="pendente">Pendentes</option>
            <option value="paga">Pagas</option>
            <option value="anulada">Anuladas</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Nº</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Plano</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Vencimento</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Total</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Acção</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">A carregar...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">Sem facturas.</td></tr>
            ) : list.map((f) => {
              const vencida = f.vencida;
              const estadoEff = vencida ? "vencida" : f.estado;
              return (
                <tr key={f.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => abrirDetalhe(f)}>
                  <td className="px-5 py-2.5 font-mono text-xs">{f.numero}</td>
                  <td className="px-5 py-2.5">
                    <p className="font-medium text-gray-800">{f.cliente_nome}</p>
                    <p className="text-xs text-gray-400 font-mono">{f.escola?.codigo}</p>
                  </td>
                  <td className="px-5 py-2.5 capitalize text-xs">{f.plano}</td>
                  <td className="px-5 py-2.5 text-xs text-gray-600">{new Date(f.data_vencimento).toLocaleDateString("pt-AO")}</td>
                  <td className="px-5 py-2.5 text-right font-semibold">{formatAOA(f.total)}</td>
                  <td className="px-5 py-2.5 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[estadoEff] ?? ESTADO_BADGE.pendente}`}>
                      {estadoEff}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); pdf(f.id); }}
                        className="text-xs text-blue-600 hover:underline">PDF</button>
                      {f.vendus_document_id ? (
                        <span title={`Emitida no Vendus${f.vendus_numero ? ` — ${f.vendus_numero}` : ""}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <Receipt size={10} /> Vendus
                        </span>
                      ) : f.vendus_erro ? (
                        <span title={f.vendus_erro}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
                          <AlertCircle size={10} /> Vendus
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detalhe modal */}
      {activo && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setActivo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="font-bold text-gray-800 font-mono">{activo.numero}</h2>
                <p className="text-xs text-gray-500">{activo.cliente_nome}</p>
              </div>
              <button onClick={() => setActivo(null)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-gray-500">Período:</span><br />
                  {new Date(activo.periodo_inicio).toLocaleDateString("pt-AO")} – {new Date(activo.periodo_fim).toLocaleDateString("pt-AO")}
                </div>
                <div><span className="text-xs text-gray-500">Plano:</span><br /><span className="capitalize font-semibold">{activo.plano}</span></div>
                <div><span className="text-xs text-gray-500">Emissão:</span><br />{new Date(activo.data_emissao).toLocaleDateString("pt-AO")}</div>
                <div><span className="text-xs text-gray-500">Vencimento:</span><br />{new Date(activo.data_vencimento).toLocaleDateString("pt-AO")}</div>
              </div>

              <div className="bg-gray-50 border rounded-lg p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatAOA(activo.subtotal)}</span></div>
                {Number(activo.desconto_valor) > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Desconto ({activo.desconto_pct}%)</span><span>−{formatAOA(activo.desconto_valor)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>IVA ({activo.iva_taxa}%)</span><span>{formatAOA(activo.iva_valor)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1.5 border-t">
                  <span>Total</span><span>{formatAOA(activo.total)}</span>
                </div>
              </div>

              {/* Referências */}
              {activo.referencias && activo.referencias.length > 0 && (
                <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 uppercase mb-2">Referência Multicaixa</p>
                  {(() => {
                    const r = [...activo.referencias].sort((a, b) => b.id - a.id)[0];
                    return (
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div><p className="text-[10px] text-blue-600">Entidade</p><p className="font-mono font-bold">{r.entidade}</p></div>
                        <div><p className="text-[10px] text-blue-600">Referência</p><p className="font-mono font-bold">{r.referencia}</p></div>
                        <div><p className="text-[10px] text-blue-600">Estado</p><p className="font-semibold capitalize">{r.estado}</p></div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Vendus */}
              {(activo.vendus_document_id || activo.vendus_erro) && (
                <div className={`border rounded-lg p-4 flex items-center justify-between
                  ${activo.vendus_document_id ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div>
                    <p className={`text-xs font-semibold uppercase ${activo.vendus_document_id ? "text-emerald-800" : "text-red-800"}`}>
                      {activo.vendus_document_id ? "Emitida no Vendus" : "Vendus — falha"}
                    </p>
                    {activo.vendus_numero && <p className="text-sm font-mono mt-1">{activo.vendus_numero}</p>}
                    {activo.vendus_emitido_em && (
                      <p className="text-xs text-emerald-700">{new Date(activo.vendus_emitido_em).toLocaleString("pt-AO")}</p>
                    )}
                    {activo.vendus_erro && !activo.vendus_document_id && (
                      <p className="text-xs text-red-700 mt-1">{activo.vendus_erro}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activo.vendus_pdf_url && (
                      <a href={activo.vendus_pdf_url} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
                        <ExternalLink size={12} /> PDF Vendus
                      </a>
                    )}
                    {!activo.vendus_document_id && (
                      <button onClick={emitirVendus} disabled={acaoLoading}
                        className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
                        {acaoLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Re-emitir
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Comprovativo */}
              {activo.comprovativo && (
                <div className="border rounded-lg p-4 bg-green-50 border-green-200 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-800 uppercase">Recibo emitido</p>
                    <p className="text-sm font-mono mt-1">{activo.comprovativo.numero}</p>
                    <p className="text-xs text-green-700">{new Date(activo.comprovativo.data_emissao).toLocaleDateString("pt-AO")}</p>
                  </div>
                  <button onClick={() => pdfComprovativo(activo.comprovativo.id)}
                    className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center gap-1.5">
                    <Receipt size={14} /> Ver recibo
                  </button>
                </div>
              )}

              {/* Pagar form */}
              {showPagar && (
                <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-800 uppercase mb-3">Confirmar pagamento</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Método</label>
                      <select value={pagarForm.metodo} onChange={(e) => setPagarForm({ ...pagarForm, metodo: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg">
                        <option value="transferencia">Transferência bancária</option>
                        <option value="referencia_multicaixa">Referência Multicaixa</option>
                        <option value="multicaixa_express">Multicaixa Express</option>
                        <option value="numerario">Numerário</option>
                        <option value="manual">Outro / Manual</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Referência da transacção</label>
                      <input value={pagarForm.transacao_ref} onChange={(e) => setPagarForm({ ...pagarForm, transacao_ref: e.target.value })}
                        className="w-full px-3 py-2 text-sm border rounded-lg" />
                    </div>
                  </div>
                </div>
              )}

              {/* Acções */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => pdf(activo.id)}
                  className="text-xs font-semibold border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md flex items-center gap-1.5">
                  <FileText size={12} /> PDF da factura
                </button>
                {!activo.vendus_document_id && activo.estado !== "anulada" && (
                  <button onClick={emitirVendus} disabled={acaoLoading}
                    className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-2 rounded-md flex items-center gap-1.5">
                    {acaoLoading ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />} Emitir no Vendus
                  </button>
                )}
                {activo.estado === "pendente" && (
                  <>
                    <button onClick={gerarReferencia} disabled={acaoLoading}
                      className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 rounded-md flex items-center gap-1.5">
                      {acaoLoading ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />} Gerar referência
                    </button>
                    {!showPagar ? (
                      <button onClick={() => setShowPagar(true)}
                        className="text-xs font-semibold bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md flex items-center gap-1.5">
                        <CheckCircle2 size={12} /> Marcar paga
                      </button>
                    ) : (
                      <button onClick={marcarPaga} disabled={acaoLoading}
                        className="text-xs font-semibold bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-2 rounded-md flex items-center gap-1.5">
                        {acaoLoading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Confirmar
                      </button>
                    )}
                    <button onClick={anular} disabled={acaoLoading}
                      className="text-xs font-semibold border border-red-200 hover:bg-red-50 text-red-700 px-3 py-2 rounded-md flex items-center gap-1.5">
                      <XCircle size={12} /> Anular
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
