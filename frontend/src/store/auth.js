import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null, user: null, escola: null, tenantId: null, plano: null, limites: null,
      setAuth: (token, user, escola, tenantId, plano = null, limites = null) => {
        localStorage.setItem("token", token);
        localStorage.setItem("tenant_id", tenantId);
        set({ token, user, escola, tenantId, plano, limites });
      },
      updateEscola: (patch) => set(state => ({ escola: { ...(state.escola || {}), ...patch } })),
      setPlano: (plano) => set({ plano }),
      setLimites: (limites) => set({ limites }),
      logout: () => { localStorage.clear(); set({ token: null, user: null, escola: null, tenantId: null, plano: null, limites: null }); },
      isAuthenticated: () => !!get().token,
      hasFeature: (key) => {
        const p = get().plano;
        if (!p) return false;
        return Array.isArray(p.feature_keys) && p.feature_keys.includes(key);
      },
    }),
    { name: "auth-storage" }
  )
);
