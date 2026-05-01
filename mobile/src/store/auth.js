import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuthStore = create((set, get) => ({
  token:  null,
  user:   null,
  escola: null,
  tenant: null,

  hydrate: async () => {
    const token  = await AsyncStorage.getItem("token");
    const user   = JSON.parse(await AsyncStorage.getItem("user")   || "null");
    const escola = JSON.parse(await AsyncStorage.getItem("escola") || "null");
    const tenant = await AsyncStorage.getItem("tenant");
    set({ token, user, escola, tenant });
  },

  setAuth: async (token, user, escola, tenant) => {
    await AsyncStorage.setItem("token",  token);
    await AsyncStorage.setItem("user",   JSON.stringify(user));
    await AsyncStorage.setItem("escola", JSON.stringify(escola));
    await AsyncStorage.setItem("tenant", tenant);
    set({ token, user, escola, tenant });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(["token", "user", "escola", "tenant"]);
    set({ token: null, user: null, escola: null, tenant: null });
  },

  isAuthenticated: () => !!get().token,
}));
