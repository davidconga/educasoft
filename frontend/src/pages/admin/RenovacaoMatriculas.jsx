import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from "lucide-react";
import api from "../../services/api";

const ANO_REF = new Date().getFullYear();
function anoLectivoStr(offset) { const s = ANO_REF + offset - 1; return `${s}-${s + 1}`; }

const ACAO_LABEL = {
  criar_activa:   { txt: "Aprovado · próxima classe",  icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
  criar_pendente: { txt: "Reprovado · repete (pendente)", icon: AlertTriangle, cls: "text-amber-700 bg-amber-50 ring-amber-200" },
  rejeitar:       { txt: "Rejeitar",                    icon: XCircle, cls: "text-red-700 bg-red-50 ring-red-200" },
  revisar:        { txt: "Rever manualmente",           icon: AlertTriangle, cls: "text-slate-700 bg-slate-50 ring-slate-200" },
};

export default function RenovacaoMatriculas() {
  const [anoOrigem,  setAnoOrigem]  = useState(anoLectivoStr(-1));
  const [anoDestino, setAnoDestino] = useState(anoLectivoStr(0));
  const [cursos,  setCursos]  = useState([]);
  const [classes, setClasses] = useState([]);
  const [turmas,  setTurmas]  = useState([]);
  const [filtros, setFiltros] = useState({ curso_id: "", classe_id: "", turma_id: "" });
  const [previewing, setPreviewing] = useState(false);
  const [executing,  setExecuting]  = useState(false);
  const [resultados, setResultados] = useState([]);
  const [decisoes,   setDecisoes]   = useState({}); // {matricula_anterior_id: {acao, turma_id}}
  const [turmasDestino, setTurmasDestino] = useState({}); // {classe_id: [turmas]}
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(() => setToast(null), 3500); };

  useEffect(() => { api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {}); }, []);
  useEffect(() => {
    setClasses([]); setTurmas([]);
    setFiltros(f => ({...f, classe_id:"", turma_id:""}));
    if (!filtros.curso_id) return;
    api.get(`/classes?curso_id=${filtros.curso_id}`).then(r => setClasses(r.data)).catch(() => {});
  }, [filtros.curso_id]);
  useEffect(() => {
    setTurmas([]);
    setFiltros(f => ({...f, turma_id:""}));
    if (!filtros.classe_id) return;
    api.get(`/turmas?classe_id=${filtros.classe_id}`).then(r => setTurmas(r.data)).catch(() => {});
  }, [filtros.classe_id]);

  const carregarTurmasDestino = async (classeId) => {
    if (!classeId || turmasDestino[classeId]) return;
    const r = await api.get(`/turmas?classe_id=${classeId}`).catch(() => null);
    if (r) setTurmasDestino(prev => ({ ...prev, [classeId]: r.data || [] }));
  };

  const handlePreview = async () => {
    setError(""); setPreviewing(true); setResultados([]); setDecisoes({});
    try {
      const params = { ano_origem: anoOrigem, ano_destino: anoDestino };
      if (filtros.curso_id)  params.curso_id  = filtros.curso_id;
      if (filtros.classe_id) params.classe_id = filtros.classe_id;
      if (filtros.turma_id)  params.turma_id  = filtros.turma_id;
      const res = await api.post("/matriculas/renovar-ano/preview", params);
      const lista = res.data.resultados || [];
      setResultados(lista);

      // pre-popula decisões com a sugestão
      const initial = {};
      const classesParaCarregar = new Set();
      lista.forEach(r => {
        const s = r.sugestao || {};
        initial[r.matricula_anterior_id] = {
          acao: s.acao || "revisar",
          classe_id_sugerida: s.classe_id_sugerida || null,
          turma_id: "",
          aproveitamento_status: s.aproveitamento_status || null,
        };
        if (s.classe_id_sugerida) classesParaCarregar.add(s.classe_id_sugerida);
      });
      setDecisoes(initial);
      classesParaCarregar.forEach(id => carregarTurmasDestino(id));
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao gerar preview.");
    } finally { setPreviewing(false); }
  };

  const updateDecisao = (matAntId, patch) => {
    setDecisoes(prev => ({ ...prev, [matAntId]: { ...prev[matAntId], ...patch } }));
  };

  const handleExecutar = async () => {
    setExecuting(true); setError("");
    try {
      const decisoesArr = resultados
        .map(r => {
          const d = decisoes[r.matricula_anterior_id];
          if (!d || d.acao === "revisar") return null;
          return {
            aluno_id: r.aluno?.id,
            matricula_anterior_id: r.matricula_anterior_id,
            acao: d.acao,
            turma_id: d.acao === "rejeitar" ? null : (d.turma_id || null),
            aproveitamento_status: d.aproveitamento_status,
          };
        })
        .filter(Boolean);

      if (!decisoesArr.length) { setError("Nenhuma decisão para executar."); setExecuting(false); return; }
      const semTurma = decisoesArr.find(d => d.acao !== "rejeitar" && !d.turma_id);
      if (semTurma) { setError("Há decisões sem turma de destino seleccionada."); setExecuting(false); return; }

      const res = await api.post("/matriculas/renovar-ano/executar", {
        ano_destino: anoDestino,
        decisoes: decisoesArr,
      });
      showToast(`${res.data.criadas} criada(s), ${res.data.rejeitadas} rejeitada(s).`);
      setResultados([]); setDecisoes({});
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao executar renovação.");
    } finally { setExecuting(false); }
  };

  const stats = useMemo(() => {
    const c = { aprovados: 0, reprovados: 0, sem_regra: 0, sem_notas: 0, total: resultados.length };
    resultados.forEach(r => {
      const s = r.aproveitamento?.status;
      if (s === "aprovado") c.aprovados++;
      else if (s === "reprovado") c.reprovados++;
      else if (s === "sem_regra") c.sem_regra++;
      else if (s === "sem_notas") c.sem_notas++;
    });
    return c;
  }, [resultados]);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Renovação de Matrículas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Promove os alunos do ano anterior aplicando as regras de aproveitamento configuradas</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {/* Painel de configuração */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ano de Origem *</label>
            <select value={anoOrigem} onChange={e => setAnoOrigem(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
              {[-3,-2,-1,0].map(o => { const a = anoLectivoStr(o); return <option key={a} value={a}>{a}</option>; })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ano de Destino *</label>
            <select value={anoDestino} onChange={e => setAnoDestino(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
              {[-1,0,1,2].map(o => { const a = anoLectivoStr(o); return <option key={a} value={a}>{a}</option>; })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Curso (opcional)</label>
            <select value={filtros.curso_id} onChange={e => setFiltros(f => ({...f, curso_id: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
              <option value="">Todos</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Classe (opcional)</label>
            <select value={filtros.classe_id} onChange={e => setFiltros(f => ({...f, classe_id: e.target.value}))} disabled={!filtros.curso_id} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 disabled:opacity-50">
              <option value="">Todas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Turma (opcional)</label>
            <select value={filtros.turma_id} onChange={e => setFiltros(f => ({...f, turma_id: e.target.value}))} disabled={!filtros.classe_id} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 disabled:opacity-50">
              <option value="">Todas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={handlePreview} disabled={previewing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            {previewing ? <Loader2 className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
            {previewing ? "A calcular..." : "Gerar preview"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {resultados.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { l: "Total",      v: stats.total,      cls: "bg-slate-50 text-slate-800" },
            { l: "Aprovados",  v: stats.aprovados,  cls: "bg-emerald-50 text-emerald-800" },
            { l: "Reprovados", v: stats.reprovados, cls: "bg-amber-50 text-amber-800" },
            { l: "Sem regra",  v: stats.sem_regra,  cls: "bg-red-50 text-red-800" },
            { l: "Sem notas",  v: stats.sem_notas,  cls: "bg-slate-50 text-slate-500" },
          ].map(c => (
            <div key={c.l} className={`rounded-2xl p-4 ${c.cls} border border-white shadow-sm`}>
              <p className="text-xs font-medium opacity-60 uppercase tracking-wide">{c.l}</p>
              <p className="text-2xl font-bold mt-1">{c.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela de resultados + decisões */}
      {resultados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Decisões propostas</h2>
            <button onClick={handleExecutar} disabled={executing}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-semibold">
              {executing ? <Loader2 className="animate-spin" size={14}/> : <ArrowRight size={14}/>}
              {executing ? "A processar..." : "Executar renovação"}
            </button>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aluno</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Turma anterior</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Aproveitamento</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Acção</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Turma destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {resultados.map(r => {
                const d = decisoes[r.matricula_anterior_id] || {};
                const acaoCfg = ACAO_LABEL[d.acao] || ACAO_LABEL.revisar;
                const turmasDeClasse = turmasDestino[d.classe_id_sugerida] || [];
                return (
                  <tr key={r.matricula_anterior_id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.aluno?.nome}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.aluno?.numero_aluno}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {r.turma_anterior?.nome} · {r.turma_anterior?.classe} ({r.turma_anterior?.curso})
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.aproveitamento?.status === "aprovado" && (
                        <span className="text-emerald-700">Média {r.aproveitamento?.media_geral ?? "n/a"}</span>
                      )}
                      {r.aproveitamento?.status === "reprovado" && (
                        <span className="text-amber-700" title={r.aproveitamento?.reprovacoes?.join(" · ")}>
                          Média {r.aproveitamento?.media_geral ?? "n/a"} · Reprovado
                        </span>
                      )}
                      {r.aproveitamento?.status === "sem_regra" && <span className="text-red-600">Sem regra configurada</span>}
                      {r.aproveitamento?.status === "sem_notas" && <span className="text-slate-400">Sem notas registadas</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={d.acao || "revisar"}
                        onChange={e => updateDecisao(r.matricula_anterior_id, { acao: e.target.value })}
                        className={`text-xs px-2 py-1.5 rounded-lg ring-1 font-medium ${acaoCfg.cls}`}
                      >
                        <option value="criar_activa">Aprovar (próxima)</option>
                        <option value="criar_pendente">Repetir (pendente)</option>
                        <option value="rejeitar">Rejeitar</option>
                        <option value="revisar">Rever manualmente</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {d.acao === "rejeitar" || d.acao === "revisar" ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : (
                        <select
                          value={d.turma_id || ""}
                          onChange={e => updateDecisao(r.matricula_anterior_id, { turma_id: e.target.value })}
                          onFocus={() => carregarTurmasDestino(d.classe_id_sugerida)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 min-w-32"
                        >
                          <option value="">Seleccionar turma...</option>
                          {turmasDeClasse.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!previewing && resultados.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          Configure os anos lectivos e gere o preview para começar.
        </div>
      )}
    </div>
  );
}
