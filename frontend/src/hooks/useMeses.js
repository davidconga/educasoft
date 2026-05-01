import { useEffect, useState } from "react";
import api from "../services/api";

/**
 * Hook que devolve os 12 meses do tenant (id, nome, abreviatura, ordem).
 * Cache em memória do módulo — só faz 1 request por sessão.
 *
 * Uso:
 *   const meses = useMeses();
 *   meses.map(m => <span>{m.nome}</span>)
 *
 * Helpers exportados:
 *   nomeMes(1) → "Janeiro"  · abrevMes(1) → "Jan"
 */
let _cache = null;
let _pending = null;

export function useMeses() {
  const [meses, setMeses] = useState(_cache || []);
  useEffect(() => {
    if (_cache) { setMeses(_cache); return; }
    if (!_pending) {
      _pending = api.get("/meses")
        .then(r => { _cache = r.data || []; return _cache; })
        .catch(() => { _pending = null; return []; });
    }
    _pending.then(setMeses);
  }, []);
  return meses;
}

export function nomeMes(idOuNumero) {
  if (!_cache) return "";
  const m = _cache.find(x => x.id === Number(idOuNumero));
  return m?.nome ?? "";
}

export function abrevMes(idOuNumero) {
  if (!_cache) return "";
  const m = _cache.find(x => x.id === Number(idOuNumero));
  return m?.abreviatura ?? "";
}
