import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useCentralAuth } from "../../store/centralAuth";

const nav = [
  { to: "/super-admin",         label: "Dashboard",  icon: "📊", end: true },
  { to: "/super-admin/escolas", label: "Escolas",     icon: "🏫" },
];

export default function SuperAdminLayout() {
  const { user, logout } = useCentralAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/super-admin/login"); };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xl">⚙️</span>
            <span className="font-bold text-base">EduSoft</span>
          </div>
          <p className="text-xs text-gray-400 ml-7">Super-Admin</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-400 truncate mb-2">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
          >
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
