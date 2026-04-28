import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCentralAuth = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem("central_token", token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem("central_token");
        set({ token: null, user: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: "central-auth-storage" }
  )
);
