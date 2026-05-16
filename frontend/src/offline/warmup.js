import api from "../services/api";

/**
 * Aquece a cache do service worker com leituras frequentemente usadas pelo
 * utilizador, logo após login. Fire-and-forget: se algum endpoint falhar,
 * apenas significa que essa leitura não ficará disponível offline desta vez.
 *
 * Mapa de leituras por tipo de utilizador.
 */
const WARMUP_POR_TIPO = {
  admin: [
    "/dashboard",
    "/caixa/actual",
    "/precario/propinas",
    "/precario/emolumentos",
    "/configuracoes/escola",
    "/meses",
  ],
  professor: [
    "/configuracoes/escola",
    "/meses",
  ],
  aluno: [
    "/configuracoes/escola",
  ],
};

export function warmupCache(userTipo) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const lista = WARMUP_POR_TIPO[userTipo] || WARMUP_POR_TIPO.admin;
  // Dispara em paralelo, ignora erros — o objectivo é só popular a cache do SW.
  Promise.allSettled(lista.map(url => api.get(url).catch(() => null))).then(() => {
    if (typeof console !== "undefined") {
      console.debug("[Educajá] warm-up de cache concluído", { urls: lista.length });
    }
  });
}
