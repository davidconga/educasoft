import { useAuthStore } from "../store/auth";

export function usePermissao() {
  const { user } = useAuthStore();

  // admin always has full access
  const can = (modulo) => {
    if (!user) return false;
    if (user.tipo === "admin") return true;
    if (!user.permissoes) return false;
    return user.permissoes.includes(modulo);
  };

  return { can };
}
