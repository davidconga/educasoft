import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Download } from "lucide-react";
import api from "../../../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("pt-AO");
const meses = ["", "Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ESTADO = {
  rascunho:  { cls: "bg-slate-100 text-slate-600",     l: "Rascunho" },
  processada:{ cls: "bg-blue-100 text-blue-700",       l: "Processada" },
  paga:      { cls: "bg-emerald-100 text-emerald-700", l: "Paga" },
  anulada:   { cls: "bg-red-100 text-red-600",         l: "Anulada" },
};

export default function Folhas() {
  const [folhas, setFolhas]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const hoje = new Date();
  const [filtroAno, setFiltroAno] = useState(hoje.getFullYear());
  const [filtroMes, setFiltroMes] = useState(hoje.getMonth() + 1);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [showGerar, setShowGerar] = useState(false);
  const [gerarMes, setGerarMes] = useState(hoje.getMonth() + 1);
  const [gerarAno, setGerarAno] = useState(hoje.getFullYear());
  const [gerando, setGerando] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroAno) params.set("ano", filtroAno);
    if (filtroMes) params.set("mes", filtroMes);
    if (filtroEstado) params.set("estado", filtroEstado);
    params.set("per_page", "200");
    try {
      const r = await api.get(`/folhas-pagamento?${params}`);
      setFolhas(r.data.data || r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filtroAno, filtroMes, filtroEstado]);

  const gerar = async () => {
    setGerando(true);
    try {
      const r = await api.post("/folhas-pagamento/gerar-mes", { mes: gerarMes, ano: gerarAno });
      alert(r.data.message);
      setShowGerar(false);
      setFiltroMes(gerarMes); setFiltroAno(gerarAno);
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Erro a gerar folhas.");
    } finally { setGerando(false); }
  };

  const baixarPdf = async (id, ref) => {
    try {
      const r = await api.get(`/folhas-pagamento/${id}/recibo.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recibo-${ref}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert("Erro ao baixar recibo."); }
  };

  const totalLiquido = folhas.reduce((s, f) => s + Number(f.liquido || 0), 0);
  const totalPagas   = folhas.filter(f => f.estado === "paga").reduce((s, f) => s + Number(f.liquido || 0), 0);
  const totalPend    = totalLiquido - totalPagas;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">💼 Folhas de Pagamento</h1>
          <p className="text-xs text-slate-500 mt-1">{folhas.length} folhas · {fmt(totalLiquido)} Kz total</p>
        </div>
        <button onClick={() => setShowGerar(true)}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm inline-flex items-center gap-2">
          <Plus size={16}/> Gerar folha do mês
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs text-slate-600 font-medium">Total folhas</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(totalLiquido)} Kz</p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4">
          <p className="text-xs text-emerald-700 font-medium">Pagas</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{fmt(totalPagas)} Kz</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4">
          <p className="text-xs text-amber-700 font-medium">Pendentes</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{fmt(totalPend)} Kz</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Mês:</span>
          <select value={filtroMes} onChange={e => setFiltroMes(Number(e.target.value))} className="border rounded-md px-2 py-1 text-xs">
            <option value="">Todos</option>
            {meses.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Ano:</span>
          <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className="border rounded-md px-2 py-1 text-xs">
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Estado:</span>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="border rounded-md px-2 py-1 text-xs">
            <option value="">Todos</option>
            <option value="rascunho">Rascunho</option>
            <option value="processada">Processada</option>
            <option value="paga">Paga</option>
            <option value="anulada">Anulada</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-12">A carregar...</p>
      ) : folhas.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <p className="text-sm">Nenhuma folha encontrada.</p>
          <button onClick={() => setShowGerar(true)} className="mt-3 text-xs text-blue-600 hover:underline">
            Gerar folhas para este mês
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2.5">Funcionário</th>
                <th className="text-left px-3 py-2.5">Período</th>
                <th className="text-left px-3 py-2.5">Ref.</th>
                <th className="text-right px-3 py-2.5">Salário</th>
                <th className="text-right px-3 py-2.5">Líquido</th>
                <th className="text-center px-3 py-2.5">Estado</th>
                <th className="text-right px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {folhas.map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <Link to={`/rh/folhas/${f.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                      {f.funcionario?.nome}
                    </Link>
                    <p className="text-[10px] text-slate-400">{f.funcionario?.cargo}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{meses[f.mes]} {f.ano}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{f.referencia}</td>
                  <td className="px-3 py-2.5 text-right">{fmt(f.salario_base)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold">{fmt(f.liquido)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO[f.estado]?.cls}`}>
                      {ESTADO[f.estado]?.l || f.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right space-x-2">
                    <button onClick={() => baixarPdf(f.id, f.referencia)} className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
                      <Download size={12}/> PDF
                    </button>
                    <Link to={`/rh/folhas/${f.id}`} className="text-xs text-blue-600 hover:underline">Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Gerar folhas do mês */}
      {showGerar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold">Gerar folhas do mês</h2>
              <p className="text-xs text-slate-500 mt-1">
                Gera folhas de rascunho para todos os funcionários activos. Folhas já existentes são mantidas.
              </p>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Mês *</label>
                  <select value={gerarMes} onChange={e => setGerarMes(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {meses.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ano *</label>
                  <select value={gerarAno} onChange={e => setGerarAno(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowGerar(false)} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={gerar} disabled={gerando}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
                {gerando ? "A gerar..." : "Gerar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
