import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, Clock, Video, KeyRound, LogOut, Menu, GraduationCap, CalendarCheck, MessageSquare, Sparkles } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useBranding } from "../../hooks/useBranding";
import { useSondagemChat } from "../../hooks/useSondagemChat";

const nav = [
  { to: "/professor",          label: "Início",         icon: LayoutDashboard, end: true },
  { to: "/professor/turmas",   label: "Minhas Turmas",  icon: Users },
  { to: "/professor/notas",      label: "Notas",      icon: BookOpen },
  { to: "/professor/presencas",  label: "Presenças",  icon: CalendarCheck },
  { to: "/professor/horario",    label: "Horário",    icon: Clock },
  { to: "/professor/aulas",    label: "Aulas Online",   icon: Video },
  { to: "/professor/chat",        label: "Chat",          icon: MessageSquare, badge: "chat" },
  { to: "/professor/comunidade",  label: "Educaja",       icon: Sparkles },
  { to: "/professor/conta",       label: "Minha Conta",   icon: KeyRound },
];

export default function ProfessorLayout() {
  const { user, escola, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const branding = useBranding();
  const { naoLidasTotal: chatNaoLidas } = useSondagemChat({ activo: true });

  const handleLogout = () => { logout(); navigate("/login"); };
  const fotoUrl = user?.foto ? `/storage/${user.foto}` : null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col transform transition-transform
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}>

        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center overflow-hidden">
            {branding.logo
              ? <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
              : <GraduationCap size={20} className="text-white" />
            }
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm leading-tight">{escola?.nome ?? branding.name}</div>
            <div className="text-xs text-slate-400">Portal do Professor</div>
          </div>
        </div>

        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden bg-indigo-100 text-indigo-700 flex-shrink-0">
              {fotoUrl ? <img src={fotoUrl} alt="" className="w-full h-full object-cover" /> : (user?.nome?.[0] ?? "P").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{user?.nome}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(item => {
            const badgeValue = item.badge === "chat" ? chatNaoLidas : 0;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isActive ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`
                }>
                <item.icon size={17} />
                <span className="flex-1">{item.label}</span>
                {badgeValue > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badgeValue > 99 ? "99+" : badgeValue}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={17} /> Sair
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpen(true)} className="w-8 h-8 flex items-center justify-center text-slate-600">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-slate-800 text-sm">{escola?.nome ?? "Portal do Professor"}</span>
        </header>

        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
