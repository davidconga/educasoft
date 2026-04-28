import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react";
import api from "../../services/api";

export default function ProfessorTurmas() {
  const [prof,    setProf]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [aberta,  setAberta]  = useState(null);
  const [alunos,  setAlunos]  = useState({});
  const [loadingAlunos, setLoadingAlunos] = useState({});

  useEffect(() => {
    api.get("/portal/professor/me").then(r => setProf(r.data)).finally(() => setLoading(false));
  }, []);

  const toggleTurma = async (turmaId) => {
    if (aberta === turmaId) { setAberta(null); return; }
    setAberta(turmaId);
    if (alunos[turmaId]) return;
    setLoadingAlunos(p => ({ ...p, [turmaId]: true }));
    try {
      const r = await api.get(`/alunos?turma_id=${turmaId}&per_page=100`);
      setAlunos(p => ({ ...p, [turmaId]: r.data?.data ?? r.data ?? [] }));
    } finally {
      setLoadingAlunos(p => ({ ...p, [turmaId]: false }));
    }
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  const turmas = prof?.turmas ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Minhas Turmas</h1>

      {turmas.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem turmas atribuídas.</div>
        : turmas.map(turma => (
          <div key={turma.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Cabeçalho */}
            <button
              onClick={() => toggleTurma(turma.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {turma.nome?.[0]}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{turma.nome}</div>
                  <div className="text-xs text-slate-400">
                    {turma.classe?.curso?.nome} · {turma.turnoObj?.nome ?? turma.turno} · {turma.ano_letivo}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-400" /> {turma.total_alunos ?? 0} alunos</span>
                  </div>
                </div>
                {aberta === turma.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </div>
            </button>

            {/* Lista de alunos */}
            {aberta === turma.id && (
              <div className="border-t border-slate-100">
                {loadingAlunos[turma.id]
                  ? <p className="text-center text-slate-400 py-6 text-sm">A carregar alunos...</p>
                  : (alunos[turma.id] ?? []).length === 0
                    ? <p className="text-center text-slate-400 py-6 text-sm">Sem alunos inscritos.</p>
                    : (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Nº</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {(alunos[turma.id] ?? []).map(a => (
                            <tr key={a.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{a.numero_aluno}</td>
                              <td className="px-4 py-2.5 font-medium text-slate-800">{a.user?.nome}</td>
                              <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{a.user?.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                }
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}
