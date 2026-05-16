import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import { useMeses } from "../../hooks/useMeses";

const fmt = (v) => Number(v || 0).toLocaleString("pt-PT");
const ANO_ATUAL = String(new Date().getFullYear());
const ANOS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

const TIPO_LABELS = {
  mensalidade: "Mensalidade",
  matricula:   "Matrícula",
  emolumento:  "Emolumento",
  outro:       "Outro",
};

const METODO_LABELS = {
  dinheiro:      "Dinheiro",
  transferencia: "Transferência",
  multicaixa:    "Multicaixa",
};

function StatCard({ label, value, sub, cor }) {
  const cores = {
    green:  "bg-emerald-50 border-emerald-100 text-emerald-900",
    amber:  "bg-amber-50  border-amber-100  text-amber-900",
    red:    "bg-red-50    border-red-100    text-red-900",
    blue:   "bg-blue-50   border-blue-100   text-blue-900",
  };
  const subCores = {
    green: "text-emerald-500",
    amber: "text-amber-500",
    red:   "text-red-500",
    blue:  "text-blue-500",
  };
  return (
    <div className={`rounded-2xl border p-5 ${cores[cor]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">{label}</p>
      <p className="text-2xl font-bold">{value} Kz</p>
      {sub && <p className={`text-xs mt-1 ${subCores[cor]}`}>{sub}</p>}
    </div>
  );
}

export default function RelatorioFinanceiro() {
  const meses = useMeses();
  const abrev = (n) => meses.find(m => m.id === Number(n))?.abreviatura ?? "";
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL);
  const [tipo, setTipo]           = useState("");
  const [turmas, setTurmas]       = useState([]);
  const [turmaId, setTurmaId]     = useState("");
  const [dados, setDados]         = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.get("/turmas?per_page=200").then(r => setTurmas(r.data.data || r.data)).catch(() => {});
  }, []);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ano_letivo: anoLetivo });
      if (tipo)    params.append("tipo",     tipo);
      if (turmaId) params.append("turma_id", turmaId);
      const r = await api.get(`/pagamentos/relatorio-financeiro?${params}`);
      setDados(r.data);
    } catch { setDados(null); }
    finally { setLoading(false); }
  }, [anoLetivo, tipo, turmaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const imprimir = () => window.print();

  const resumo        = dados?.resumo        ?? {};
  const porTipo       = dados?.por_tipo       ?? {};
  const porMetodo     = dados?.por_metodo     ?? {};
  const evolucao      = dados?.evolucao_mensal ?? {};

  const tiposOrdem    = ["mensalidade","matricula","emolumento","outro"];
  const metodosOrdem  = Object.keys(porMetodo);

  return (
    <div className="space-y-6 print:space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Relatório Financeiro</h1>
          <p className="text-sm text-slate-400 mt-0.5">Visão geral das receitas e pendências</p>
        </div>
        <button
          onClick={imprimir}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimir
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap gap-3 items-end print:hidden">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Ano Lectivo</label>
          <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Pagamento</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
            <option value="">Todos</option>
            {Object.entries(TIPO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Turma</label>
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 min-w-[160px]">
            <option value="">Todas as turmas</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">A carregar...</div>
      ) : !dados ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Sem dados disponíveis.</div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Recebido"
              value={fmt(resumo.total_pago)}
              sub={`${resumo.count_recebidos} pagamento(s)`}
              cor="green"
            />
            <StatCard
              label="Total Pendente"
              value={fmt(resumo.total_pendente)}
              sub={`${resumo.count_pendentes} em aberto`}
              cor="amber"
            />
            <StatCard
              label="Total Vencido"
              value={fmt(resumo.total_vencido)}
              sub="Em atraso"
              cor="red"
            />
            <StatCard
              label="Alunos Inadimplentes"
              value={resumo.inadimplentes}
              sub="Com débitos em aberto"
              cor="blue"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Breakdown por tipo */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Por Tipo de Pagamento</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Recebido</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pendente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tiposOrdem.filter(t => porTipo[t]).map(t => (
                    <tr key={t} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-700 font-medium">{TIPO_LABELS[t] || t}</td>
                      <td className="px-5 py-3 text-right text-emerald-700 font-semibold">{fmt(porTipo[t].pago)} Kz</td>
                      <td className="px-5 py-3 text-right text-amber-700 font-semibold">{fmt(porTipo[t].pendente)} Kz</td>
                    </tr>
                  ))}
                  {Object.keys(porTipo).filter(t => !tiposOrdem.includes(t)).map(t => (
                    <tr key={t} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-700 font-medium capitalize">{t}</td>
                      <td className="px-5 py-3 text-right text-emerald-700 font-semibold">{fmt(porTipo[t].pago)} Kz</td>
                      <td className="px-5 py-3 text-right text-amber-700 font-semibold">{fmt(porTipo[t].pendente)} Kz</td>
                    </tr>
                  ))}
                  {Object.keys(porTipo).length === 0 && (
                    <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 text-xs">Sem dados</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t border-slate-100 bg-slate-50">
                  <tr>
                    <td className="px-5 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-emerald-700">{fmt(resumo.total_pago)} Kz</td>
                    <td className="px-5 py-3 text-right font-bold text-amber-700">{fmt(Number(resumo.total_pendente) + Number(resumo.total_vencido))} Kz</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Breakdown por método */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Por Método de Pagamento</h2>
                <p className="text-xs text-slate-400 mt-0.5">Apenas pagamentos confirmados</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Método</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Nº</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {metodosOrdem.map(m => {
                    const pct = resumo.total_pago > 0
                      ? ((porMetodo[m].total / resumo.total_pago) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={m} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-2 text-slate-700 font-medium">
                            {METODO_LABELS[m] || m}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500">{porMetodo[m].count}</td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(porMetodo[m].total)} Kz</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{pct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                  {metodosOrdem.length === 0 && (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">Sem dados</td></tr>
                  )}
                </tbody>
                <tfoot className="border-t border-slate-100 bg-slate-50">
                  <tr>
                    <td className="px-5 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-600">{resumo.count_recebidos}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{fmt(resumo.total_pago)} Kz</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Evolução mensal */}
          {Object.keys(evolucao).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Evolução Mensal — Receitas Recebidas</h2>
              </div>
              <div className="p-5">
                {/* Barra visual */}
                <div className="flex items-end gap-2 h-28 mb-3">
                  {(() => {
                    const max = Math.max(...Object.values(evolucao).map(e => e.total), 1);
                    return Object.entries(evolucao).map(([mes, e]) => {
                      const pct = Math.max((e.total / max) * 100, 4);
                      const [ano, m] = mes.split("-");
                      return (
                        <div key={mes} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <span className="text-[10px] text-slate-500 font-medium truncate">{fmt(e.total)}</span>
                          <div
                            className="w-full bg-blue-500 rounded-t-md transition-all"
                            style={{ height: `${pct}%` }}
                            title={`${abrev(m)} ${ano}: ${fmt(e.total)} Kz`}
                          />
                        </div>
                      );
                    });
                  })()}
                </div>
                {/* Labels meses */}
                <div className="flex gap-2">
                  {Object.entries(evolucao).map(([mes]) => {
                    const [, m] = mes.split("-");
                    return (
                      <div key={mes} className="flex-1 min-w-0 text-center">
                        <span className="text-[10px] text-slate-400 truncate block">{abrev(m)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela mensal */}
              <div className="border-t border-slate-100 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Mês</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pagamentos</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Recebido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {Object.entries(evolucao).map(([mes, e]) => {
                      const [ano, m] = mes.split("-");
                      return (
                        <tr key={mes} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-700 font-medium">{abrev(m)} {ano}</td>
                          <td className="px-5 py-3 text-right text-slate-500">{e.count}</td>
                          <td className="px-5 py-3 text-right font-semibold text-emerald-700">{fmt(e.total)} Kz</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t border-slate-100 bg-slate-50">
                    <tr>
                      <td className="px-5 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-600">{resumo.count_recebidos}</td>
                      <td className="px-5 py-3 text-right font-bold text-emerald-700">{fmt(resumo.total_pago)} Kz</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
