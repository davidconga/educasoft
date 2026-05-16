import api from "../services/api";
import { enqueue } from "./queue";

function genIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "send-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/**
 * Tenta enviar a request imediatamente. Se a rede estiver caída
 * (ou houver erro de rede), guarda na outbox e devolve `{ queued: true, id }`.
 * Em caso de sucesso, devolve `{ queued: false, data }`.
 *
 * Erros HTTP do servidor (4xx/5xx) são propagados como excepção — não fazem queue,
 * pois o servidor recebeu mas rejeitou.
 *
 * A `Idempotency-Key` é gerada uma vez por chamada: se a tentativa directa
 * "falhar" mas a request tiver chegado ao servidor (resposta perdida), o
 * pedido que vai para a outbox reusa a mesma chave e o backend devolve-nos
 * a resposta original em vez de duplicar a operação.
 */
export async function sendOrEnqueue({ method, url, data, meta, label }) {
  const idempotencyKey = genIdempotencyKey();
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (!offline) {
    try {
      const res = await api.request({
        method, url, data,
        headers: { "Idempotency-Key": idempotencyKey },
      });
      return { queued: false, data: res.data };
    } catch (err) {
      const isNetwork = !err.response; // sem resposta = falha de rede / DNS / CORS
      if (!isNetwork) throw err;
      // cai para enqueue (reusando a mesma chave)
    }
  }
  const id = await enqueue({ method, url, data, meta, label, idempotencyKey });
  return { queued: true, id };
}
