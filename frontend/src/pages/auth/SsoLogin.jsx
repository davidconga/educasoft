import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../store/auth";

export default function SsoLogin() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const ranRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = params.get("t");
    const tc    = params.get("tc");
    const exp   = Number(params.get("exp") || 0);
    const src   = params.get("src");

    if (!token || !tc || src !== "super-admin") {
      setError("Link SSO inválido.");
      return;
    }
    if (exp && Date.now() / 1000 > exp) {
      setError("Sessão de impersonação expirada. Pede um novo link ao super-admin.");
      return;
    }

    (async () => {
      try {
        const { data } = await axios.get(`/api/tenant/auth/me?tenant=${encodeURIComponent(tc)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAuth(
          token,
          data.user,
          data.escola,
          tc,
          data.plano ?? null,
          data.limites ?? null
        );
        sessionStorage.setItem("impersonation_active", "1");
        window.history.replaceState({}, "", window.location.pathname);
        navigate("/dashboard", { replace: true });
      } catch (e) {
        setError(e.response?.data?.message || "Falha ao validar token de impersonação.");
      }
    })();
  }, [params, navigate, setAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center">
        {error ? (
          <>
            <div className="text-red-600 text-4xl mb-3">⚠️</div>
            <h1 className="text-lg font-bold text-slate-800 mb-2">Acesso negado</h1>
            <p className="text-sm text-slate-600">{error}</p>
            <a href="/login" className="inline-block mt-5 text-blue-600 hover:underline text-sm">
              Ir para login normal
            </a>
          </>
        ) : (
          <>
            <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-slate-600">A entrar como administrador do tenant…</p>
          </>
        )}
      </div>
    </div>
  );
}
