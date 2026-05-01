import { useState, useEffect } from "react";
import { Printer, Mail, MessageCircle } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { imprimirRecibo } from "../../components/Recibo";
import { useMeses } from "../../hooks/useMeses";
import SaftButton from "../../components/SaftButton";

const TIPO_LABEL = { mensalidade: "Mensalidade", matricula: "Matrícula", emolumento: "Emolumento", outro: "Outro" };

function formatMesRef(mr, meses) {
  if (!mr || !meses?.length) return mr || "";
  let m = mr.match(/^(\d{4})-(\d{4})-(\d{1,2})$/);
  if (m) { const n = meses.find(x => x.id === Number(m[3]))?.nome; return n ? `${n} ${m[1]}-${m[2]}` : mr; }
  m = mr.match(/^(\d{4})-(\d{1,2})$/);
  if (m) { const n = meses.find(x => x.id === Number(m[2]))?.nome; return n ? `${n} ${m[1]}` : mr; }
  return mr;
}

export default function Pagamentos() {
  const { escola } = useAuthStore();
  const meses = useMeses();

  const [pagamentos, setPagamentos] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("lista");
  const [alunos, setAlunos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ aluno_id:"", plano_id:"", valor:"", tipo:"mensalidade", mes_referencia:"", metodo:"dinheiro", data_vencimento:"" });

  const [selected, setSelected] = useState([]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState({ metodo:"dinheiro", data_pagamento: new Date().toISOString().split("T")[0] });
  const [bulkLoading, setBulkLoading] = useState(false);

  const ANO_ATUAL = new Date().getFullYear();
  const ANOS = [ANO_ATUAL - 3, ANO_ATUAL - 2, ANO_ATUAL - 1, ANO_ATUAL, ANO_ATUAL + 1];
  const [anoFiltro,    setAnoFiltro]    = useState(String(ANO_ATUAL));
  const [busca,        setBusca]        = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroTipo,   setFiltroTipo]   = useState("");
  const [sort, setSort] = useState({ col: "data_pagamento", dir: "desc" });

  const toggleSort = (col) =>
    setSort(s => s.col === col ? { col, dir: s.dir === "desc" ? "asc" : "asc" === s.dir ? "desc" : "asc" } : { col, dir: "desc" });

  const sortIcon = (col) => sort.col !== col ? " ↕" : sort.dir === "desc" ? " ↓" : " ↑";

  const pagamentosFiltrados = pagamentos.filter(p => {
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (filtroTipo   && p.tipo   !== filtroTipo)   return false;
    if (busca) {
      const q = busca.toLowerCase();
      const nome = (p.aluno?.user?.nome ?? "").toLowerCase();
      const ref  = (p.referencia ?? "").toLowerCase();
      const obs  = (p.observacao ?? "").toLowerCase();
      if (!nome.includes(q) && !ref.includes(q) && !obs.includes(q)) return false;
    }
    return true;
  });

  const pagamentosOrdenados = [...pagamentosFiltrados].sort((a, b) => {
    let va = a[sort.col] ?? "";
    let vb = b[sort.col] ?? "";
    if (sort.col === "valor") { va = Number(va); vb = Number(vb); }
    if (va < vb) return sort.dir === "asc" ? -1 : 1;
    if (va > vb) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmForm, setConfirmForm] = useState({ metodo:"dinheiro", data_pagamento: new Date().toISOString().split("T")[0] });
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [showEstorno, setShowEstorno] = useState(false);
  const [estornoTarget, setEstornoTarget] = useState(null);
  const [estornoMotivo, setEstornoMotivo] = useState("");
  const [estornoLoading, setEstornoLoading] = useState(false);

  const confirmaveis = pagamentos.filter(p => p.status === "pendente" || p.status === "vencido" || p.status === "estornado");
  const allSelected  = confirmaveis.length > 0 && selected.length === confirmaveis.length;

  const selectedPagamentos  = pagamentos.filter(p => selected.includes(p.id));
  const selecaoSoPagos      = selectedPagamentos.length > 0 && selectedPagamentos.every(p => p.status === "pago");
  const selecaoSoPendentes  = selectedPagamentos.length > 0 && selectedPagamentos.every(p => p.status === "pendente" || p.status === "vencido" || p.status === "estornado");

  const load = async () => {
    setLoading(true);
    const q = new URLSearchParams({ per_page: 200 });
    if (anoFiltro) q.append("ano_letivo", anoFiltro);
    const qs = `?${q}`;
    const [pRes, rRes] = await Promise.all([
      api.get(`/pagamentos${qs}`),
      api.get(`/pagamentos/relatorio${qs}`),
    ]);
    setPagamentos(pRes.data.data || pRes.data);
    setStats(rRes.data);
    setLoading(false);
    setSelected([]);
  };

  useEffect(() => {
    load();
    api.get("/alunos").then(r => setAlunos(r.data.data || r.data));
    api.get("/planos-pagamento").then(r => setPlanos(r.data));
  }, [anoFiltro]);

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(allSelected ? [] : confirmaveis.map(p => p.id));

  const abrirConfirmar = (pag) => {
    setConfirmTarget(pag);
    setConfirmForm({ metodo: "dinheiro", data_pagamento: new Date().toISOString().split("T")[0] });
    setShowConfirm(true);
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    setConfirmLoading(true);
    try {
      const res = await api.patch(`/pagamentos/${confirmTarget.id}/pagar`, confirmForm);
      setShowConfirm(false);
      load();
      imprimirRecibo(res.data.pagamento, escola);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleBulkConfirm = async (e) => {
    e.preventDefault();
    setBulkLoading(true);
    try {
      const res = await api.post("/pagamentos/pagar-multiplos", { ids: selected, ...bulkForm });
      setShowBulk(false);
      load();
      if (res.data.pagamentos?.length > 0) {
        imprimirRecibo(res.data.pagamentos, escola);
      }
    } finally {
      setBulkLoading(false);
    }
  };

  const abrirEstorno = (pag) => {
    setEstornoTarget(pag);
    setEstornoMotivo("");
    setShowEstorno(true);
  };

  const handleEstornar = async (e) => {
    e.preventDefault();
    setEstornoLoading(true);
    try {
      await api.patch(`/pagamentos/${estornoTarget.id}/estornar`, { motivo: estornoMotivo });
      setShowEstorno(false);
      load();
    } finally {
      setEstornoLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await api.post("/pagamentos", form);
    setShowForm(false); load();
  };

  const enviarLembrete = async (p, canal) => {
    try {
      const r = await api.post(`/pagamentos/${p.id}/lembrete`, { canal });
      alert(r.data.message);
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao enviar lembrete.");
    }
  };

  const statusColor = {
    pago:      "bg-green-100 text-green-700",
    pendente:  "bg-yellow-100 text-yellow-700",
    vencido:   "bg-red-100 text-red-700",
    cancelado: "bg-gray-100 text-gray-500",
    estornado: "bg-purple-100 text-purple-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">💰 Finanças & Propinas</h1>
        <SaftButton variant="outline"/>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-600">Total Pago</p>
          <p className="text-2xl font-bold text-green-700">{Number(stats.total_pago||0).toLocaleString("pt-AO")} Kz</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="text-sm text-yellow-600">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-700">{Number(stats.total_pendente||0).toLocaleString("pt-AO")} Kz</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-red-600">Alunos Inadimplentes</p>
          <p className="text-2xl font-bold text-red-700">{stats.total_alunos_inadimplentes||0}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 space-y-3">
        {/* Linha 1: tabs + ano + botões de acção */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 items-center">
            <button onClick={()=>setTab("lista")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==="lista"?"bg-blue-800 text-white":"bg-white text-gray-600 border"}`}>Pagamentos</button>
            <button onClick={()=>setTab("planos")} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==="planos"?"bg-blue-800 text-white":"bg-white text-gray-600 border"}`}>Planos</button>
            <select
              value={anoFiltro}
              onChange={e => { setAnoFiltro(e.target.value); setFiltroStatus(""); setFiltroTipo(""); setBusca(""); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700"
            >
              <option value="">Todos os anos</option>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {selecaoSoPagos && (
              <button onClick={() => imprimirRecibo(selectedPagamentos, escola)}
                className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-500 text-sm font-medium">
                <Printer size={15} /> Reimprimir {selected.length} recibo{selected.length !== 1 ? "s" : ""}
              </button>
            )}
            {selecaoSoPendentes && (
              <button onClick={() => setShowBulk(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 text-sm font-medium">
                ✅ Confirmar {selected.length} selecionado{selected.length !== 1 ? "s" : ""}
              </button>
            )}
            <button onClick={() => setShowForm(true)} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
              + Registar Pagamento
            </button>
          </div>
        </div>

        {/* Linha 2: pesquisa + filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Pesquisa */}
          <div className="relative flex-1 min-w-[200px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Pesquisar por aluno, referência ou descrição..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          {/* Filtro estado */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { v:"",          l:"Todos"    },
              { v:"pago",      l:"Pago"     },
              { v:"pendente",  l:"Pendente" },
              { v:"vencido",   l:"Vencido"  },
              { v:"estornado", l:"Estornado"},
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setFiltroStatus(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                  ${filtroStatus === v ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {l}
              </button>
            ))}
          </div>

          {/* Filtro tipo */}
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos os tipos</option>
            <option value="mensalidade">Propina</option>
            <option value="emolumento">Emolumento</option>
            <option value="matricula">Matrícula</option>
            <option value="outro">Outro</option>
          </select>

          {/* Contador */}
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {pagamentosOrdenados.length} resultado{pagamentosOrdenados.length !== 1 ? "s" : ""}
          </span>

          {/* Limpar filtros */}
          {(busca || filtroStatus || filtroTipo) && (
            <button onClick={() => { setBusca(""); setFiltroStatus(""); setFiltroTipo(""); }}
              className="text-xs text-red-500 hover:text-red-700 underline whitespace-nowrap">
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? <p className="text-center text-gray-500 py-12">A carregar...</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300" title="Seleccionar todos os pendentes" />
                </th>
                {[
                  { label: "Referência",   col: "referencia",      cls: "text-left" },
                  { label: "Aluno",        col: null,              cls: "text-left" },
                  { label: "Descrição",     col: "tipo",            cls: "text-left" },
                  { label: "Mês",          col: "mes_referencia",  cls: "text-left" },
                  { label: "Data Pag.",    col: "data_pagamento",  cls: "text-left" },
                  { label: "Valor",        col: "valor",           cls: "text-right" },
                  { label: "Estado",       col: "status",          cls: "text-center" },
                  { label: "Acções",       col: null,              cls: "text-center" },
                ].map(({ label, col, cls }) => (
                  <th key={label}
                    className={`px-6 py-3 text-xs font-semibold text-gray-500 uppercase ${cls} ${col ? "cursor-pointer select-none hover:text-gray-800" : ""}`}
                    onClick={() => col && toggleSort(col)}>
                    {label}{col ? sortIcon(col) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagamentosOrdenados.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${selected.includes(p.id) ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-4 text-center">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} className="rounded border-gray-300" />
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-500">{p.referencia}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{p.aluno?.user?.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="font-medium">
                      {p.propina?.nome || p.emolumento?.nome || p.plano?.nome || p.observacao || TIPO_LABEL[p.tipo] || p.tipo}
                    </div>
                    {(p.propina?.nivel || p.propina?.turno) && (
                      <div className="text-xs text-gray-500">{[p.propina.nivel, p.propina.turno].filter(Boolean).join(" · ")}</div>
                    )}
                    <div className="text-xs text-gray-400 capitalize">{TIPO_LABEL[p.tipo] || p.tipo}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatMesRef(p.mes_referencia, meses) || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-AO") : "—"}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-right">{Number(p.valor).toLocaleString("pt-AO")} Kz</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      {(p.status === "pendente" || p.status === "vencido" || p.status === "estornado") && (
                        <button onClick={() => abrirConfirmar(p)} className="text-blue-600 hover:underline text-sm">
                          ✅ Confirmar
                        </button>
                      )}
                      {(p.status === "pendente" || p.status === "vencido") && (<>
                        <button onClick={() => enviarLembrete(p, "email")} title="Enviar lembrete por email"
                          className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Mail size={16} />
                        </button>
                        <button onClick={() => enviarLembrete(p, "sms")} title="Enviar lembrete por SMS"
                          className="text-slate-400 hover:text-emerald-600 transition-colors">
                          <MessageCircle size={16} />
                        </button>
                      </>)}
                      {p.status === "pago" && (<>
                        <button onClick={() => imprimirRecibo(p, escola)} title="Imprimir recibo" className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => abrirEstorno(p)} title="Estornar pagamento" className="text-purple-400 hover:text-purple-700 transition-colors text-xs font-medium">
                          ↩
                        </button>
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
              {pagamentosOrdenados.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  {pagamentos.length === 0 ? "Nenhum pagamento registado." : "Nenhum resultado para os filtros aplicados."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: confirmar pagamento individual */}
      {showConfirm && confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Confirmar Pagamento</h2>
              <button onClick={() => setShowConfirm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 pt-4">
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1">
                <p><span className="text-slate-500">Aluno:</span> <strong>{confirmTarget.aluno?.user?.nome}</strong></p>
                <p><span className="text-slate-500">Referência:</span> <span className="font-mono">{confirmTarget.referencia}</span></p>
                <p><span className="text-slate-500">Valor:</span> <strong>{Number(confirmTarget.valor).toLocaleString("pt-AO")} Kz</strong></p>
              </div>
            </div>
            <form onSubmit={handleConfirmar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento *</label>
                <select required value={confirmForm.metodo} onChange={e => setConfirmForm({...confirmForm, metodo: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="multicaixa">Multicaixa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Pagamento *</label>
                <input type="date" required value={confirmForm.data_pagamento} onChange={e => setConfirmForm({...confirmForm, data_pagamento: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Printer size={12} /> Após confirmar, a factura-recibo será gerada automaticamente.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowConfirm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={confirmLoading} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-500 disabled:opacity-60">
                  {confirmLoading ? "A processar..." : "✅ Confirmar & Imprimir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: confirmar múltiplos */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Confirmar {selected.length} Pagamento{selected.length !== 1 ? "s" : ""}</h2>
              <button onClick={() => setShowBulk(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={handleBulkConfirm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pagamento *</label>
                <select required value={bulkForm.metodo} onChange={e => setBulkForm({...bulkForm, metodo: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="multicaixa">Multicaixa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Pagamento *</label>
                <input type="date" required value={bulkForm.data_pagamento} onChange={e => setBulkForm({...bulkForm, data_pagamento: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <p className="text-sm text-gray-500">
                Total: <strong>{pagamentos.filter(p => selected.includes(p.id)).reduce((s,p) => s+p.valor, 0).toLocaleString("pt-AO")} Kz</strong>
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Printer size={12} /> Os recibos serão gerados automaticamente após confirmação.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowBulk(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={bulkLoading} className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-500 disabled:opacity-60">
                  {bulkLoading ? "A processar..." : "✅ Confirmar & Imprimir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: estorno */}
      {showEstorno && estornoTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-purple-700">↩ Estornar Pagamento</h2>
              <button onClick={() => setShowEstorno(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="px-6 pt-4">
              <div className="bg-purple-50 rounded-xl p-4 text-sm space-y-1 border border-purple-100">
                <p><span className="text-slate-500">Aluno:</span> <strong>{estornoTarget.aluno?.user?.nome}</strong></p>
                <p><span className="text-slate-500">Referência:</span> <span className="font-mono">{estornoTarget.referencia}</span></p>
                <p><span className="text-slate-500">Valor:</span> <strong>{Number(estornoTarget.valor).toLocaleString("pt-AO")} Kz</strong></p>
              </div>
              <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-lg p-2 border border-amber-100">
                ⚠️ O pagamento voltará ao estado <strong>estornado</strong>. Esta acção fica registada.
              </p>
            </div>
            <form onSubmit={handleEstornar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do Estorno *</label>
                <textarea
                  required minLength={5} rows={3}
                  value={estornoMotivo}
                  onChange={e => setEstornoMotivo(e.target.value)}
                  placeholder="Descreva o motivo do estorno..."
                  className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEstorno(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={estornoLoading} className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-500 disabled:opacity-60">
                  {estornoLoading ? "A processar..." : "↩ Confirmar Estorno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: registar pagamento */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Registar Pagamento</h2>
              <button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Aluno *</label>
                <select required value={form.aluno_id} onChange={e=>setForm({...form,aluno_id:e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Seleccionar...</option>
                  {alunos.map(a => <option key={a.id} value={a.id}>{a.user?.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                <select value={form.plano_id} onChange={e=>setForm({...form,plano_id:e.target.value})} className="w-full border rounded-lg px-3 py-2">
                  <option value="">Seleccionar...</option>
                  {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})} className="w-full border rounded-lg px-3 py-2">
                    <option value="mensalidade">Mensalidade</option>
                    <option value="matricula">Matrícula</option>
                    <option value="emolumento">Emolumento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mês Ref.</label>
                  <input value={form.mes_referencia} onChange={e=>setForm({...form,mes_referencia:e.target.value})} placeholder="Ex: 2025-01" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (Kz) *</label>
                  <input type="number" required value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                  <input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-800 text-white py-2 rounded-lg">Registar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
