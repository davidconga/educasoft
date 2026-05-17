import { openDB } from "idb";

const DB_NAME = "educaja-offline";
// v2: adicionada store `alunos` (snapshot pesquisável offline) + `dividas` por aluno.
const DB_VERSION = 2;

export const STORES = {
  outbox:  "outbox",   // Escritas pendentes de envio
  cache:   "cache",    // Snapshot de leituras (key/value)
  meta:    "meta",     // Estado da app (last_sync, user_id, etc)
  alunos:  "alunos",   // Snapshot de alunos (id, nome, numero_aluno, turma) p/ pesquisa local
  dividas: "dividas",  // Cache de `/pos/alunos/{id}/dividas` por aluno_id
};

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORES.outbox)) {
          const s = db.createObjectStore(STORES.outbox, { keyPath: "id", autoIncrement: true });
          s.createIndex("status", "status");
          s.createIndex("createdAt", "createdAt");
        }
        if (!db.objectStoreNames.contains(STORES.cache)) {
          db.createObjectStore(STORES.cache, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: "key" });
        }
        // v2
        if (!db.objectStoreNames.contains(STORES.alunos)) {
          const s = db.createObjectStore(STORES.alunos, { keyPath: "id" });
          s.createIndex("numero_aluno", "numero_aluno");
          s.createIndex("nome_lower", "nome_lower");
        }
        if (!db.objectStoreNames.contains(STORES.dividas)) {
          db.createObjectStore(STORES.dividas, { keyPath: "aluno_id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function setMeta(key, value) {
  const db = await getDb();
  await db.put(STORES.meta, { key, value });
}

export async function getMeta(key) {
  const db = await getDb();
  const row = await db.get(STORES.meta, key);
  return row?.value;
}

// Cache genérica de respostas (key arbitrária, valor JSON). Usada por páginas
// que precisam de mostrar dados offline mas não querem depender só do SW.
export async function setCache(key, value) {
  const db = await getDb();
  await db.put(STORES.cache, { key, value, at: Date.now() });
}

export async function getCache(key) {
  const db = await getDb();
  const row = await db.get(STORES.cache, key);
  return row ? { value: row.value, at: row.at } : null;
}
