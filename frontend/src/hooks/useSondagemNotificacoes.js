import { useEffect, useState } from "react";
import api from "../services/api";

const INTERVALO_MS = 15000;

/**
 * Polling leve da contagem de notificações não-lidas no portal do aluno.
 * Pausa quando o separador está oculto.
 */
export function useSondagemNotificacoes({ activo = true } = {}) {
  const [naoLidas, setNaoLidas] = useState(0);

  useEffect(() => {
    if (!activo) return undefined;
    let parado = false;

    const tick = async () => {
      if (parado) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const r = await api.get("/portal/notificacoes/contagem");
        if (!parado) setNaoLidas(Number(r.data?.nao_lidas ?? 0));
      } catch {
        // silencioso
      }
    };

    tick();
    const id = setInterval(tick, INTERVALO_MS);
    return () => { parado = true; clearInterval(id); };
  }, [activo]);

  return { naoLidas, setNaoLidas };
}
