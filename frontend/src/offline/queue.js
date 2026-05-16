import { getDb, STORES, getMeta, setMeta } from "./db";
import api from "../services/api";

const ID_MAP_KEY = "outbox_id_map"; // { [localId]: realId }

async function getIdMap() {
  return (await getMeta(ID_MAP_KEY)) || {};
}
async function recordIdMapping(localId, realId) {
  if (!localId || realId == null) return;
  const map = await getIdMap();
  map[localId] = realId;
  await setMeta(ID_MAP_KEY, map);
}

/**
 * Reescreve uma entrada da outbox substituindo IDs locais (`tmp-...`)
 * por IDs reais já conhecidos via mapping. Devolve:
 *   { ok: true } se a entrada está pronta a enviar
 *   { ok: false, missing: [tmpId...] } se ainda há IDs sem mapping (postponer).
 */
function rewriteEntryIds(entry, idMap) {
  if (!entry?.data || typeof entry.data !== "object") return { ok: true };
  // Lugares conhecidos onde podem aparecer IDs locais.
  const arrays = ["ids"]; // outros podem ser adicionados aqui à medida que mais fluxos suportem offline
  const missing = [];
  for (const k of arrays) {
    if (!Array.isArray(entry.data[k])) continue;
    entry.data[k] = entry.data[k].map(v => {
      if (typeof v === "string" && v.startsWith("tmp-")) {
        if (idMap[v] != null) return idMap[v];
        missing.push(v);
        return v;
      }
      return v;
    });
  }
  return missing.length ? { ok: false, missing } : { ok: true };
}

const listeners = new Set();
let flushing = false;

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* ignore */ }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Adiciona uma escrita à fila offline. Devolve o id local da entrada.
 *
 * @param {object} entry
 * @param {"POST"|"PUT"|"PATCH"|"DELETE"} entry.method
 * @param {string} entry.url        Caminho relativo (ex.: "/pos/cobrar").
 * @param {object} [entry.data]     Payload JSON.
 * @param {object} [entry.meta]     Metadados livres para a UI (ex.: aluno_id, descrição).
 * @param {string} [entry.label]    Label legível para o utilizador.
 */
export async function enqueue(entry) {
  const db = await getDb();
  const row = {
    method: entry.method,
    url: entry.url,
    data: entry.data ?? null,
    meta: entry.meta ?? null,
    label: entry.label ?? `${entry.method} ${entry.url}`,
    status: "pending",
    attempts: 0,
    lastError: null,
    createdAt: Date.now(),
    syncedAt: null,
  };
  const id = await db.add(STORES.outbox, row);
  notify();
  return id;
}

export async function pendingCount() {
  const db = await getDb();
  const tx = db.transaction(STORES.outbox, "readonly");
  const idx = tx.store.index("status");
  const pending = await idx.count("pending");
  const failed  = await idx.count("failed");
  const blocked = await idx.count("blocked");
  return { pending, failed, blocked, total: pending + failed + blocked };
}

/**
 * Encontra entradas que dependem de um `local_id` (i.e., têm-no em `data.ids`).
 * Útil para cascade-delete: remover um `pagamentos.criar` falhado deve
 * também cancelar quaisquer `pos.cobrar` pendentes que o referenciam.
 */
export async function findDependents(localId) {
  if (!localId) return [];
  const db = await getDb();
  const all = await db.getAll(STORES.outbox);
  return all.filter(e => Array.isArray(e?.data?.ids) && e.data.ids.includes(localId) && e.status !== "synced");
}

export async function listOutbox() {
  const db = await getDb();
  return db.getAll(STORES.outbox);
}

export async function removeEntry(id) {
  const db = await getDb();
  await db.delete(STORES.outbox, id);
  notify();
}

/**
 * Remove uma entrada da outbox e, opcionalmente, cascade-remove quaisquer
 * dependentes (entradas que referenciam o `local_id` desta entrada).
 * Devolve o nº de entradas removidas no total.
 */
export async function removeEntryWithCascade(id) {
  const db = await getDb();
  const entry = await db.get(STORES.outbox, id);
  if (!entry) return 0;
  const dependents = entry.meta?.local_id ? await findDependents(entry.meta.local_id) : [];
  const tx = db.transaction(STORES.outbox, "readwrite");
  await tx.store.delete(id);
  for (const d of dependents) await tx.store.delete(d.id);
  await tx.done;
  notify();
  return 1 + dependents.length;
}

async function attempt(entry) {
  const db = await getDb();

  // Resolver quaisquer IDs locais ainda presentes no payload.
  const idMap = await getIdMap();
  const rw = rewriteEntryIds(entry, idMap);
  if (!rw.ok) {
    // Há IDs locais sem mapping ainda → esperar pelos creates pendentes.
    entry.status = "blocked";
    entry.lastError = {
      status: null,
      message: `À espera de sincronizar dependências: ${rw.missing.join(", ")}`,
      data: { blockedBy: rw.missing },
      at: Date.now(),
    };
    await db.put(STORES.outbox, entry);
    notify();
    return { ok: false, error: entry.lastError, hard: false, blocked: true };
  }
  // Se já tínhamos blocked mas agora resolveu, voltar a pending para tentar enviar.
  if (entry.status === "blocked") entry.status = "pending";

  entry.status = "syncing";
  entry.attempts += 1;
  await db.put(STORES.outbox, entry);
  notify();

  try {
    const res = await api.request({
      method: entry.method,
      url: entry.url,
      data: entry.data,
    });
    entry.status = "synced";
    entry.syncedAt = Date.now();
    entry.response = res.data;
    await db.put(STORES.outbox, entry);
    // Se a entrada criou uma entidade com ID local, registar o mapping.
    if (entry.meta?.local_id && res.data?.id != null) {
      await recordIdMapping(entry.meta.local_id, res.data.id);
    }
    notify();
    return { ok: true, data: res.data };
  } catch (err) {
    const status = err?.response?.status;
    // 4xx (excepto 408/429) = erro do cliente → marcar como falhado, requer intervenção do utilizador.
    // 408/429/5xx ou rede caída → continua pending para próximo flush.
    const hardClient = status && status >= 400 && status < 500 && status !== 408 && status !== 429;
    entry.status = hardClient ? "failed" : "pending";
    entry.lastError = {
      status: status ?? null,
      message: err?.response?.data?.message || err.message || "erro desconhecido",
      data: err?.response?.data ?? null,
      at: Date.now(),
    };
    await db.put(STORES.outbox, entry);
    notify();
    return { ok: false, error: entry.lastError, hard: hardClient };
  }
}

/** Tenta enviar todas as entradas pending. Não levanta. */
export async function flush() {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    const db = await getDb();
    const all = await db.getAllFromIndex(STORES.outbox, "status", "pending");
    // Ordem cronológica de criação.
    all.sort((a, b) => a.createdAt - b.createdAt);
    for (const entry of all) {
      const r = await attempt(entry);
      // erro transitório de rede → parar este flush (sem ponto martelar offline)
      if (!r.ok && !r.hard && !r.blocked) break;
      // hard error 4xx ou blocked → saltar esta entrada, tentar as seguintes
    }
    // Após uma passagem, re-tentar quaisquer entries que estavam blocked e
    // agora podem ter dependências resolvidas (idMap actualizado).
    const stillBlocked = await db.getAllFromIndex(STORES.outbox, "status", "blocked");
    if (stillBlocked.length > 0) {
      const map = await getIdMap();
      for (const e of stillBlocked) {
        const r = rewriteEntryIds(e, map);
        if (r.ok) {
          e.status = "pending";
          e.lastError = null;
          await db.put(STORES.outbox, e);
        }
      }
      notify();
    }
  } finally {
    flushing = false;
  }
}

/** Marca uma entrada falhada como pending de novo (após o utilizador corrigir). */
export async function retry(id) {
  const db = await getDb();
  const entry = await db.get(STORES.outbox, id);
  if (!entry) return;
  entry.status = "pending";
  entry.lastError = null;
  await db.put(STORES.outbox, entry);
  notify();
  await flush();
}

let installed = false;
export function installAutoFlush() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("online", () => { flush(); });
  // Tenta uma vez ao carregar.
  if (navigator.onLine) {
    // pequeno atraso para deixar a app montar
    setTimeout(() => flush(), 1500);
  }
  // Retry periódico (5 min) para entradas pending que ficaram para trás (ex.: token renovado).
  setInterval(() => { if (navigator.onLine) flush(); }, 5 * 60 * 1000);
}
