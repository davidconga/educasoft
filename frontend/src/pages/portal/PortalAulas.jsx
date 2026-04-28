import { useState, useEffect } from "react";
import { Video, ExternalLink } from "lucide-react";
import api from "../../services/api";

const STATUS_COLOR = { agendada:"bg-blue-50 text-blue-700", em_curso:"bg-emerald-50 text-emerald-700", concluida:"bg-slate-100 text-slate-500", cancelada:"bg-red-50 text-red-600" };
const STATUS_LABEL = { agendada:"Agendada", em_curso:"Em Curso", concluida:"Concluída", cancelada:"Cancelada" };

export default function PortalAulas() {
  const [aluno,   setAluno]   = useState(null);
  const [aulas,   setAulas]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portal/me").then(async r => {
      setAluno(r.data);
      const mat = r.data?.matriculas?.find(m => m.status === "activa") ?? r.data?.matriculas?.[0];
      const turmaId = mat?.turma_id ?? mat?.turma?.id;
      if (turmaId) {
        const rA = await api.get(`/aulas-remotas?turma_id=${turmaId}&per_page=50`);
        setAulas(rA.data?.data ?? rA.data ?? []);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  const mat = aluno?.matriculas?.find(m => m.status === "activa") ?? aluno?.matriculas?.[0];

  const agendadas  = aulas.filter(a => a.status === "agendada" || a.status === "em_curso");
  const anteriores = aulas.filter(a => a.status === "concluida" || a.status === "cancelada");

  const AulaCard = ({ a }) => (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800">{a.titulo}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[a.status] ?? "bg-slate-100 text-slate-500"}`}>
              {STATUS_LABEL[a.status] ?? a.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {a.disciplina?.nome} · Prof. {a.professor?.user?.nome}
          </p>
          {a.descricao && <p className="text-sm text-slate-400 mt-1">{a.descricao}</p>}
          <p className="text-xs text-slate-400 mt-2">
            {a.data_inicio ? new Date(a.data_inicio).toLocaleString("pt-AO", { dateStyle:"long", timeStyle:"short" }) : ""}
          </p>
        </div>
        {(a.status === "agendada" || a.status === "em_curso") && a.link_jitsi && (
          <a href={a.link_jitsi} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors flex-shrink-0">
            <Video size={15} /> Entrar
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Aulas Online</h1>
      {mat?.turma && (
        <p className="text-sm text-slate-500">Turma: <span className="font-semibold text-slate-700">{mat.turma?.nome}</span></p>
      )}

      {aulas.length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem aulas agendadas para a sua turma.</div>
        : (
          <>
            {agendadas.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Próximas / Em Curso</h2>
                {agendadas.map(a => <AulaCard key={a.id} a={a} />)}
              </div>
            )}
            {anteriores.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Anteriores</h2>
                {anteriores.map(a => <AulaCard key={a.id} a={a} />)}
              </div>
            )}
          </>
        )
      }
    </div>
  );
}
