import { openDB } from "idb";

const DB_NAME = "educaja-offline";
const DB_VERSION = 1;

export const STORES = {
  outbox: "outbox",   // Escritas pendentes de envio
  cache:  "cache",    // Snapshot de leituras (key/value)
  meta:   "meta",     // Estado da app (last_sync, user_id, etc)
};

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
