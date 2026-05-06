import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { GraduationCap, Menu, X, Mail, MapPin, Phone } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import SiteChatWidget from "../../components/site/SiteChatWidget";

const navItems = [
  { to: "/",                 label: "Início" },
  { to: "/funcionalidades",  label: "Funcionalidades" },
  { to: "/precos",           label: "Preços" },
  { to: "/contacto",         label: "Contacto" },
];

function NavItem({ to, label, onClick }) {
  return (
    <NavLink to={to} end={to === "/"} onClick={onClick}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors px-3 py-2 rounded-lg
        ${isActive ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"}`}>
      {label}
    </NavLink>
  );
}

export default function SiteLayout() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const ctaTo = isAuthenticated()
    ? (user?.tipo === "aluno" ? "/portal" : user?.tipo === "professor" ? "/professor" : "/dashboard")
    : "/login";
  const ctaLabel = isAuthenticated() ? "Ir para a app" : "Entrar";

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-200">
              <GraduationCap size={18} strokeWidth={2.2}/>
            </div>
            <div className="leading-tight">
              <div className="text-base font-extrabold tracking-tight text-slate-900">Educajá</div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest -mt-0.5">Gestão Escolar</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(it => <NavItem key={it.to} {...it} />)}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {!isAuthenticated() && (
              <Link to="/cadastro" className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2">
                Inscrever escola
              </Link>
            )}
            <Link to={ctaTo}
              className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-sm shadow-blue-200">
              {ctaLabel}
            </Link>
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600">
            {open ? <X size={18}/> : <Menu size={18}/>}
          </button>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="md:hidden border-t border-slate-100 bg-white">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navItems.map(it => <NavItem key={it.to} {...it} onClick={() => setOpen(false)} />)}
              <hr className="my-2 border-slate-100"/>
              {!isAuthenticated() && (
                <Link to="/cadastro" onClick={() => setOpen(false)} className="text-sm font-semibold text-slate-700 px-3 py-2">
                  Inscrever escola
                </Link>
              )}
              <Link to={ctaTo} onClick={() => setOpen(false)}
                className="text-sm font-semibold bg-blue-600 text-white px-4 py-2.5 rounded-xl text-center mt-1">
                {ctaLabel}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 mt-20">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white">
                <GraduationCap size={18} strokeWidth={2.2}/>
              </div>
              <div className="text-white font-extrabold text-lg">Educajá</div>
            </div>
            <p className="mt-4 text-sm leading-relaxed max-w-md">
              Plataforma de gestão escolar pensada para escolas em Angola. Alunos, propinas,
              presenças, notas e SAFT-AO num só lugar — simples, multi-escola, em português.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-3">Plataforma</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/funcionalidades" className="hover:text-white">Funcionalidades</Link></li>
              <li><Link to="/precos" className="hover:text-white">Preços</Link></li>
              <li><Link to="/cadastro" className="hover:text-white">Inscrever escola</Link></li>
              <li><Link to="/login" className="hover:text-white">Entrar</Link></li>
              <li><Link to="/termos" className="hover:text-white">Termos e Condições</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-3">Contacto</h4>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2"><Mail size={14}/> <a href="mailto:contact@educaja.com" className="hover:text-white">contact@educaja.com</a></li>
              <li className="flex items-center gap-2"><MapPin size={14}/> Benguela, Angola</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 py-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Educajá. Todos os direitos reservados.
        </div>
      </footer>

      <SiteChatWidget />
    </div>
  );
}
