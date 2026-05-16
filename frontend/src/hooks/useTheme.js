import { useEffect, useState } from "react";

const STORAGE_KEY = "theme"; // "light" | "dark" | "system"

function applyTheme(theme) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Default = "light" (claro). Só passa a escuro se o utilizador alternar manualmente.
    // Valores antigos "system" são tratados como "light" (modo escuro NÃO é padrão).
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return (v === "dark" || v === "light") ? v : "light";
    } catch { return "light"; }
  });

  useEffect(() => {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    if (theme !== "system") return;
    // Quando "system", segue mudanças do SO
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  const isDark = document.documentElement.classList.contains("dark");
  const cycle  = () => setTheme(t => t === "light" ? "dark" : t === "dark" ? "system" : "light");
  // Toggle binário: alterna directamente entre claro e escuro (ignora o "sistema")
  const toggle = () => setTheme(isDark ? "light" : "dark");
  return { theme, setTheme, isDark, cycle, toggle };
}
