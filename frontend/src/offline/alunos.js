import api from "../services/api";
import { getDb, STORES, setMeta, getMeta } from "./db";

/**
 * Cache local de alunos para pesquisa quando offline.
 *
 *  - Snapshot completo é baixado no warmup pós-login via `/offline/alunos-snapshot`
 *    (paginado por cursor) e gravado em IndexedDB.
 *  - Pesquisa local: prefix-match sobre `nome` ou `numero_aluno`, devolve até 20.
 *  - Dívidas por aluno: cacheadas à medida que o operador visita cada aluno
 *    online (via `cacheDividas` em `escolherAluno`). Quando offline, devolvemos
 *    o último snapshot que tivermos.
 */

const SNAPSHOT_META_KEY = "alunos_snapshot_meta";

function normaliza(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Sincroniza o snapshot completo de alunos. Fire-and-forget — não bloqueia o login. */
export async function syncAlunosSnapshot() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  const db = await getDb();
  let cursor = 0;
  let total = 0;
  const startedAt = Date.now();
  try {
    while (true) {
      const r = await api.get("/offline/alunos-snapshot", { params: { cursor, limit: 500 } });
      const items = Array.isArray(r.data?.items) ? r.data.items : [];
      if (items.length === 0) break;

      const tx = db.transaction(STORES.alunos, "readwrite");
      for (const a of items) {
        tx.store.put({ ...a, nome_lower: normaliza(a.nome) });
      }
      await tx.done;
      total += items.length;

      const next = r.data?.next_cursor;
      if (next == null) break;
      cursor = next;
    }
    await setMeta(SNAPSHOT_META_KEY, { at: Date.now(), total, ms: Date.now() - startedAt });
    if (typeof console !== "undefined") {
      console.debug("[Educajá] snapshot de alunos sincronizado", { total, ms: Date.now() - startedAt });
    }
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[Educajá] falha a sincronizar snapshot de alunos:", e?.message || e);
    }
  }
}

export async function getSnapshotMeta() {
  return getMeta(SNAPSHOT_META_KEY);
}

export async function searchAlunosLocal(q, limit = 20) {
  const query = normaliza(q);
  if (!query) return [];
  const db = await getDb();
  const all = await db.getAll(STORES.alunos);
  const onlyDigits = /^\d+$/.test(query);
  const matches = [];
  for (const a of all) {
    const nomeMatch  = a.nome_lower && a.nome_lower.includes(query);
    const numMatch   = a.numero_aluno && String(a.numero_aluno).toLowerCase().includes(query);
    const emailMatch = a.email && normaliza(a.email).includes(query);
    if (nomeMatch || numMatch || emailMatch) {
      // Prioriza match exacto de numero_aluno.
      const score =
        (onlyDigits && String(a.numero_aluno) === query ? 100 : 0) +
        (numMatch  ? 10 : 0) +
        (nomeMatch ? 5  : 0) +
        (emailMatch? 1  : 0);
      matches.push({ a, score });
      if (matches.length > 500) break; // sanity
    }
  }
  matches.sort((x, y) => y.score - x.score);
  return matches.slice(0, limit).map(m => m.a);
}

export async function getAlunoLocal(id) {
  const db = await getDb();
  return db.get(STORES.alunos, Number(id));
}

/** Guarda o payload completo de `/pos/alunos/{id}/dividas` para uso offline. */
export async function cacheDividas(alunoId, payload) {
  if (alunoId == null || !payload) return;
  const db = await getDb();
  await db.put(STORES.dividas, { aluno_id: Number(alunoId), payload, cached_at: Date.now() });
}

export async function getDividasLocal(alunoId) {
  const db = await getDb();
  const row = await db.get(STORES.dividas, Number(alunoId));
  return row?.payload || null;
}
