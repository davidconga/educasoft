import { useState, useEffect } from "react";
import api from "../../services/api";

const DIAS = ["segunda","terca","quarta","quinta","sexta","sabado"];
const DIAS_LABEL = { segunda:"Segunda", terca:"Terça", quarta:"Quarta", quinta:"Quinta", sexta:"Sexta", sabado:"Sábado" };

export default function PortalHorario() {
  const [aluno,    setAluno]    = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingH, setLoadingH] = useState(false);

  useEffect(() => {
    api.get("/portal/me").then(r => setAluno(r.data)).finally(() => setLoadingA(false));
  }, []);

  const mat     = aluno?.matriculas?.find(m => m.status === "activa") ?? aluno?.matriculas?.[0];
  const turmaId = mat?.turma_id ?? mat?.turma?.id;

  useEffect(() => {
    if (!turmaId) return;
    setLoadingH(true);
    api.get(`/horarios?turma_id=${turmaId}`).then(r => setHorarios(r.data)).finally(() => setLoadingH(false));
  }, [turmaId]);

  if (loadingA) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  if (!turmaId) return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">Horário</h1>
      <p className="text-slate-400">Nenhuma turma activa associada.</p>
    </div>
  );

  const byDia = {};
  horarios.forEach(h => {
    const d = h.dia_semana?.toLowerCase()
      .replace(/ç/g, "c").replace(/ã/g, "a").replace(/ê/g, "e").replace(/é/g, "e").replace(/á/g, "a");
    if (!byDia[d]) byDia[d] = [];
    byDia[d].push(h);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Horário</h1>
      <p className="text-sm text-slate-500">Turma: <span className="font-semibold text-slate-700">{mat?.turma?.nome}</span></p>

      {loadingH
        ? <p className="text-slate-400 py-8 text-center">A carregar...</p>
        : horarios.length === 0
          ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Horário ainda não definido.</div>
          : (
            <div className="space-y-4">
              {DIAS.filter(d => byDia[d]?.length).map(dia => (
                <div key={dia} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2">
                    <h2 className="text-sm font-semibold text-white">{DIAS_LABEL[dia]}</h2>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {byDia[dia].sort((a,b) => a.hora_inicio?.localeCompare(b.hora_inicio)).map(h => (
                      <div key={h.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="font-mono text-xs text-slate-500 w-24 flex-shrink-0">
                          {h.hora_inicio} – {h.hora_fim}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 text-sm">{h.disciplina?.nome ?? "—"}</div>
                          <div className="text-xs text-slate-400">{h.professor?.user?.nome ?? ""}</div>
                        </div>
                        {h.sala?.nome && (
                          <div className="text-xs text-slate-400 flex-shrink-0">{h.sala.nome}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}
