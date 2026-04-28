import { useState, useEffect } from "react";
import { Users, BookOpen, Clock, Video, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const DIAS_LABEL = { segunda:"Segunda", terca:"Terça", quarta:"Quarta", quinta:"Quinta", sexta:"Sexta", sabado:"Sábado" };
const STATUS_COLOR = { agendada:"bg-blue-50 text-blue-700", em_curso:"bg-emerald-50 text-emerald-700", concluida:"bg-slate-100 text-slate-500", cancelada:"bg-red-50 text-red-600" };
const STATUS_LABEL = { agendada:"Agendada", em_curso:"Em Curso", concluida:"Concluída", cancelada:"Cancelada" };

const diaDaSemana = () => {
  const d = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"];
  return d[new Date().getDay()];
};

export default function ProfessorInicio() {
  const { user } = useAuthStore();
  const [prof, setProf]     = useState(null);
  const [aulas, setAulas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/portal/professor/me"),
      api.get("/aulas-remotas?per_page=5"),
    ])
      .then(([rP, rA]) => {
        setProf(rP.data);
        setAulas(rA.data?.data ?? rA.data ?? []);
      })
      .catch(() => setError("Não foi possível carregar os dados."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;
  if (error)   return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
      <AlertCircle size={16} /> {error}
    </div>
  );

  const totalAlunos = prof.turmas?.reduce((s, t) => s + (t.total_alunos ?? 0), 0) ?? 0;
  const hoje = diaDaSemana();
  const horariosHoje = (prof.horarios ?? []).filter(h => {
    const d = h.dia_semana?.toLowerCase().replace(/ç/g,"c").replace(/ã/g,"a").replace(/ê/g,"e").replace(/é/g,"e").replace(/á/g,"a");
    return d === hoje;
  }).sort((a,b) => a.hora_inicio?.localeCompare(b.hora_inicio));

  const proximasAulas = aulas.filter(a => a.status === "agendada" || a.status === "em_curso").slice(0, 3);
  const fotoUrl = user?.foto ? `/storage/${user.foto}` : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0">
            {fotoUrl ? <img src={fotoUrl} alt="" className="w-full h-full object-cover" /> : (user?.nome?.[0] ?? "P").toUpperCase()}
          </div>
          <div>
            <p className="text-indigo-200 text-sm">Bem-vindo,</p>
            <h1 className="text-2xl font-bold">{user?.nome}</h1>
            <p className="text-indigo-200 text-sm mt-0.5">{prof.numero_professor} · {prof.especialidade ?? "Professor"}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/20">
          {[
            { label: "Turmas",      value: prof.turmas?.length ?? 0,  icon: Users },
            { label: "Alunos",      value: totalAlunos,                icon: Users },
            { label: "Disciplinas", value: prof.disciplinas?.length ?? 0, icon: BookOpen },
          ].map(s => (
            <div key={s.label}>
              <p className="text-indigo-200 text-xs">{s.label}</p>
              <p className="font-bold text-xl mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Aulas de hoje */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
            <Clock size={15} className="text-white/70" />
            <h2 className="text-sm font-semibold text-white">
              Aulas de Hoje · {DIAS_LABEL[hoje] ?? "Hoje"}
            </h2>
          </div>
          <div className="p-5">
            {horariosHoje.length === 0
              ? <p className="text-slate-400 text-sm">Sem aulas hoje.</p>
              : (
                <div className="space-y-3">
                  {horariosHoje.map(h => (
                    <div key={h.id} className="flex items-center gap-3">
                      <div className="text-xs font-mono text-slate-500 w-20 flex-shrink-0">{h.hora_inicio} – {h.hora_fim}</div>
                      <div>
                        <div className="text-sm font-medium text-slate-800">{h.disciplina?.nome ?? "—"}</div>
                        <div className="text-xs text-slate-400">{h.turma?.nome}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Próximas aulas remotas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-indigo-600 px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Video size={15} className="text-white/70" />
              <h2 className="text-sm font-semibold text-white">Aulas Online</h2>
            </div>
            <Link to="/professor/aulas" className="text-xs text-indigo-200 hover:text-white">Ver todas →</Link>
          </div>
          <div className="p-5">
            {proximasAulas.length === 0
              ? <p className="text-slate-400 text-sm">Sem aulas agendadas.</p>
              : (
                <div className="space-y-3">
                  {proximasAulas.map(a => (
                    <div key={a.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{a.titulo}</div>
                        <div className="text-xs text-slate-400">{a.turma?.nome} · {a.disciplina?.nome}</div>
                        <div className="text-xs text-slate-400">
                          {a.data_inicio ? new Date(a.data_inicio).toLocaleString("pt-AO", { dateStyle:"short", timeStyle:"short" }) : ""}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[a.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>

        {/* Minhas turmas resumo */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden md:col-span-2">
          <div className="bg-purple-600 px-5 py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-white/70" />
              <h2 className="text-sm font-semibold text-white">Minhas Turmas</h2>
            </div>
            <Link to="/professor/turmas" className="text-xs text-purple-200 hover:text-white">Ver detalhes →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(prof.turmas ?? []).length === 0
              ? <p className="text-slate-400 text-sm p-5">Sem turmas atribuídas.</p>
              : prof.turmas.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{t.nome}</div>
                    <div className="text-xs text-slate-400">{t.classe?.curso?.nome} · {t.turnoObj?.nome ?? t.turno}</div>
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">{t.total_alunos ?? 0}</span> alunos
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
