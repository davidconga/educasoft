import api from "../services/api";
import { setMeta, getMeta } from "./db";
import { syncAlunosSnapshot, syncDividasSnapshot } from "./alunos";

/**
 * Aquece a cache do service worker com leituras frequentemente usadas pelo
 * utilizador, logo após login. Fire-and-forget: se algum endpoint falhar,
 * apenas significa que essa leitura não ficará disponível offline desta vez.
 *
 * Lista de URLs vem do `/offline/manifest` (servidor decide, podemos ajustar
 * sem redeploy do frontend); se o manifest falhar, cai para um default por tipo.
 */
const WARMUP_FALLBACK_POR_TIPO = {
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

export async function warmupCache(userTipo) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  let urls = null;
  try {
    const { data: manifest } = await api.get("/offline/manifest");
    if (Array.isArray(manifest?.warmup_urls) && manifest.warmup_urls.length > 0) {
      urls = manifest.warmup_urls;
    }
    await setMeta("last_manifest", { at: Date.now(), manifest });
  } catch { /* manifest é best-effort */ }

  const lista = urls || WARMUP_FALLBACK_POR_TIPO[userTipo] || WARMUP_FALLBACK_POR_TIPO.admin;
  Promise.allSettled(lista.map(url => api.get(url).catch(() => null))).then(() => {
    if (typeof console !== "undefined") {
      console.debug("[Educajá] warm-up de cache concluído", { urls: lista.length });
    }
  });

  // Snapshot de alunos para pesquisa local offline (apenas para utilizadores
  // que efectivamente usam o POS / pesquisa de alunos). A seguir, snapshot
  // de dívidas para evitar o aviso "sem dívidas cacheadas" quando o operador
  // tocar num aluno offline pela primeira vez.
  if (userTipo === "admin") {
    syncAlunosSnapshot().then(() => syncDividasSnapshot());
  }
}

export async function getLastManifest() {
  return getMeta("last_manifest");
}
