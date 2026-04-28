import { useState, useEffect } from "react";
import { CreditCard, BookOpen, Clock, User, AlertCircle } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const STATUS_COLOR = {
  pago:     "bg-emerald-50 text-emerald-700",
  pendente: "bg-amber-50 text-amber-700",
  vencido:  "bg-red-50 text-red-700",
  cancelado:"bg-slate-100 text-slate-500",
};
const STATUS_LABEL = { pago:"Pago", pendente:"Pendente", vencido:"Vencido", cancelado:"Cancelado" };

function Card({ title, icon: Icon, children, color = "blue" }) {
  const c = { blue:"bg-blue-600", indigo:"bg-indigo-600", emerald:"bg-emerald-600", amber:"bg-amber-500" }[color];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`${c} px-5 py-3 flex items-center gap-2`}>
        <Icon size={16} className="text-white/80"/>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function PortalInicio() {
  const { user } = useAuthStore();
  const [aluno, setAluno]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    api.get("/portal/me")
      .then(r => setAluno(r.data))
      .catch(() => setError("Não foi possível carregar os dados."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;
  if (error)   return (
    <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
      <AlertCircle size={16}/> {error}
    </div>
  );

  const mat   = aluno.matriculas?.find(m => m.status === "activa") ?? aluno.matriculas?.[0];
  const turma = mat?.turma;
  const pendentes = aluno.pagamentos?.filter(p => p.status === "pendente" || p.status === "vencido") ?? [];
  const fotoUrl = aluno.foto ? `/storage/${aluno.foto}` : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold overflow-hidden flex-shrink-0">
            {fotoUrl ? <img src={fotoUrl} alt="" className="w-full h-full object-cover"/> : (user?.nome?.[0] ?? "A").toUpperCase()}
          </div>
          <div>
            <p className="text-blue-100 text-sm">Bem-vindo,</p>
            <h1 className="text-2xl font-bold">{user?.nome}</h1>
            <p className="text-blue-200 text-sm mt-0.5">{aluno.numero_aluno}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/20">
          <div>
            <p className="text-blue-200 text-xs">Curso</p>
            <p className="font-semibold text-sm mt-0.5">{turma?.classe?.curso?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Turma</p>
            <p className="font-semibold text-sm mt-0.5">{turma?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Turno</p>
            <p className="font-semibold text-sm mt-0.5">{turma?.turnoObj?.nome ?? turma?.turno ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Alertas pendentes */}
      {pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="font-semibold text-amber-800 text-sm">
              {pendentes.length} pagamento{pendentes.length > 1 ? "s" : ""} por regularizar
            </p>
            <p className="text-amber-600 text-xs mt-0.5">Dirija-se à secretaria ou utilize o portal de pagamentos.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados pessoais */}
        <Card title="Dados Pessoais" icon={User} color="indigo">
          <dl className="space-y-3 text-sm">
            {[
              ["Nome",       aluno.user?.nome],
              ["Email",      aluno.user?.email],
              ["Telefone",   aluno.user?.telefone],
              ["BI",         aluno.bi],
              ["Naturalidade", aluno.naturalidade],
              ["Data Nasc.", aluno.data_nascimento],
              ["Endereço",   aluno.endereco],
            ].map(([l, v]) => v ? (
              <div key={l} className="flex justify-between gap-2">
                <dt className="text-slate-400 flex-shrink-0">{l}</dt>
                <dd className="text-slate-700 font-medium text-right">{v}</dd>
              </div>
            ) : null)}
          </dl>
        </Card>

        {/* Últimas notas */}
        <Card title="Últimas Notas" icon={BookOpen} color="emerald">
          {aluno.notas?.length === 0
            ? <p className="text-slate-400 text-sm">Sem notas registadas.</p>
            : (
              <div className="space-y-2">
                {aluno.notas?.slice(0, 6).map(n => {
                  const val = n.media ?? n.nota_continua;
                  return (
                    <div key={n.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="text-sm text-slate-700 truncate block">{n.disciplina?.nome}</span>
                        {n.periodo && <span className="text-xs text-slate-400 capitalize">{n.periodo}</span>}
                      </div>
                      <span className={`text-sm font-bold ml-3 flex-shrink-0 ${val != null && Number(val) >= 10 ? "text-emerald-600" : "text-red-600"}`}>
                        {val != null ? Number(val).toFixed(1) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>

        {/* Pagamentos recentes */}
        <Card title="Pagamentos" icon={CreditCard} color="blue">
          {aluno.pagamentos?.length === 0
            ? <p className="text-slate-400 text-sm">Sem pagamentos registados.</p>
            : (
              <div className="space-y-2">
                {aluno.pagamentos?.slice(0, 6).map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-700 truncate">{p.descricao ?? p.plano?.nome ?? p.emolumento?.nome ?? "Pagamento"}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-800">{Number(p.valor).toLocaleString("pt-AO")} Kz</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Card>

        {/* Horário resumo */}
        <Card title="Horário de Hoje" icon={Clock} color="amber">
          <p className="text-slate-400 text-sm">Consulte o horário completo no menu.</p>
        </Card>
      </div>
    </div>
  );
}
