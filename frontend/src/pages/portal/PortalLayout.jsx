import { useState } from "react";
import { NavLink, useNavigate, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, CreditCard, BookOpen, Clock, KeyRound, LogOut, Menu, GraduationCap, Video, MessageSquare, Sparkles, Bell } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useBranding } from "../../hooks/useBranding";
import { useSondagemNotificacoes } from "../../hooks/useSondagemNotificacoes";
import { useSondagemChat } from "../../hooks/useSondagemChat";

const nav = [
  { to: "/portal",          label: "Início",       icon: LayoutDashboard, end: true },
  { to: "/portal/notas",    label: "Notas",        icon: BookOpen },
  { to: "/portal/horario",  label: "Horário",      icon: Clock },
  { to: "/portal/aulas",    label: "Aulas Online", icon: Video },
  { to: "/portal/financas", label: "Finanças",     icon: CreditCard },
  { to: "/portal/notificacoes", label: "Notificações", icon: Bell, badge: "naoLidas" },
  { to: "/portal/chat",        label: "Chat",        icon: MessageSquare, badge: "chat" },
  { to: "/portal/comunidade",  label: "Educaja",     icon: Sparkles },
  { to: "/portal/conta",       label: "Minha Conta", icon: KeyRound },
];

export default function PortalLayout() {
  const { user, escola, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const branding = useBranding();
  const { naoLidas } = useSondagemNotificacoes({ activo: true });
  const { naoLidasTotal: chatNaoLidas } = useSondagemChat({ activo: true });

  const handleLogout = () => { logout(); navigate("/login"); };

  const fotoUrl = user?.foto ? `/storage/${user.foto}` : null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-100 flex flex-col transform transition-transform
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex`}>

        {/* Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center overflow-hidden">
            {branding.logo
              ? <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
              : <GraduationCap size={20} className="text-white"/>
            }
          </div>
          <div>
            <div className="font-bold text-slate-800 text-sm leading-tight">{escola?.nome ?? branding.name}</div>
            <div className="text-xs text-slate-400">Portal do Aluno</div>
          </div>
        </div>

        {/* Aluno info */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden bg-blue-100 text-blue-700 flex-shrink-0">
              {fotoUrl ? <img src={fotoUrl} alt="" className="w-full h-full object-cover"/> : (user?.nome?.[0] ?? "A").toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{user?.nome}</div>
              <div className="text-xs text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(item => {
            const badgeValue = item.badge === "naoLidas" ? naoLidas
              : item.badge === "chat" ? chatNaoLidas
              : 0;
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isActive ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"}`
                }>
                <item.icon size={17}/>
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

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut size={17}/> Sair
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)}/>}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden w-8 h-8 flex items-center justify-center text-slate-600">
            <Menu size={20}/>
          </button>
          <span className="font-semibold text-slate-800 text-sm lg:hidden">{escola?.nome ?? "Portal do Aluno"}</span>
          <div className="flex-1" />
          <Link to="/portal/notificacoes" title="Notificações"
            className="relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
            <Bell size={18} />
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {naoLidas > 99 ? "99+" : naoLidas}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Outlet/>
        </main>
      </div>
    </div>
  );
}
