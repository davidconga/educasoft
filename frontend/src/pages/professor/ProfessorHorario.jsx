import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import api from "../../services/api";
import { imprimirHorarioProfessor } from "../../components/ImprimirHorario";
import { useAuthStore } from "../../store/auth";

const DIAS = ["segunda","terca","quarta","quinta","sexta","sabado"];
const DIAS_LABEL = { segunda:"Segunda", terca:"Terça", quarta:"Quarta", quinta:"Quinta", sexta:"Sexta", sabado:"Sábado" };

const normDia = d =>
  (d ?? "").toLowerCase()
    .replace(/ç/g,"c").replace(/ã/g,"a").replace(/ê/g,"e").replace(/é/g,"e").replace(/á/g,"a").replace(/\s/g,"");

export default function ProfessorHorario() {
  const { escola } = useAuthStore();
  const [prof,    setProf]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portal/professor/me").then(r => setProf(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  const horarios = prof?.horarios ?? [];

  const byDia = {};
  horarios.forEach(h => {
    const d = normDia(h.dia_semana);
    if (!byDia[d]) byDia[d] = [];
    byDia[d].push(h);
  });

  const diasComAulas = DIAS.filter(d => byDia[d]?.length);
  const hojeIdx = new Date().getDay(); // 0=dom
  const hojeKey = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"][hojeIdx];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Meu Horário</h1>
        {horarios.length > 0 && (
          <button
            onClick={() => imprimirHorarioProfessor(prof, horarios, escola)}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            <Printer size={15}/> Imprimir
          </button>
        )}
      </div>

      {horarios.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Horário ainda não definido.</div>
        : (
          <div className="space-y-4">
            {diasComAulas.map(dia => (
              <div key={dia}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${dia === hojeKey ? "border-indigo-300" : "border-slate-100"}`}>
                <div className={`px-4 py-2 flex items-center gap-2 ${dia === hojeKey ? "bg-indigo-600" : "bg-slate-800"}`}>
                  <h2 className="text-sm font-semibold text-white">{DIAS_LABEL[dia]}</h2>
                  {dia === hojeKey && <span className="text-xs text-indigo-200 ml-auto">Hoje</span>}
                </div>
                <div className="divide-y divide-slate-50">
                  {byDia[dia].sort((a,b) => a.hora_inicio?.localeCompare(b.hora_inicio)).map(h => (
                    <div key={h.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="font-mono text-xs text-slate-500 w-24 flex-shrink-0">
                        {h.hora_inicio} – {h.hora_fim}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 text-sm">{h.disciplina?.nome ?? "—"}</div>
                        <div className="text-xs text-slate-400">{h.turma?.nome}</div>
                      </div>
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
