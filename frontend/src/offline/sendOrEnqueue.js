import api from "../services/api";
import { enqueue } from "./queue";

/**
 * Tenta enviar a request imediatamente. Se a rede estiver caída
 * (ou houver erro de rede), guarda na outbox e devolve `{ queued: true, id }`.
 * Em caso de sucesso, devolve `{ queued: false, data }`.
 *
 * Erros HTTP do servidor (4xx/5xx) são propagados como excepção — não fazem queue,
 * pois o servidor recebeu mas rejeitou.
 */
export async function sendOrEnqueue({ method, url, data, meta, label }) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!offline) {
    try {
      const res = await api.request({ method, url, data });
      return { queued: false, data: res.data };
    } catch (err) {
      const isNetwork = !err.response; // sem resposta = falha de rede / DNS / CORS
      if (!isNetwork) throw err;
      // cai para enqueue
    }
  }
  const id = await enqueue({ method, url, data, meta, label });
  return { queued: true, id };
}
