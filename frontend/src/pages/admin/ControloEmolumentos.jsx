import { useState, useEffect } from "react";
import api from "../../services/api";

const STATUS_COLOR = {
  pago:      "bg-green-500",
  pendente:  "bg-yellow-400",
  vencido:   "bg-red-500",
  cancelado: "bg-gray-300",
};
const STATUS_LABEL = { pago: "P", pendente: "?", vencido: "V", cancelado: "—" };

export default function ControloEmolumentos() {
  const ANO_REF  = new Date().getFullYear();
  const ANO_ATUAL = `${ANO_REF - 1}-${ANO_REF}`;
  const ANOS = [`${ANO_REF-2}-${ANO_REF-1}`, `${ANO_REF-1}-${ANO_REF}`, `${ANO_REF}-${ANO_REF+1}`];

  const [turmas,    setTurmas]    = useState([]);
  const [dados,     setDados]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [turmaId,   setTurmaId]   = useState("");
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL);
  const [busca,     setBusca]     = useState("");

  useEffect(() => {
    api.get("/turmas").then(r => setTurmas(r.data.data || r.data));
  }, []);

  const load = () => {
    if (!turmaId) return;
    setLoading(true);
    api.get("/pagamentos/controlo-emolumentos", { params: { turma_id: turmaId, ano_letivo: anoLetivo } })
      .then(r => setDados(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [turmaId, anoLetivo]);

  const alunos = (dados?.alunos ?? []).filter(a =>
    !busca || (a.nome ?? "").toLowerCase().includes(busca.toLowerCase())
  );
  const tipos = dados?.tipos ?? [];

  const totalPago    = (tipo) => (dados?.alunos ?? []).filter(a => a.emolumentos?.[tipo]?.status === "pago").length;
  const totalPendente= (tipo) => (dados?.alunos ?? []).filter(a => a.emolumentos?.[tipo]?.status === "pendente").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📋 Controlo de Emolumentos</h1>
      <p className="text-sm text-gray-500 mb-5">Estado de pagamento de emolumentos e matrículas por turma</p>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Turma *</label>
          <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">Seleccionar turma...</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="min-w-40">
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Ano Lectivo</label>
          <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {dados && (
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pesquisar</label>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Nome do aluno..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        )}
      </div>

      {/* Legenda */}
      {dados && (
        <div className="flex gap-4 mb-3 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block"></span> Pago</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block"></span> Pendente</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block"></span> Vencido</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-200 inline-block"></span> Não lançado</span>
        </div>
      )}

      {!turmaId && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400 text-sm">
          Seleccione uma turma para ver o controlo de emolumentos.
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">A carregar...</div>
      )}

      {!loading && dados && tipos.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">
          Nenhum emolumento registado para esta turma no ano {anoLetivo}.
        </div>
      )}

      {!loading && dados && tipos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-max w-full text-sm">
              <thead>
                {/* Linha de totais */}
                <tr className="bg-blue-900 text-white">
                  <th className="px-3 py-2 text-left text-xs font-semibold sticky left-0 bg-blue-900 z-10 min-w-8">#</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold sticky left-8 bg-blue-900 z-10 min-w-52">Aluno</th>
                  {tipos.map(t => (
                    <th key={t} className="px-2 py-1 text-center min-w-20">
                      <div className="text-green-300 font-bold text-xs">{totalPago(t)}</div>
                      <div className="text-yellow-300 text-xs">{totalPendente(t)} pend.</div>
                    </th>
                  ))}
                </tr>
                {/* Cabeçalho dos emolumentos */}
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-3 py-2 sticky left-0 bg-gray-100 z-10"></th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 sticky left-8 bg-gray-100 z-10">
                    {alunos.length} aluno{alunos.length !== 1 ? "s" : ""}
                  </th>
                  {tipos.map(t => (
                    <th key={t} className="px-2 py-2 text-center min-w-20">
                      <div className="text-xs font-semibold text-gray-700 leading-tight" style={{writingMode:"vertical-rl",transform:"rotate(180deg)",maxHeight:"80px",overflow:"hidden"}}>
                        {t}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alunos.map((a) => (
                  <tr key={a.aluno_id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs sticky left-0 bg-white z-10">{a.ord}</td>
                    <td className="px-4 py-2 font-medium text-gray-800 sticky left-8 bg-white z-10 whitespace-nowrap">{a.nome}</td>
                    {tipos.map(t => {
                      const pag = a.emolumentos?.[t];
                      if (!pag) {
                        return <td key={t} className="px-2 py-2 text-center"><span className="w-6 h-6 rounded-sm bg-gray-100 inline-flex items-center justify-center text-gray-300 text-xs">—</span></td>;
                      }
                      return (
                        <td key={t} className="px-2 py-2 text-center">
                          <span className={`w-6 h-6 rounded-sm inline-flex items-center justify-center text-white text-xs font-bold ${STATUS_COLOR[pag.status] ?? "bg-gray-300"}`}
                            title={`${pag.status} — ${Number(pag.valor).toLocaleString("pt-PT")} Kz`}>
                            {STATUS_LABEL[pag.status] ?? "?"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
