import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { GraduationCap, BookOpen, Settings, WifiOff, Wifi, User as UserIcon, Trash2 } from "lucide-react";
import { useAuthStore } from "../../store/auth";
import { useBranding } from "../../hooks/useBranding";
import { useNetworkStatus } from "../../offline/network";
import { listOperators, provisionOperator, unlockOperator, removeOperator } from "../../offline/operators";

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

// Map de tipo do utilizador → redirect (usado no login offline, onde não temos o tipoConfig seleccionado).
function redirectForTipo(tipo) {
  for (const t of TIPOS) if (t.tiposValidos.includes(tipo)) return t.redirect;
  return "/dashboard";
}

const isGolfinho = window.location.hostname === "v2.grupogolfinho.com";

export default function Login() {
  const [tipoSelecionado, setTipoSelecionado] = useState("aluno");
  const [form, setForm] = useState({ escola_codigo: isGolfinho ? "golfinho" : "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberOffline, setRememberOffline] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const branding = useBranding();
  const online = useNetworkStatus();

  // Operadores provisionados localmente.
  const [operadores, setOperadores] = useState([]);
  const [modo, setModo] = useState("online");   // "online" | "offline"
  const [operadorEscolhido, setOperadorEscolhido] = useState(null);
  const [passOffline, setPassOffline] = useState("");

  const tipoConfig = TIPOS.find(t => t.key === tipoSelecionado);

  // Carregar operadores ao montar e sempre que a rede mudar.
  useEffect(() => {
    let cancelado = false;
    listOperators().then(list => {
      if (cancelado) return;
      setOperadores(list);
      // Se está offline e existem operadores provisionados, abrir modo offline por defeito.
      if (!online && list.length > 0) setModo("offline");
    }).catch(() => {});
    return () => { cancelado = true; };
  }, [online]);

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
        setError(`Esta conta não pertence ao perfil "${tipoConfig.label}". Verifique o tipo de utilizador selecionado.`);
        setLoading(false);
        return;
      }

      setAuth(data.token, data.user, data.escola, form.escola_codigo, data.plano ?? null, data.limites ?? null);
      // Warm-up da cache offline (fire-and-forget) — popula o SW com as leituras frequentes.
      import("../../offline/warmup").then(({ warmupCache }) => warmupCache(data.user?.tipo));
      // Se o operador marcou "lembrar para offline", provisiona localmente.
      if (rememberOffline) {
        try {
          await provisionOperator({
            password: form.password,
            escola_codigo: form.escola_codigo,
            auth: {
              token:    data.token,
              user:     data.user,
              escola:   data.escola,
              plano:    data.plano ?? null,
              limites:  data.limites ?? null,
              tenantId: form.escola_codigo,
            },
          });
        } catch (e) {
          // Não bloqueia o login online se o provisionamento falhar.
          console.warn("[Educajá] falha ao provisionar operador offline:", e);
        }
      }
      navigate(tipoConfig.redirect);
    } catch (err) {
      const isNetwork = !err?.response;
      if (isNetwork && operadores.length > 0) {
        setError("Sem rede. Podes entrar offline abaixo com um operador registado neste dispositivo.");
        setModo("offline");
      } else if (isNetwork) {
        setError("Sem rede e nenhum operador registado neste dispositivo. Liga-te à internet para entrar pela 1ª vez.");
      } else {
        setError(err.response?.data?.message || "Credenciais inválidas. Verifique o código da escola.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitOffline = async (e) => {
    e.preventDefault();
    setError("");
    if (!operadorEscolhido) { setError("Escolhe um operador da lista."); return; }
    if (!passOffline)        { setError("Indica a password.");           return; }
    setLoading(true);
    try {
      const auth = await unlockOperator(operadorEscolhido.id, passOffline);
      // Restaurar sessão no zustand store.
      setAuth(
        auth.token,
        auth.user,
        auth.escola,
        auth.tenantId || operadorEscolhido.escola_codigo,
        auth.plano ?? null,
        auth.limites ?? null
      );
      navigate(redirectForTipo(auth.user?.tipo));
    } catch (e) {
      setError(e?.message || "Não foi possível desbloquear este operador.");
    } finally {
      setLoading(false);
    }
  };

  const removerOperador = async (op) => {
    if (!confirm(`Remover ${op.nome} deste dispositivo? Já não poderá entrar offline aqui.`)) return;
    try {
      await removeOperator(op.id);
      const list = await listOperators();
      setOperadores(list);
      if (operadorEscolhido?.id === op.id) { setOperadorEscolhido(null); setPassOffline(""); }
      if (list.length === 0) setModo("online");
    } catch { /* ignore */ }
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
          {/* Toggle online/offline */}
          {operadores.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setModo("online"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all
                  ${modo === "online" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Wifi size={14}/> Online {!online && <span className="text-amber-600">(sem rede)</span>}
              </button>
              <button
                type="button"
                onClick={() => { setModo("offline"); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all
                  ${modo === "offline" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <WifiOff size={14}/> Offline ({operadores.length})
              </button>
            </div>
          )}

          {/* Seletor de tipo — só no modo online (no offline o tipo vem do user cacheado). */}
          {modo === "online" && (
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
          )}

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Modo ONLINE — formulário tradicional */}
          {modo === "online" && (
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

              {/* Apenas Administrativo: opção de provisionar para uso offline. */}
              {tipoSelecionado === "administrativo" && (
                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberOffline}
                    onChange={e => setRememberOffline(e.target.checked)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <span>
                    <strong className="text-slate-700">Lembrar este dispositivo para entrada offline.</strong>{" "}
                    Próximas entradas sem rede aparecem na aba <em>Offline</em>. As credenciais ficam encriptadas localmente.
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm mt-1"
              >
                {loading ? "A entrar..." : `Entrar como ${tipoConfig.label} →`}
              </button>
            </form>
          )}

          {/* Modo OFFLINE — lista de operadores + password */}
          {modo === "offline" && (
            <form onSubmit={handleSubmitOffline} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">
                  Operadores deste dispositivo
                </p>
                {operadores.length === 0 ? (
                  <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-6 text-center">
                    Nenhum operador registado neste dispositivo.<br/>
                    <span className="text-xs text-slate-400">Liga-te à internet, entra normalmente e marca "Lembrar este dispositivo".</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {operadores.map(op => {
                      const active = operadorEscolhido?.id === op.id;
                      return (
                        <div
                          key={op.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all
                            ${active ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                          onClick={() => { setOperadorEscolhido(op); setError(""); }}
                        >
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {(op.nome?.[0] || op.email?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{op.nome}</p>
                            <p className="text-[11px] text-slate-500 truncate">{op.email} · {op.escola_nome || op.escola_codigo}</p>
                          </div>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); removerOperador(op); }}
                            title="Remover deste dispositivo"
                            className="text-slate-300 hover:text-red-500 p-1"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {operadorEscolhido && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    autoFocus
                    value={passOffline}
                    onChange={e => setPassOffline(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    placeholder="••••••••"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <UserIcon size={11}/> Validação local (sem internet). O token cacheado é re-validado quando voltar a rede.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || operadores.length === 0}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 text-sm mt-1"
              >
                {loading ? "A validar..." : "Entrar offline →"}
              </button>
            </form>
          )}

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
