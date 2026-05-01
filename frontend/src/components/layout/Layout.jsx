import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSondagemChat } from "../../hooks/useSondagemChat";
import {
  LayoutDashboard, Users, GraduationCap, LayoutGrid, FileText,
  Clock, Banknote, Video, Home, BookOpen, BookMarked,
  Tag, CreditCard, LogOut, Bell, Menu, ChevronRight, ClipboardList,
  Building2, UserCog, CalendarCheck, UserCheck, Wallet, ShieldCheck, CalendarDays, ScrollText, BarChart3, MessageSquare, BellRing, Sparkles,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { usePermissao } from "../../hooks/usePermissao";
import api from "../../services/api";
import { useBranding } from "../../hooks/useBranding";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, modulo: "dashboard" },
      { href: "/chat",          label: "Chat",          icon: MessageSquare,   modulo: "dashboard" },
      { href: "/comunidade",    label: "Educaja",       icon: Sparkles,        modulo: "dashboard" },
    ],
  },
  {
    label: "Académico",
    items: [
      { href: "/alunos",                 label: "Alunos",                icon: Users,         modulo: "alunos"          },
      { href: "/matriculas",             label: "Inscrições / Matrículas", icon: ClipboardList, modulo: "matriculas"      },
      { href: "/matriculas/renovacao",   label: "Renovação de Matrículas", icon: ClipboardList, modulo: "matriculas"      },
      { href: "/professores",            label: "Professores",           icon: GraduationCap, modulo: "professores"     },
      { href: "/turmas",                 label: "Turmas",                icon: LayoutGrid,    modulo: "turmas"          },
      { href: "/notas",                  label: "Notas",                 icon: FileText,      modulo: "notas"           },
      { href: "/presencas",             label: "Presenças Alunos",      icon: CalendarCheck, modulo: "presencas"       },
      { href: "/presencas-professores", label: "Presenças Professores", icon: UserCheck,     modulo: "presencas"       },
      { href: "/horarios",              label: "Horários",              icon: Clock,         modulo: "horarios"        },
      { href: "/aulas-remotas",         label: "Aulas Remotas",         icon: Video,         modulo: "aulas_remotas"   },
      { href: "/cartao-estudante",      label: "Cartão de Estudante",   icon: CreditCard,    modulo: "alunos"          },
      { href: "/folha-prova",           label: "Folha de Prova",        icon: ScrollText,    modulo: "notas"           },
    ],
  },
  {
    label: "Configurações",
    items: [
      { href: "/gestao-escolar",      label: "Classes & Salas",    icon: Home,       modulo: "gestao_escolar" },
      { href: "/cursos",              label: "Cursos",             icon: BookOpen,   modulo: "cursos"         },
      { href: "/disciplinas",         label: "Disciplinas",        icon: BookMarked, modulo: "disciplinas"    },
      { href: "/regras-aproveitamento", label: "Regras Aproveitamento", icon: ShieldCheck, modulo: "configuracoes" },
      { href: "/tipos-documento",       label: "Tipos de Documento", icon: BookMarked, modulo: "configuracoes" },
      { href: "/configuracao-escola", label: "Dados da Escola",    icon: Building2,  modulo: "configuracoes"  },
      { href: "/utilizadores",        label: "Utilizadores",       icon: UserCog,    modulo: "utilizadores"   },
      { href: "/permissoes",          label: "Permissões",         icon: ShieldCheck,modulo: "permissoes"     },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/pagamentos",        label: "Finanças",           icon: Banknote,  modulo: "pagamentos"        },
      { href: "/tesouraria",        label: "Tesouraria",         icon: CreditCard,modulo: "tesouraria"        },
      { href: "/controlo-propinas",    label: "Controlo Propinas",    icon: Wallet,       modulo: "controlo_propinas" },
      { href: "/controlo-emolumentos", label: "Controlo Emolumentos", icon: ClipboardList, modulo: "pagamentos"  },
      { href: "/carteira-aluno",       label: "Carteira do Aluno",    icon: Wallet,        modulo: "pagamentos"  },
      { href: "/relatorio-diario",     label: "Relatório Diário",     icon: CalendarDays, modulo: "tesouraria" },
      { href: "/relatorio-financeiro", label: "Relatório Financeiro", icon: BarChart3,    modulo: "tesouraria" },
      { href: "/precario",          label: "Preçário",           icon: Tag,       modulo: "precario"          },
      { href: "/bolsas",            label: "Bolsas de Estudo",   icon: GraduationCap, modulo: "bolsas"        },
      { href: "/financiadores",     label: "Financiadores",      icon: Building2,  modulo: "bolsas"           },
      { href: "/lembretes",         label: "Lembretes Propinas", icon: BellRing,   modulo: "lembretes"        },
    ],
  },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const { escola, user, logout } = useAuthStore();
  const { can } = usePermissao();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    logout(); navigate("/login");
  };

  const initials = user?.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U";
  const branding = useBranding();
  const { naoLidasTotal } = useSondagemChat({ activo: true });

  return (
    <div className="flex h-screen bg-slate-50 font-sans">

      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-[68px]" : "w-62"} bg-white border-r border-slate-100
                    flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-sm`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 h-16 px-4 border-b border-slate-100 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-blue-200 overflow-hidden">
            {branding.logo
              ? <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
              : (escola?.nome?.[0] || "E")
            }
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{escola?.nome || branding.name}</p>
              <p className="text-[11px] text-slate-400 truncate">Gestão Escolar</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-4">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => can(item.modulo));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label}>
                {!collapsed && (
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                          ${active
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                      >
                        <span className={`shrink-0 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                          <Icon size={18} strokeWidth={active ? 2 : 1.8} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {active && <ChevronRight size={12} className="text-blue-400 ml-auto shrink-0" />}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className={`px-3 py-4 border-t border-slate-100 ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 flex items-center justify-center transition-colors"
            >
              <LogOut size={16} strokeWidth={1.8} />
            </button>
          ) : (
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-violet-200">
                {initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-slate-700 truncate">{user?.nome}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user?.tipo}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="shrink-0 text-slate-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
              >
                <LogOut size={15} strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            title={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <Menu size={16} strokeWidth={2} />
          </button>

          <div className="flex items-center gap-3">
            <Link
              to="/chat"
              title={naoLidasTotal > 0 ? `${naoLidasTotal} mensagens por ler` : "Chat"}
              className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Bell size={16} strokeWidth={1.8} />
              {naoLidasTotal > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center leading-none">
                  {naoLidasTotal > 99 ? "99+" : naoLidasTotal}
                </span>
              )}
            </Link>

            <div className="w-px h-5 bg-slate-200" />

            <Link to="/perfil" className="flex items-center gap-2.5 hover:bg-slate-50 rounded-xl px-2 py-1 transition-colors" title="Meu perfil">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.nome}</p>
                <p className="text-[11px] text-slate-400 capitalize">{user?.tipo}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-violet-200">
                {initials}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
