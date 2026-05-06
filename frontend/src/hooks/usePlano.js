import { useCallback, useEffect } from "react";
import api from "../services/api";
import { useAuthStore } from "../store/auth";

const REFRESH_MS = 60_000;

/**
 * Hook que expõe o plano activo do tenant + helpers.
 *   - Lazy fetch inicial se ainda não houver plano no store.
 *   - Auto-refresh a cada 60s para apanhar mudanças feitas pelo super-admin
 *     sem o cliente ter de fazer logout/login.
 *   - Refresh manual disponível em `recarregar()`.
 */
export function usePlano() {
  const plano = useAuthStore(s => s.plano);
  const limites = useAuthStore(s => s.limites);
  const setPlano = useAuthStore(s => s.setPlano);
  const setLimites = useAuthStore(s => s.setLimites);
  const token = useAuthStore(s => s.token);

  const recarregar = useCallback(async () => {
    if (!token) return;
    try {
      const r = await api.get("/auth/me");
      if (r.data?.plano)   setPlano(r.data.plano);
      if (r.data?.limites) setLimites(r.data.limites);
    } catch {/* silencioso */}
  }, [token, setPlano, setLimites]);

  useEffect(() => {
    if (!token) return;
    if (!plano) recarregar();
    const id = setInterval(recarregar, REFRESH_MS);
    return () => clearInterval(id);
  }, [token, plano, recarregar]);

  const hasFeature = (key) => Array.isArray(plano?.feature_keys) && plano.feature_keys.includes(key);
  const featureMissing = (key) => !!plano && !hasFeature(key);

  return { plano, limites, hasFeature, featureMissing, recarregar };
}
