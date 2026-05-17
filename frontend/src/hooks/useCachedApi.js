import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import { getCache, setCache } from "../offline/db";

/**
 * Stale-while-revalidate para GETs read-only.
 *
 *  - Lê IndexedDB → renderiza com cache imediato (loading=false rápido).
 *  - Em paralelo, faz o GET ao servidor; se 200, actualiza o estado e o cache.
 *  - Offline / rede caída: mantém o valor cacheado e marca `fromCache: true`.
 *  - Sem cache nem rede: `error` é populado.
 *
 * Trade-off: o componente re-renderiza até 2 vezes na 1ª visita (cache, depois
 * network). Aceitável para listagens que normalmente cabem numa render.
 *
 * `params` deve ser estável entre renders (criar fora do componente ou usar
 * `useMemo`). O hook reage a mudanças via JSON.stringify.
 */
export function useCachedApi(endpoint, params = null, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  // Usar ref para saber se já temos algo a renderizar sem depender da render anterior.
  const hasDataRef = useRef(false);

  const cacheKey = `api:${endpoint}` + (params ? `?${JSON.stringify(params)}` : "");

  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    let cancelled = false;
    hasDataRef.current = false;
    setLoading(true);
    setError(null);

    // 1) Cache primeiro — render rápido.
    getCache(cacheKey).then(c => {
      if (cancelled || hasDataRef.current) return;
      if (c?.value !== undefined) {
        setData(c.value);
        setFromCache(true);
        setLoading(false);
        hasDataRef.current = true;
      }
    }).catch(() => {});

    // 2) Network em paralelo (revalidate).
    api.get(endpoint, params ? { params } : undefined)
      .then(r => {
        if (cancelled) return;
        setData(r.data);
        setFromCache(false);
        setLoading(false);
        setError(null);
        hasDataRef.current = true;
        setCache(cacheKey, r.data).catch(() => {});
      })
      .catch(e => {
        if (cancelled) return;
        const isNetwork = !e?.response;
        if (isNetwork) {
          // sem cache E sem rede → erro; com cache mantemos o valor anterior.
          if (!hasDataRef.current) { setError(e); setLoading(false); }
        } else {
          setError(e);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, JSON.stringify(params), enabled]);

  return { data, loading, error, fromCache };
}
