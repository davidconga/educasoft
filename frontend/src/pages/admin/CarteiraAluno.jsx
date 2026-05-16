import { useState, useEffect } from "react";
import { Wallet, ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import api from "../../services/api";

const STATUS_BADGE = {
  pago:      "bg-green-100 text-green-700",
  pendente:  "bg-yellow-100 text-yellow-700",
  vencido:   "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-500",
  estornado: "bg-purple-100 text-purple-700",
};

const TIPO_LABEL = {
  mensalidade: "Propina",
  emolumento:  "Emolumento",
  matricula:   "Matrícula",
  outro:       "Outro",
};

export default function CarteiraAluno() {
  const [busca,     setBusca]     = useState("");
  const [alunos,    setAlunos]    = useState([]);
  const [alunoSel,  setAlunoSel]  = useState(null);
  const [carteira,  setCarteira]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    if (busca.length < 2) { setAlunos([]); return; }
    const t = setTimeout(() => {
      api.get("/alunos", { params: { search: busca, per_page: 10 } })
        .then(r => setAlunos(r.data.data || r.data));
    }, 350);
    return () => clearTimeout(t);
  }, [busca]);

  const selecionar = (aluno) => {
    setAlunoSel(aluno);
    setAlunos([]);
    setBusca(aluno.user?.nome ?? "");
    setLoading(true);
    api.get(`/pagamentos/carteira/${aluno.id}`)
      .then(r => setCarteira(r.data))
      .finally(() => setLoading(false));
  };

  const movimentos = (carteira?.pagamentos ?? []).filter(p => {
    if (filtroTipo   && p.tipo   !== filtroTipo)   return false;
    if (filtroStatus && p.status !== filtroStatus) return false;
    return true;
  });

  const resumo = carteira?.resumo;
  const saldoPositivo = (resumo?.saldo ?? 0) >= 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Wallet size={20} className="text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Carteira do Aluno</h1>
          <p className="text-sm text-gray-500">Extrato financeiro completo por aluno</p>
        </div>
      </div>

      {/* Pesquisa de aluno */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5 relative">
        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pesquisar Aluno</label>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setAlunoSel(null); setCarteira(null); }}
            placeholder="Nome ou número do aluno..."
            className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        {alunos.length > 0 && (
          <div className="absolute left-5 right-5 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
            {alunos.map(a => (
              <button key={a.id} onClick={() => selecionar(a)}
                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm flex items-center gap-3 border-b border-gray-100 last:border-0">
                <span className="font-medium text-gray-800">{a.user?.nome}</span>
                <span className="text-gray-400 font-mono text-xs">{a.numero_aluno}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">A carregar carteira...</div>}

      {!loading && !carteira && !alunoSel && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          <Wallet size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Pesquise um aluno para ver a sua carteira financeira</p>
        </div>
      )}

      {!loading && carteira && (<>
        {/* Resumo do saldo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 font-semibold uppercase">Total Pago</p>
            <p className="text-xl font-bold text-green-700 mt-1">{Number(resumo?.total_pago ?? 0).toLocaleString("pt-PT")} Kz</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-xs text-yellow-600 font-semibold uppercase">Em Dívida</p>
            <p className="text-xl font-bold text-yellow-700 mt-1">{Number(resumo?.total_pendente ?? 0).toLocaleString("pt-PT")} Kz</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-600 font-semibold uppercase">Estornado</p>
            <p className="text-xl font-bold text-purple-700 mt-1">{Number(resumo?.total_estornado ?? 0).toLocaleString("pt-PT")} Kz</p>
          </div>
          <div className={`border rounded-xl p-4 ${saldoPositivo ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
            <p className={`text-xs font-semibold uppercase ${saldoPositivo ? "text-blue-600" : "text-red-600"}`}>Saldo</p>
            <div className="flex items-center gap-1 mt-1">
              {saldoPositivo
                ? <ArrowUpCircle size={18} className="text-blue-500" />
                : <ArrowDownCircle size={18} className="text-red-500" />}
              <p className={`text-xl font-bold ${saldoPositivo ? "text-blue-700" : "text-red-700"}`}>
                {Number(Math.abs(resumo?.saldo ?? 0)).toLocaleString("pt-PT")} Kz
              </p>
            </div>
            <p className={`text-xs mt-0.5 ${saldoPositivo ? "text-blue-500" : "text-red-500"}`}>
              {saldoPositivo ? "Saldo favorável" : "Em dívida"}
            </p>
          </div>
        </div>

        {/* Por tipo */}
        {carteira.por_tipo && Object.keys(carteira.por_tipo).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {Object.entries(carteira.por_tipo).map(([tipo, v]) => (
              <div key={tipo} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-semibold uppercase">{TIPO_LABEL[tipo] ?? tipo}</p>
                <p className="text-sm font-bold text-gray-800 mt-1">{v.count} lançamento{v.count !== 1 ? "s" : ""}</p>
                <p className="text-xs text-green-600">{Number(v.pago).toLocaleString("pt-PT")} Kz pago</p>
                {v.pendente > 0 && <p className="text-xs text-yellow-600">{Number(v.pendente).toLocaleString("pt-PT")} Kz pendente</p>}
              </div>
            ))}
          </div>
        )}

        {/* Filtros + Extrato */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Extrato de movimentos ({movimentos.length})</span>
            <div className="flex gap-2">
              <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                <option value="">Todos os tipos</option>
                <option value="mensalidade">Propina</option>
                <option value="emolumento">Emolumento</option>
                <option value="matricula">Matrícula</option>
              </select>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                <option value="">Todos os estados</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="vencido">Vencido</option>
                <option value="estornado">Estornado</option>
              </select>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referência</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descrição</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mês/Ref.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Data Pag.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movimentos.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 ${p.status === "estornado" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.referencia}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{p.observacao || TIPO_LABEL[p.tipo] || p.tipo}</div>
                    {p.estorno_motivo && <div className="text-xs text-purple-500 mt-0.5">↩ {p.estorno_motivo}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.mes_referencia || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-AO") : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${p.status === "estornado" ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {Number(p.valor).toLocaleString("pt-PT")} Kz
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {movimentos.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">Nenhum movimento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </>)}
    </div>
  );
}
