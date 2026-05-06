import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useCentralAuth } from "../../store/centralAuth";
import { Search, Pause, Play, XCircle, ArrowRight, TrendingUp, Loader2 } from "lucide-react";

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

const ESTADO_BADGE = {
  ativa:      "bg-green-100 text-green-700",
  trial:      "bg-blue-100 text-blue-700",
  suspensa:   "bg-orange-100 text-orange-700",
  cancelada:  "bg-red-100 text-red-700",
  expirada:   "bg-gray-100 text-gray-500",
};

export default function SuperAdminAssinaturas() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [list, setList] = useState([]);
  const [totais, setTotais] = useState({ ativas: 0, trial: 0, suspensas: 0, canceladas: 0, mrr: 0 });
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("");
  const [planoId, setPlanoId] = useState("");
  const [accao, setAccao] = useState({ id: null, tipo: null, motivo: "", imediato: false });
  const [aLoading, setALoading] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const params = {};
      if (busca) params.q = busca;
      if (estado) params.estado = estado;
      if (planoId) params.plano_id = planoId;
      const { data } = await api.get("/assinaturas", { params });
      setList(data.assinaturas?.data || []);
      setTotais(data.totais);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    api.get("/planos-admin").then((r) => setPlanos(r.data));
  }, []);

  useEffect(() => { carregar(); }, [busca, estado, planoId]);

  async function aplicarAccao() {
    if (!accao.id || !accao.tipo) return;
    setALoading(true);
    try {
      const url = `/assinaturas/${accao.id}/${accao.tipo}`;
      const payload = accao.tipo === "cancelar" ? { motivo: accao.motivo, imediato: accao.imediato } :
                      accao.tipo === "suspender" ? { motivo: accao.motivo } : {};
      await api.post(url, payload);
      setAccao({ id: null, tipo: null, motivo: "", imediato: false });
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || "Falha na operação.");
    } finally { setALoading(false); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Assinaturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Subscrições activas, trials, suspensas e canceladas.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Activas",    value: totais.ativas,    color: "bg-green-600" },
          { label: "Em trial",   value: totais.trial,     color: "bg-blue-500" },
          { label: "Suspensas",  value: totais.suspensas, color: "bg-orange-500" },
          { label: "Canceladas", value: totais.canceladas,color: "bg-red-500" },
          { label: "MRR",        value: formatAOA(totais.mrr), color: "bg-indigo-600", isMoney: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border p-4">
            <p className="text-[10px] uppercase text-gray-500 font-semibold mb-1">{s.label}</p>
            <p className={`font-bold ${s.isMoney ? "text-base" : "text-2xl"} text-gray-800`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar escola..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">Todos os estados</option>
            <option value="ativa">Activas</option>
            <option value="trial">Em trial</option>
            <option value="suspensa">Suspensas</option>
            <option value="cancelada">Canceladas</option>
            <option value="expirada">Expiradas</option>
          </select>
          <select value={planoId} onChange={(e) => setPlanoId(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">Todos os planos</option>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Escola</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Plano</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Início</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">A carregar...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Sem assinaturas.</td></tr>
            ) : list.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-5 py-2.5">
                  <Link to="/super-admin/clientes" className="font-medium text-gray-800 hover:text-blue-600">{a.escola?.nome}</Link>
                  <p className="text-xs text-gray-400 font-mono">{a.escola?.codigo}</p>
                </td>
                <td className="px-5 py-2.5 capitalize">{a.plano?.nome ?? a.plano?.codigo}</td>
                <td className="px-5 py-2.5 text-right font-semibold">
                  {formatAOA(a.preco_aplicado)}
                  {Number(a.desconto_pct) > 0 && <span className="block text-[10px] text-green-600">−{a.desconto_pct}%</span>}
                </td>
                <td className="px-5 py-2.5 text-xs text-gray-600">{new Date(a.data_inicio).toLocaleDateString("pt-AO")}</td>
                <td className="px-5 py-2.5 text-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ESTADO_BADGE[a.estado] ?? ESTADO_BADGE.ativa}`}>
                    {a.estado}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-center">
                  <div className="flex justify-center gap-1">
                    {a.estado === "ativa" && (
                      <button onClick={() => setAccao({ id: a.id, tipo: "suspender", motivo: "", imediato: false })}
                        title="Suspender"
                        className="p-1.5 rounded hover:bg-orange-50 text-orange-600">
                        <Pause size={14} />
                      </button>
                    )}
                    {a.estado === "suspensa" && (
                      <button onClick={() => { setAccao({ id: a.id, tipo: "reactivar", motivo: "", imediato: false }); setTimeout(aplicarAccao, 0); }}
                        title="Reactivar"
                        className="p-1.5 rounded hover:bg-green-50 text-green-600">
                        <Play size={14} />
                      </button>
                    )}
                    {!["cancelada"].includes(a.estado) && (
                      <button onClick={() => setAccao({ id: a.id, tipo: "cancelar", motivo: "", imediato: false })}
                        title="Cancelar"
                        className="p-1.5 rounded hover:bg-red-50 text-red-600">
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de acção */}
      {accao.id && (accao.tipo === "suspender" || accao.tipo === "cancelar") && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setAccao({ id: null })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800 capitalize">{accao.tipo} assinatura</h2>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Motivo</label>
                <textarea rows={3} value={accao.motivo} onChange={(e) => setAccao({ ...accao, motivo: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              {accao.tipo === "cancelar" && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={accao.imediato} onChange={(e) => setAccao({ ...accao, imediato: e.target.checked })} />
                  Cancelar imediatamente (em vez de no fim do mês)
                </label>
              )}
            </div>
            <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setAccao({ id: null })}
                className="text-xs font-semibold border border-gray-300 hover:bg-white text-gray-700 px-3 py-2 rounded-md">Cancelar</button>
              <button onClick={aplicarAccao} disabled={aLoading || (accao.tipo === "cancelar" && !accao.motivo.trim())}
                className={`text-xs font-semibold text-white px-4 py-2 rounded-md flex items-center gap-1.5 disabled:opacity-50
                  ${accao.tipo === "cancelar" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}>
                {aLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
