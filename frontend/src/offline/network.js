import { useEffect, useState } from "react";
import { subscribe, pendingCount } from "./queue";

export function useNetworkStatus() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useOutboxCount() {
  const [counts, setCounts] = useState({ pending: 0, failed: 0, total: 0 });
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const c = await pendingCount();
      if (!cancelled) setCounts(c);
    };
    refresh();
    const unsub = subscribe(refresh);
    return () => { cancelled = true; unsub(); };
  }, []);
  return counts;
}
