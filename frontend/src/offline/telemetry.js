import api from "../services/api";
import { getMeta, setMeta } from "./db";
import { subscribe, pendingCount } from "./queue";

/**
 * Telemetria leve da camada offline.
 *
 * Acompanhamos:
 *   - quando a app foi para offline (`went_offline_at`)
 *   - quando voltou online (`back_online_at`)
 *   - quantas escritas ficaram na outbox e quantas sincronizaram
 *
 * No fim de cada ciclo offline→online→outbox vazia, envia um POST para
 * `/offline/telemetry`. Tudo best-effort — não bloqueia a app.
 */

const META_KEY = "telemetry_state";

async function loadState() {
  return (await getMeta(META_KEY)) || {
    went_offline_at: null,
    back_online_at: null,
    queued: 0,
    synced: 0,
    failed: 0,
    flush_started_at: null,
  };
}
async function saveState(s) { await setMeta(META_KEY, s); }
async function resetState() { await saveState({
  went_offline_at: null,
  back_online_at: null,
  queued: 0,
  synced: 0,
  failed: 0,
  flush_started_at: null,
}); }

let installed = false;

export function installTelemetry() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("offline", async () => {
    const s = await loadState();
    if (!s.went_offline_at) s.went_offline_at = Date.now();
    await saveState(s);
  });

  window.addEventListener("online", async () => {
    const s = await loadState();
    s.back_online_at = Date.now();
    s.flush_started_at = Date.now();
    await saveState(s);
  });

  let prevTotals = { pending: 0, failed: 0 };
  subscribe(async () => {
    try {
      const c = await pendingCount();
      const s = await loadState();
      // Incrementa "queued" sempre que pending sobe (novas entradas).
      const newlyQueued = Math.max(0, c.pending - prevTotals.pending);
      s.queued += newlyQueued;
      // "failed" total reflecte o estado actual.
      if (c.failed > s.failed) s.failed = c.failed;
      // Quando pending desce a zero após online, calcula synced = queued - failed.
      const empty = c.pending === 0 && c.failed === 0 && c.blocked === 0;
      if (empty && s.back_online_at && s.flush_started_at && s.queued > 0) {
        const now = Date.now();
        const payload = {
          session_started_at:  s.went_offline_at ? new Date(s.went_offline_at).toISOString() : null,
          session_ended_at:    new Date(now).toISOString(),
          queued:              s.queued,
          synced:              Math.max(0, s.queued - s.failed),
          failed:              s.failed,
          ms_until_first_sync: Math.max(0, s.flush_started_at - (s.back_online_at || s.flush_started_at)),
          ms_total:            Math.max(0, now - (s.went_offline_at || s.back_online_at || now)),
        };
        try { await api.post("/offline/telemetry", payload); } catch { /* ignore */ }
        await resetState();
      } else {
        await saveState(s);
      }
      prevTotals = { pending: c.pending, failed: c.failed };
    } catch { /* ignore */ }
  });
}
