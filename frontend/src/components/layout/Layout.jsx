import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSondagemChat } from "../../hooks/useSondagemChat";
import {
  LayoutDashboard, Users, GraduationCap, LayoutGrid, FileText,
  Clock, Banknote, Video, Home, BookOpen, BookMarked,
  Tag, CreditCard, LogOut, Bell, Menu, ChevronRight, ChevronUp, ClipboardList,
  Building2, UserCog, CalendarCheck, UserCheck, Wallet, ShieldCheck, CalendarDays, ScrollText, BarChart3, MessageSquare, BellRing, Sparkles, Receipt, Printer, Settings,
  Sun, Moon, Monitor,
} from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { usePermissao } from "../../hooks/usePermissao";
import { usePlano } from "../../hooks/usePlano";
import api from "../../services/api";
import { useBranding } from "../../hooks/useBranding";
import { useTheme } from "../../hooks/useTheme";
import OfflineBanner from "../OfflineBanner";

const navGroups = [
  {
    label: "Principal",
    icon: Home, iconClass: "fi-rr-home",
    color: { active: "text-blue-600", iconActive: "text-blue-500", iconIdle: "text-blue-400/70", border: "border-blue-200", hoverBg: "hover:bg-blue-50/60", chipBg: "bg-blue-100", chipText: "text-blue-700" },
    items: [
      { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard, iconClass: "fi-rr-apps",         modulo: "dashboard" },
      { href: "/chat",          label: "Chat",          icon: MessageSquare,   iconClass: "fi-rr-comment-alt",  modulo: "chat", badge: "chat" },
      { href: "/comunidade",    label: "Educaja",       icon: Sparkles,        iconClass: "fi-rr-sparkles",     modulo: "comunidade" },
    ],
  },
  {
    label: "Académico",
    icon: GraduationCap, iconClass: "fi-rr-graduation-cap",
    color: { active: "text-emerald-700", iconActive: "text-emerald-600", iconIdle: "text-emerald-400/70", border: "border-emerald-200", hoverBg: "hover:bg-emerald-50/60", chipBg: "bg-emerald-100", chipText: "text-emerald-700" },
    items: [
      { href: "/alunos",                 label: "Alunos",                icon: Users,         iconClass: "fi-rr-users-alt",      modulo: "alunos"          },
      { href: "/matriculas",             label: "Inscrições / Matrículas", icon: ClipboardList, iconClass: "fi-rr-clipboard-list", modulo: "matriculas"      },
      { href: "/matriculas/renovacao",   label: "Renovação de Matrículas", icon: ClipboardList, iconClass: "fi-rr-refresh",        modulo: "matriculas"      },
      { href: "/professores",            label: "Professores",           icon: GraduationCap, iconClass: "fi-rr-user-graduate",  modulo: "professores"     },
      { href: "/turmas",                 label: "Turmas",                icon: LayoutGrid,    iconClass: "fi-rr-school",         modulo: "turmas"          },
      { href: "/notas",                  label: "Notas",                 icon: FileText,      iconClass: "fi-rr-document",       modulo: "notas"           },
      { href: "/presencas",             label: "Presenças Alunos",      icon: CalendarCheck, iconClass: "fi-rr-calendar-check", modulo: "presencas"       },
      { href: "/presencas-professores", label: "Presenças Professores", icon: UserCheck,     iconClass: "fi-rr-user-check",     modulo: "presencas"       },
      { href: "/horarios",              label: "Horários",              icon: Clock,         iconClass: "fi-rr-clock",          modulo: "horarios"        },
      { href: "/aulas-remotas",         label: "Aulas Remotas",         icon: Video,         iconClass: "fi-rr-video-camera",   modulo: "aulas_remotas",  feature: "aulas_remotas" },
      { href: "/cartao-estudante",      label: "Cartão de Estudante",   icon: CreditCard,    iconClass: "fi-rr-id-card-clip-alt", modulo: "cartao_estudante" },
      { href: "/folha-prova",           label: "Folha de Prova",        icon: ScrollText,    iconClass: "fi-rr-document-signed", modulo: "folha_prova",    feature: "folha_prova_qr" },
    ],
  },
  {
    label: "Recursos Humanos",
    icon: UserCog, iconClass: "fi-rr-users",
    color: { active: "text-violet-700", iconActive: "text-violet-600", iconIdle: "text-violet-400/70", border: "border-violet-200", hoverBg: "hover:bg-violet-50/60", chipBg: "bg-violet-100", chipText: "text-violet-700" },
    items: [
      { href: "/rh",              label: "Dashboard RH",     icon: BarChart3,    iconClass: "fi-rr-chart-histogram", modulo: "rh" },
      { href: "/rh/funcionarios", label: "Funcionários",     icon: UserCog,      iconClass: "fi-rr-user-gear",       modulo: "rh" },
      { href: "/rh/presencas",    label: "Presenças",        icon: CalendarCheck,iconClass: "fi-rr-calendar-clock",  modulo: "rh" },
      { href: "/rh/folhas",       label: "Folhas Pagamento", icon: Banknote,     iconClass: "fi-rr-money-bill-wave", modulo: "rh" },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet, iconClass: "fi-rr-wallet",
    color: { active: "text-amber-700", iconActive: "text-amber-600", iconIdle: "text-amber-400/70", border: "border-amber-200", hoverBg: "hover:bg-amber-50/60", chipBg: "bg-amber-100", chipText: "text-amber-700" },
    items: [
      { href: "/pos",               label: "POS — Cobrança",     icon: Receipt,   iconClass: "fi-rr-receipt",         modulo: "pos",               feature: "tesouraria" },
      { href: "/caixa",             label: "Caixa",              icon: Wallet,    iconClass: "fi-rr-cash-register",   modulo: "caixa",             feature: "tesouraria" },
      { href: "/pagamentos",        label: "Finanças",           icon: Banknote,  iconClass: "fi-rr-money-check-edit", modulo: "pagamentos",        feature: "tesouraria" },
      { href: "/tesouraria",        label: "Tesouraria",         icon: CreditCard,iconClass: "fi-rr-credit-card",     modulo: "tesouraria",        feature: "tesouraria" },
      { href: "/controlo-propinas",    label: "Controlo Propinas",    icon: Wallet,       iconClass: "fi-rr-coins",         modulo: "controlo_propinas", feature: "tesouraria" },
      { href: "/controlo-emolumentos", label: "Controlo Emolumentos", icon: ClipboardList, iconClass: "fi-rr-list-check",    modulo: "controlo_emolumentos", feature: "tesouraria" },
      { href: "/carteira-aluno",       label: "Carteira do Aluno",    icon: Wallet,        iconClass: "fi-rr-wallet",        modulo: "carteira_aluno",    feature: "tesouraria" },
      { href: "/relatorio-diario",     label: "Relatório Diário",     icon: CalendarDays, iconClass: "fi-rr-calendar-day",  modulo: "relatorio_diario",   feature: "tesouraria" },
      { href: "/relatorio-financeiro", label: "Relatório Financeiro", icon: BarChart3,    iconClass: "fi-rr-stats",         modulo: "relatorio_financeiro", feature: "tesouraria" },
      { href: "/precario",          label: "Preçário",           icon: Tag,       iconClass: "fi-rr-tags",            modulo: "precario",          feature: "tesouraria" },
      { href: "/bolsas",            label: "Bolsas de Estudo",   icon: GraduationCap, iconClass: "fi-rr-trophy-star",  modulo: "bolsas",        feature: "bolsas" },
      { href: "/financiadores",     label: "Financiadores",      icon: Building2,  iconClass: "fi-rr-building",       modulo: "bolsas",           feature: "bolsas" },
      { href: "/lembretes",         label: "Lembretes Propinas", icon: BellRing,   iconClass: "fi-rr-bell-ring",      modulo: "lembretes",        feature: "lembretes_email_sms" },
    ],
  },
];

const configItems = [
  { href: "/gestao-escolar",      label: "Classes & Salas",    icon: Home,       iconClass: "fi-rr-school-bus",      modulo: "gestao_escolar" },
  { href: "/cursos",              label: "Cursos",             icon: BookOpen,   iconClass: "fi-rr-book-open-cover", modulo: "cursos"         },
  { href: "/disciplinas",         label: "Disciplinas",        icon: BookMarked, iconClass: "fi-rr-book-bookmark",   modulo: "disciplinas"    },
  { href: "/regras-aproveitamento", label: "Regras Aproveitamento", icon: ShieldCheck, iconClass: "fi-rr-shield-check", modulo: "regras_aproveitamento" },
  { href: "/tipos-documento",       label: "Tipos de Documento", icon: BookMarked, iconClass: "fi-rr-file-medical-alt", modulo: "tipos_documento" },
  { href: "/configuracao-escola", label: "Dados da Escola",    icon: Building2,  iconClass: "fi-rr-building",        modulo: "configuracoes"  },
  { href: "/integracao-vendus",   label: "Integração Vendus",  icon: Receipt,    iconClass: "fi-rr-plug-connection", modulo: "integracao_vendus" },
  { href: "/configuracao-impressao", label: "Impressão",       icon: Printer,    iconClass: "fi-rr-print",           modulo: "configuracao_impressao" },
  { href: "/utilizadores",        label: "Utilizadores",       icon: UserCog,    iconClass: "fi-rr-user-gear",       modulo: "utilizadores"   },
  { href: "/permissoes",          label: "Permissões",         icon: ShieldCheck,iconClass: "fi-rr-shield-keyhole",  modulo: "permissoes"     },
];

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  // Estado de grupos do menu (dobráveis); persistido em localStorage.
  // Por defeito, todos fechados — só abre o grupo da rota activa (ver effect abaixo).
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const raw = localStorage.getItem("sidebarOpenGroups");
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return {}; // {} = todos fechados (effect abre o activo)
  });
  const isGroupOpen = (label) => !!(openGroups && openGroups[label]);

  const toggleGroup = (label) => {
    setOpenGroups(prev => {
      const base = { ...(prev || {}) };
      base[label] = !base[label];
      try { localStorage.setItem("sidebarOpenGroups", JSON.stringify(base)); } catch (_) {}
      return base;
    });
  };
  const { escola, user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { can } = usePermissao();
  const { plano, limites, hasFeature } = usePlano();
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-abre o grupo que contém a rota activa quando ela muda
  useEffect(() => {
    const activeGroup = navGroups.find(g => g.items.some(it => it.href === location.pathname));
    if (!activeGroup) return;
    setOpenGroups(prev => {
      if (prev && prev[activeGroup.label]) return prev;
      const next = { ...(prev || {}), [activeGroup.label]: true };
      try { localStorage.setItem("sidebarOpenGroups", JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, [location.pathname]);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    logout(); navigate("/login");
  };

  const initials = user?.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "U";
  const branding = useBranding();
  const { naoLidasTotal } = useSondagemChat({ activo: true });

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 dark:text-slate-200 font-sans">
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden">

      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-[68px]" : "w-62"} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800
                    flex flex-col transition-all duration-300 ease-in-out shrink-0 shadow-sm`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 h-16 px-4 border-b border-slate-100 dark:border-slate-800 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm shadow-blue-200 overflow-hidden">
            {branding.logo
              ? <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
              : (escola?.nome?.[0] || "E")
            }
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{escola?.nome || branding.name}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">Gestão Escolar</p>
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
            const open = collapsed ? true : isGroupOpen(group.label);
            const groupActive = visibleItems.some(it => location.pathname === it.href);
            const GroupIcon = group.icon;
            const c = group.color || {};
            const headerColorCls = groupActive ? (c.active || "text-blue-600") : "text-slate-500 hover:text-slate-700";
            const iconColorCls   = groupActive ? (c.iconActive || "text-blue-500") : (c.iconIdle || "text-slate-400");
            return (
              <div key={group.label}>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    className={`w-full flex items-center gap-2 px-3 mb-1 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${c.hoverBg || "hover:bg-slate-50"}
                      ${headerColorCls}`}
                    title={open ? "Recolher secção" : "Expandir secção"}
                  >
                    {group.iconClass
                      ? <i className={`fi ${group.iconClass} text-[14px] leading-none ${iconColorCls}`}></i>
                      : (GroupIcon && <GroupIcon size={14} className={`shrink-0 ${iconColorCls}`} />)}
                    <span className="truncate flex-1 text-left">{group.label}</span>
                    <ChevronUp size={12} className={`shrink-0 transition-transform ${open ? "" : "rotate-180"}`} />
                  </button>
                )}
                <div className={`space-y-0.5 overflow-hidden transition-all ${open ? "" : "hidden"}`}>
                  {visibleItems.map(item => {
                    const active = location.pathname === item.href;
                    const Icon = item.icon;
                    const badgeValue = item.badge === "chat" ? naoLidasTotal : 0;
                    const itemActiveCls   = active ? `${c.chipBg || "bg-blue-50"} ${c.active || "text-blue-700"}` : `text-slate-500 ${c.hoverBg || "hover:bg-slate-50"} hover:text-slate-800`;
                    const itemIconActiveCls = active ? (c.iconActive || "text-blue-600") : "text-slate-400 group-hover:text-slate-600";
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        title={collapsed ? `${item.label}${badgeValue > 0 ? ` (${badgeValue})` : ""}` : undefined}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                          ${itemActiveCls}
                          ${collapsed ? "justify-center" : ""}
                        `}
                      >
                        <span className={`relative shrink-0 transition-colors ${itemIconActiveCls}`}>
                          {item.iconClass
                            ? <i className={`fi ${item.iconClass} text-[18px] leading-none`}></i>
                            : <Icon size={18} strokeWidth={active ? 2 : 1.8} />}
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
                            {active && !badgeValue && <ChevronRight size={12} className={`${c.iconActive || "text-blue-400"} ml-auto shrink-0`} />}
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
                          {item.iconClass
                            ? <i className={`fi ${item.iconClass} text-[16px] leading-none`}></i>
                            : <Icon size={16} strokeWidth={active ? 2 : 1.8} />}
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
        <div className={`px-3 py-3 border-t border-slate-100 dark:border-slate-800 space-y-2 ${collapsed ? "flex flex-col items-center" : ""}`}>
          {/* Toggle Modo Escuro — switch ON/OFF */}
          {collapsed ? (
            <button
              onClick={toggleTheme}
              title={isDark ? "Desactivar modo escuro" : "Activar modo escuro"}
              aria-pressed={isDark}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-500 dark:text-amber-300 flex items-center justify-center transition-colors"
            >
              {isDark ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              aria-pressed={isDark}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-200">
                {isDark
                  ? <Moon size={14} className="text-amber-300" />
                  : <Sun size={14} className="text-amber-500" />}
                Modo escuro
              </span>
              {/* iOS-style switch */}
              <span className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${isDark ? "bg-blue-600" : "bg-slate-300"}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? "translate-x-4" : ""}`} />
              </span>
            </button>
          )}

          {/* User + logout */}
          {collapsed ? (
            <button
              onClick={handleLogout}
              title="Sair"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 text-slate-400 dark:text-slate-300 flex items-center justify-center transition-colors"
            >
              <LogOut size={16} strokeWidth={1.8} />
            </button>
          ) : (
            <div className="flex items-center gap-3 px-1 pt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-violet-200">
                {initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user?.nome}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">{user?.tipo}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                className="shrink-0 text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30"
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
    </div>
  );
}
