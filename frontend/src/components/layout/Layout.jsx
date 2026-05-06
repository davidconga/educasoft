import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSondagemChat } from "../../hooks/useSondagemChat";
import {
  LayoutDashboard, Users, GraduationCap, LayoutGrid, FileText,
  Clock, Banknote, Video, Home, BookOpen, BookMarked,
  Tag, CreditCard, LogOut, Bell, Menu, ChevronRight, ChevronUp, ClipboardList,
  Building2, UserCog, CalendarCheck, UserCheck, Wallet, ShieldCheck, CalendarDays, ScrollText, BarChart3, MessageSquare, BellRing, Sparkles, Receipt, Printer, Settings,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { usePermissao } from "../../hooks/usePermissao";
import { usePlano } from "../../hooks/usePlano";
import api from "../../services/api";
import { useBranding } from "../../hooks/useBranding";

const navGroups = [
  {
    label: "Principal",
    items: [
      { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, modulo: "dashboard" },
      { href: "/chat",          label: "Chat",          icon: MessageSquare,   modulo: "chat", badge: "chat" },
      { href: "/comunidade",    label: "Educaja",       icon: Sparkles,        modulo: "comunidade" },
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
      { href: "/aulas-remotas",         label: "Aulas Remotas",         icon: Video,         modulo: "aulas_remotas",  feature: "aulas_remotas" },
      { href: "/cartao-estudante",      label: "Cartão de Estudante",   icon: CreditCard,    modulo: "cartao_estudante" },
      { href: "/folha-prova",           label: "Folha de Prova",        icon: ScrollText,    modulo: "folha_prova",    feature: "folha_prova_qr" },
    ],
  },
  {
    label: "Recursos Humanos",
    items: [
      { href: "/rh",              label: "Dashboard RH",     icon: BarChart3,    modulo: "rh" },
      { href: "/rh/funcionarios", label: "Funcionários",     icon: UserCog,      modulo: "rh" },
      { href: "/rh/presencas",    label: "Presenças",        icon: CalendarCheck,modulo: "rh" },
      { href: "/rh/folhas",       label: "Folhas Pagamento", icon: Banknote,     modulo: "rh" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/pos",               label: "POS — Cobrança",     icon: Receipt,   modulo: "pos",               feature: "tesouraria" },
      { href: "/caixa",             label: "Caixa",              icon: Wallet,    modulo: "caixa",             feature: "tesouraria" },
      { href: "/pagamentos",        label: "Finanças",           icon: Banknote,  modulo: "pagamentos",        feature: "tesouraria" },
      { href: "/tesouraria",        label: "Tesouraria",         icon: CreditCard,modulo: "tesouraria",        feature: "tesouraria" },
      { href: "/controlo-propinas",    label: "Controlo Propinas",    icon: Wallet,       modulo: "controlo_propinas", feature: "tesouraria" },
      { href: "/controlo-emolumentos", label: "Controlo Emolumentos", icon: ClipboardList, modulo: "controlo_emolumentos", feature: "tesouraria" },
      { href: "/carteira-aluno",       label: "Carteira do Aluno",    icon: Wallet,        modulo: "carteira_aluno",    feature: "tesouraria" },
      { href: "/relatorio-diario",     label: "Relatório Diário",     icon: CalendarDays, modulo: "relatorio_diario",   feature: "tesouraria" },
      { href: "/relatorio-financeiro", label: "Relatório Financeiro", icon: BarChart3,    modulo: "relatorio_financeiro", feature: "tesouraria" },
      { href: "/precario",          label: "Preçário",           icon: Tag,       modulo: "precario",          feature: "tesouraria" },
      { href: "/bolsas",            label: "Bolsas de Estudo",   icon: GraduationCap, modulo: "bolsas",        feature: "bolsas" },
      { href: "/financiadores",     label: "Financiadores",      icon: Building2,  modulo: "bolsas",           feature: "bolsas" },
      { href: "/lembretes",         label: "Lembretes Propinas", icon: BellRing,   modulo: "lembretes",        feature: "lembretes_email_sms" },
    ],
  },
];

const configItems = [
  { href: "/gestao-escolar",      label: "Classes & Salas",    icon: Home,       modulo: "gestao_escolar" },
  { href: "/cursos",              label: "Cursos",             icon: BookOpen,   modulo: "cursos"         },
  { href: "/disciplinas",         label: "Disciplinas",        icon: BookMarked, modulo: "disciplinas"    },
  { href: "/regras-aproveitamento", label: "Regras Aproveitamento", icon: ShieldCheck, modulo: "regras_aproveitamento" },
  { href: "/tipos-documento",       label: "Tipos de Documento", icon: BookMarked, modulo: "tipos_documento" },
  { href: "/configuracao-escola", label: "Dados da Escola",    icon: Building2,  modulo: "configuracoes"  },
  { href: "/integracao-vendus",   label: "Integração Vendus",  icon: Receipt,    modulo: "integracao_vendus" },
  { href: "/configuracao-impressao", label: "Impressão",       icon: Printer,    modulo: "configuracao_impressao" },
  { href: "/utilizadores",        label: "Utilizadores",       icon: UserCog,    modulo: "utilizadores"   },
  { href: "/permissoes",          label: "Permissões",         icon: ShieldCheck,modulo: "permissoes"     },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const { escola, user, logout } = useAuthStore();
  const { can } = usePermissao();
  const { plano, limites, hasFeature } = usePlano();
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
            const visibleItems = group.items.filter(item => {
              if (!can(item.modulo)) return false;
              // Se o item exige uma feature do plano, esconder se não disponível
              if (item.feature && plano && !hasFeature(item.feature)) return false;
              return true;
            });
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
                    const badgeValue = item.badge === "chat" ? naoLidasTotal : 0;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        title={collapsed ? `${item.label}${badgeValue > 0 ? ` (${badgeValue})` : ""}` : undefined}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                          ${active
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                          }
                          ${collapsed ? "justify-center" : ""}
                        `}
                      >
                        <span className={`relative shrink-0 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                          <Icon size={18} strokeWidth={active ? 2 : 1.8} />
                          {collapsed && badgeValue > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                              {badgeValue > 9 ? "9+" : badgeValue}
                            </span>
                          )}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {badgeValue > 0 && (
                              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {badgeValue > 99 ? "99+" : badgeValue}
                              </span>
                            )}
                            {active && !badgeValue && <ChevronRight size={12} className="text-blue-400 ml-auto shrink-0" />}
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

        {/* Configurações (fixo, expansível) */}
        {(() => {
          const visibleConfig = configItems.filter(it => can(it.modulo) && (!it.feature || (plano && hasFeature(it.feature))));
          if (visibleConfig.length === 0) return null;
          const configActive = visibleConfig.some(it => location.pathname === it.href);
          return (
            <div className="border-t border-slate-100 shrink-0">
              {configOpen && (
                <div className={`max-h-72 overflow-y-auto py-2 ${collapsed ? "px-1" : "px-2"} border-b border-slate-100 bg-slate-50/50`}>
                  {visibleConfig.map(item => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group
                          ${active ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-white hover:text-slate-800"}
                          ${collapsed ? "justify-center" : ""}`}
                      >
                        <span className={`shrink-0 transition-colors ${active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                          <Icon size={16} strokeWidth={active ? 2 : 1.8} />
                        </span>
                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => setConfigOpen(o => !o)}
                title={collapsed ? "Configurações" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 group
                  ${configActive ? "text-blue-700" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}
                  ${collapsed ? "justify-center" : ""}`}
              >
                <span className={`shrink-0 transition-colors ${configActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`}>
                  <Settings size={18} strokeWidth={configActive ? 2 : 1.8} />
                </span>
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 text-left">Configurações</span>
                    <ChevronUp size={14} className={`text-slate-400 transition-transform ${configOpen ? "" : "rotate-180"}`} />
                  </>
                )}
              </button>
            </div>
          );
        })()}

        {/* Uso do plano */}
        {!collapsed && plano && limites && (
          <div className="px-3 py-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-widest text-slate-400">
              <span>Plano {plano.nome}</span>
              {plano.preco_mensal > 0 && plano.codigo !== "premium" && (
                <Link to="/upgrade" className="text-blue-600 hover:underline normal-case font-bold tracking-normal">Upgrade →</Link>
              )}
            </div>
            {["alunos", "admins"].map((k) => {
              const l = limites[k];
              if (!l) return null;
              const pct = l.ilimitado ? 0 : (l.max > 0 ? Math.min(100, Math.round((l.atual / l.max) * 100)) : 0);
              const cor = l.ilimitado ? "bg-emerald-400" : pct >= 100 ? "bg-rose-500" : pct >= 80 ? "bg-orange-400" : "bg-blue-500";
              return (
                <div key={k}>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                    <span className="capitalize">{k}</span>
                    <span className="font-semibold text-slate-700">
                      {l.atual}{l.ilimitado ? " / ∞" : ` / ${l.max}`}
                    </span>
                  </div>
                  {!l.ilimitado && (
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
            {(() => {
              const fim = plano?.em_trial ? plano?.data_fim_trial : plano?.data_fim;
              if (!fim) return null;
              const hoje = new Date(); hoje.setHours(0,0,0,0);
              const fimD = new Date(fim);
              const dias = Math.ceil((fimD - hoje) / 86400000);
              const expirado = dias < 0;
              const critico  = dias >= 0 && dias <= 7;
              const aviso    = dias > 7 && dias <= 30;
              const cor = expirado ? "bg-rose-50 text-rose-700 border-rose-200"
                        : critico  ? "bg-orange-50 text-orange-700 border-orange-200"
                        : aviso    ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200";
              const label = expirado ? `Expirou há ${Math.abs(dias)}d`
                          : dias === 0 ? "Expira hoje"
                          : `${dias} dia${dias === 1 ? "" : "s"}`;
              const tipo = plano?.em_trial ? "Trial" : "Assinatura";
              return (
                <Link
                  to="/upgrade"
                  title={`${tipo} — termina em ${fim}`}
                  className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${cor}`}
                >
                  <CalendarDays size={13} strokeWidth={2} />
                  <span>{label}</span>
                </Link>
              );
            })()}
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
