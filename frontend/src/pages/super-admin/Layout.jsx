import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { LayoutDashboard, School, MessageCircle, Inbox, LogOut, Settings, Users, Receipt, Layers, Repeat, ShieldCheck, CreditCard } from "lucide-react";

const nav = [
  { to: "/super-admin",            label: "Dashboard",     Icon: LayoutDashboard, end: true },
  { to: "/super-admin/escolas",    label: "Escolas",        Icon: School, badge: "pendentes" },
  { to: "/super-admin/clientes",   label: "Clientes",       Icon: Users },
  { to: "/super-admin/assinaturas", label: "Assinaturas",   Icon: Repeat },
  { to: "/super-admin/planos",     label: "Planos",         Icon: Layers },
  { to: "/super-admin/facturas",   label: "Facturação",     Icon: Receipt },
  { to: "/super-admin/chat",       label: "Chat do site",   Icon: MessageCircle, badge: "chat" },
  { to: "/super-admin/contactos",  label: "Contactos",      Icon: Inbox, badge: "contactos" },
  { to: "/super-admin/termos",     label: "Termos",         Icon: ShieldCheck },
  { to: "/super-admin/vendus",     label: "Integração Vendus", Icon: Receipt },
  { to: "/super-admin/intelize",   label: "Intelize",       Icon: CreditCard },
];

export default function SuperAdminLayout() {
  const { user, logout, token } = useCentralAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ chat: 0, contactos: 0, pendentes: 0 });

  const handleLogout = () => { logout(); navigate("/super-admin/login"); };

  useEffect(() => {
    if (!token) return;
    const api = axios.create({ baseURL: "/api/v1", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    async function tick() {
      try {
        const { data } = await api.get("/dashboard");
        setCounts({
          chat:      data.chats_nao_lidos ?? 0,
          contactos: data.contactos_novos ?? 0,
          pendentes: data.escolas_pendentes ?? 0,
        });
      } catch {/* ignore */}
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-0.5">
            <Settings size={18} />
            <span className="font-bold text-base">Educajá</span>
          </div>
          <p className="text-xs text-gray-400 ml-7">Super-Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, Icon, end, badge }) => {
            const count = badge ? counts[badge] : 0;
            return (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}>
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 truncate mb-2">{user?.email}</p>
          <button onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 transition-colors">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
