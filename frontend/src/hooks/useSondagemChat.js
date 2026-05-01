import { useEffect, useRef, useState } from "react";
import { chatService } from "../services/chatService";

const INTERVALO_MS = 4000;

/**
 * Polling do chat: chama /chat/sondagem a cada 4s enquanto o separador
 * está visível. Devolve { naoLidasTotal, alteradas, agora }.
 *
 * `onAlteradas(alteradas)` é chamado sempre que há conversas com novas
 * mensagens, para que a UI possa recarregar a janela aberta.
 */
export function useSondagemChat({ activo = true, onAlteradas } = {}) {
  const [naoLidasTotal, setNaoLidasTotal] = useState(0);
  const desdeRef = useRef(null);
  const callbackRef = useRef(onAlteradas);

  useEffect(() => { callbackRef.current = onAlteradas; }, [onAlteradas]);

  useEffect(() => {
    if (!activo) return undefined;
    let parado = false;

    const tick = async () => {
      if (parado) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const data = await chatService.sondagem(desdeRef.current);
        if (parado) return;
        setNaoLidasTotal(data.nao_lidas_total ?? 0);
        if (Array.isArray(data.alteradas) && data.alteradas.length && callbackRef.current) {
          callbackRef.current(data.alteradas);
        }
        desdeRef.current = data.agora;
      } catch {
        // silencioso — próximo tick tenta de novo
      }
    };

    tick();
    const id = setInterval(tick, INTERVALO_MS);
    return () => { parado = true; clearInterval(id); };
  }, [activo]);

  return { naoLidasTotal };
}
