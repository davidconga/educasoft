import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null, user: null, escola: null, tenantId: null,
      setAuth: (token, user, escola, tenantId) => {
        localStorage.setItem("token", token);
        localStorage.setItem("tenant_id", tenantId);
        set({ token, user, escola, tenantId });
      },
      logout: () => { localStorage.clear(); set({ token: null, user: null, escola: null, tenantId: null }); },
      isAuthenticated: () => !!get().token,
    }),
    { name: "auth-storage" }
  )
);
