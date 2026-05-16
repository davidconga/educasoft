import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, GraduationCap, LayoutGrid, Video,
  Banknote, AlertCircle, ArrowRight, BookOpen,
  Calendar, Clock, Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const cards = [
  { key: "total_alunos",          label: "Alunos",          href: "/alunos",        icon: Users,         color: "blue"    },
  { key: "total_professores",     label: "Professores",     href: "/professores",   icon: GraduationCap, color: "emerald" },
  {
    key: "receita_mes", label: "Receita do Mês", href: "/pagamentos", icon: Banknote, color: "amber",
    // pt-AO em alguns browsers usa espaços como separador de milhares — usar pt-PT (pontos) para consistência
    format: (v) => `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(Number(v || 0))} Kz`,
  },
  { key: "pagamentos_pendentes",  label: "Pag. Pendentes",  href: "/pagamentos",   icon: AlertCircle,   color: "rose"    },
];

const palette = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-100"    },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-100"  },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-100"  },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100"   },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-100"     },
};

const quickActions = [
  { label: "Matricular Aluno",  href: "/alunos",        icon: Users,         color: "blue"    },
  { label: "Agendar Aula",      href: "/aulas-remotas", icon: Video,         color: "indigo"  },
  { label: "Registar Nota",     href: "/notas",         icon: BookOpen,      color: "violet"  },
  { label: "Ver Horários",      href: "/horarios",      icon: Calendar,      color: "amber"   },
];

function Skeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-36 bg-slate-200 rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl h-32 shadow-sm" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl h-48 shadow-sm" />
        <div className="lg:col-span-2 bg-white rounded-2xl h-48 shadow-sm" />
      </div>
    </div>
  );
}

function StatCard({ card, value }) {
  const c = palette[card.color];
  const Icon = card.icon;
  const display = card.format ? card.format(value) : (value ?? "—");

  return (
    <Link
      to={card.href}
      className="group relative bg-white rounded-2xl p-5 shadow-sm border border-slate-100
                 hover:shadow-md hover:border-slate-200 transition-all duration-200 flex flex-col gap-4 overflow-hidden"
    >
      <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center ring-1 ${c.border}`}>
        <Icon size={18} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider leading-none">{card.label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1.5 leading-none tabular-nums">{display}</p>
      </div>
      <ArrowRight
        size={14}
        className="absolute bottom-4 right-4 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200"
      />
    </Link>
  );
}

function QuickActionCard({ action }) {
  const c = palette[action.color];
  const Icon = action.icon;
  return (
    <Link
      to={action.href}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border ${c.border} ${c.bg}
                  hover:shadow-sm transition-all duration-150 group`}
    >
      <span className={`${c.text}`}>
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className={`text-sm font-medium ${c.text}`}>{action.label}</span>
      <ArrowRight size={12} className={`ml-auto ${c.text} opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all`} />
    </Link>
  );
}

function AulaCard({ aula }) {
  const date = new Date(aula.data_inicio);
  const isToday = new Date().toDateString() === date.toDateString();
  const time = date.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition-colors group">
      <div className="w-11 h-11 rounded-xl bg-indigo-50 flex flex-col items-center justify-center shrink-0 ring-1 ring-indigo-100">
        <span className="text-xs font-bold text-indigo-600 leading-none">
          {date.toLocaleDateString("pt-AO", { day: "2-digit" })}
        </span>
        <span className="text-[9px] text-indigo-400 uppercase font-medium mt-0.5">
          {date.toLocaleDateString("pt-AO", { month: "short" })}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{aula.titulo}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400 truncate">{aula.turma?.nome} · {aula.disciplina?.nome}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-slate-400">
          <Clock size={11} />
          <span className="text-[11px]">{time}</span>
        </div>
        {isToday && (
          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Hoje</span>
        )}
        <a
          href={aula.link_jitsi}
          target="_blank"
          rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-indigo-200"
        >
          Entrar
        </a>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    api.get("/dashboard").then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString("pt-AO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (loading) return <Skeleton />;
  if (!stats) return null;

  return (
    <div className="space-y-8">

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-8 text-white shadow-lg shadow-indigo-200/50">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-indigo-200" />
            <p className="text-sm text-indigo-200 capitalize">{today}</p>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting()}, {user?.nome?.split(" ")[0]}!
          </h1>
          <p className="text-indigo-200 mt-1 text-sm">{stats.escola?.nome}</p>
        </div>
        {/* decorative circles */}
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -right-4 top-12 w-28 h-28 rounded-full bg-white/5" />
        <div className="absolute right-24 -bottom-8 w-36 h-36 rounded-full bg-white/5" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <StatCard key={card.key} card={card} value={stats[card.key]} />
        ))}
      </div>

      {/* Quick actions + upcoming classes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700">Ações Rápidas</h2>
          </div>
          <div className="flex flex-col gap-2">
            {quickActions.map(a => <QuickActionCard key={a.href} action={a} />)}
          </div>
        </div>

        {/* Próximas aulas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <h2 className="text-sm font-semibold text-slate-700">Próximas Aulas Remotas</h2>
            </div>
            <Link
              to="/aulas-remotas"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>

          {stats.proximas_aulas?.length > 0 ? (
            <div className="divide-y divide-slate-50 px-2 py-2">
              {stats.proximas_aulas.map(aula => (
                <AulaCard key={aula.id} aula={aula} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
              <Video size={28} strokeWidth={1.4} className="text-slate-300" />
              <p className="text-sm">Nenhuma aula agendada</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
