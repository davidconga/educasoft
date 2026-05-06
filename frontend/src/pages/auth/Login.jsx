import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { GraduationCap, BookOpen, Settings } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useBranding } from "../../hooks/useBranding";

const TIPOS = [
  {
    key: "aluno",
    label: "Aluno",
    icon: GraduationCap,
    descricao: "Acesso ao portal do aluno",
    tiposValidos: ["aluno"],
    redirect: "/portal",
  },
  {
    key: "professor",
    label: "Professor",
    icon: BookOpen,
    descricao: "Gestão de turmas e notas",
    tiposValidos: ["professor"],
    redirect: "/professor",
  },
  {
    key: "administrativo",
    label: "Administrativo",
    icon: Settings,
    descricao: "Gestão escolar completa",
    tiposValidos: ["admin","secretaria","director","tesouraria","coordenador"],
    redirect: "/dashboard",
  },
];

const isGolfinho = window.location.hostname === "v2.grupogolfinho.com";

export default function Login() {
  const [tipoSelecionado, setTipoSelecionado] = useState("aluno");
  const [form, setForm] = useState({ escola_codigo: isGolfinho ? "golfinho" : "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const branding = useBranding();

  const tipoConfig = TIPOS.find(t => t.key === tipoSelecionado);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(
        `/api/tenant/auth/login?tenant=${form.escola_codigo}`,
        { identifier: form.identifier, password: form.password }
      );

      if (!tipoConfig.tiposValidos.includes(data.user?.tipo)) {
        const nomes = { aluno: "Aluno", professor: "Professor", admin: "Administrativo" };
        setError(`Esta conta não pertence ao perfil "${tipoConfig.label}". Verifique o tipo de utilizador selecionado.`);
        setLoading(false);
        return;
      }

      setAuth(data.token, data.user, data.escola, form.escola_codigo, data.plano ?? null, data.limites ?? null);
      navigate(tipoConfig.redirect);
    } catch (err) {
      setError(err.response?.data?.message || "Credenciais inválidas. Verifique o código da escola.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 pt-8 pb-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 overflow-hidden">
            {branding.logo
              ? <img src={branding.logo} alt={branding.name} className="w-full h-full object-contain" />
              : <GraduationCap size={32} className="text-white" />
            }
          </div>
          <h1 className="text-2xl font-bold text-white">{branding.name}</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de Gestão Escolar</p>
        </div>

        <div className="p-8 space-y-5">
          {/* Seletor de tipo */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Entrar como</p>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS.map(t => {
                const Icon = t.icon;
                const active = tipoSelecionado === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { setTipoSelecionado(t.key); setError(""); setForm(f => ({ ...f, identifier: "" })); }}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 text-center transition-all
                      ${active
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                  >
                    <Icon size={20} className={active ? "text-blue-600" : "text-slate-400"} />
                    <span className="text-xs font-semibold leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">{tipoConfig.descricao}</p>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Código da Escola</label>
              <input
                value={form.escola_codigo}
                readOnly={isGolfinho}
                onChange={isGolfinho ? undefined : e => setForm({ ...form, escola_codigo: e.target.value })}
                required
                placeholder={isGolfinho ? undefined : "Código da escola"}
                className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm ${isGolfinho ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {tipoSelecionado === "aluno" ? "Nº de Matrícula" : "Email"}
              </label>
              <input
                type={tipoSelecionado === "aluno" ? "text" : "email"}
                required
                value={form.identifier}
                onChange={e => setForm({ ...form, identifier: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                placeholder={tipoSelecionado === "aluno" ? "Ex: 076556" : "email@escola.ao"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm mt-1"
            >
              {loading ? "A entrar..." : `Entrar como ${tipoConfig.label} →`}
            </button>
          </form>

          <div className="flex items-center justify-between text-sm text-slate-500 pt-1">
            <Link to="/recuperar-senha" className="text-blue-600 hover:underline text-xs">
              Esqueceu a senha?
            </Link>
            <Link to="/downloads" className="text-blue-600 hover:underline text-xs flex items-center gap-1">
              <span>⬇</span> Descarregar App
            </Link>
          </div>

          {!isGolfinho && (
            <p className="text-center text-xs text-slate-500 pt-1">
              Ainda não tem conta?{" "}
              <Link to="/cadastro" className="text-blue-600 hover:underline font-medium">
                Inscrever escola
              </Link>
            </p>
          )}

          <p className="text-center text-xs text-slate-400 pt-1">
            {branding.name} © {new Date().getFullYear()} — Gestão Escolar Multi-Escola
          </p>
        </div>
      </div>
    </div>
  );
}
