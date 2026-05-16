import { getMeta, setMeta } from "./db";
import { enqueue } from "./queue";

/** Gera um identificador local único para uma entidade que ainda não tem ID do servidor. */
export function newLocalId(prefix = "tmp") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Gera o próximo número sequencial para um recibo provisório (offline).
 * Persistido em IndexedDB → continua incremental mesmo após refresh / fecho.
 * Formato: `OFF-YYYY-NNNN` (NNNN resetado a 1 quando muda o ano).
 */
export async function nextOfflineSeq() {
  const ano = new Date().getFullYear();
  const meta = (await getMeta("pos_offline_seq")) || { ano: 0, seq: 0 };
  const proximoSeq = meta.ano === ano ? meta.seq + 1 : 1;
  await setMeta("pos_offline_seq", { ano, seq: proximoSeq });
  const padded = String(proximoSeq).padStart(4, "0");
  return { seq: proximoSeq, ano, referencia: `OFF-${ano}-${padded}` };
}

/**
 * Constrói um array de `pagamento` no formato esperado pelo componente <Recibo>
 * a partir das dívidas seleccionadas pelo utilizador. Marca cada entrada com
 * `_offline: true` para o Recibo renderizar o estado provisório.
 */
export function buildOfflinePagamentos({
  aluno,
  dividas,
  selected,
  metodo,
  numRef,
  valorEntregue,
  valorCarteira,
  loteRef,
}) {
  const agora = new Date().toISOString();
  const total = dividas
    .filter(d => selected.includes(d.id))
    .reduce((s, d) => s + Number(d.valor || 0) + Number(d.multa_valor || 0) - Number(d.bolsa_valor || 0), 0);
  // Distribuir valor_carteira proporcionalmente entre as linhas
  const carteiraTotal = Number(valorCarteira || 0);
  const distribuirCarteira = carteiraTotal > 0 && total > 0;

  return dividas
    .filter(d => selected.includes(d.id))
    .map((d, idx, arr) => {
      const valor = Number(d.valor || 0);
      const peso  = total > 0 ? (valor + Number(d.multa_valor||0) - Number(d.bolsa_valor||0)) / total : 0;
      // Garantir que o último arredonda para fechar o total exacto
      const carteiraLinha = distribuirCarteira
        ? (idx === arr.length - 1
            ? carteiraTotal - arr.slice(0, idx).reduce((s, p) => s + (p.valor_carteira || 0), 0)
            : Math.round(carteiraTotal * peso))
        : 0;
      return {
        ...d,
        id: d.id,
        referencia: `${loteRef}-${String(idx + 1).padStart(2, "0")}`,
        lote_id: loteRef,
        aluno,
        metodo,
        data_pagamento: agora,
        num_referencia_externa: numRef || null,
        valor_entregue: valorEntregue ? Number(valorEntregue) : null,
        valor_carteira: carteiraLinha,
        _offline: true,
      };
    });
}

/**
 * Empacota uma cobrança POS para envio diferido.
 *  - Gera nº de recibo local (`OFF-...`).
 *  - Faz enqueue do POST original em `outbox`.
 *  - Devolve `{ lote, ref }` para a UI imprimir imediatamente um recibo provisório.
 */
export async function enqueuePosCobranca({ aluno, dividas, selected, payload }) {
  const { referencia, seq, ano } = await nextOfflineSeq();
  const lote = buildOfflinePagamentos({
    aluno,
    dividas,
    selected,
    metodo: payload.metodo,
    numRef: payload.num_referencia_externa,
    valorEntregue: payload.valor_entregue,
    valorCarteira: payload.valor_carteira,
    loteRef: referencia,
  });

  const id = await enqueue({
    method: "POST",
    url: "/pos/cobrar",
    data: {
      ...payload,
      // Informa o backend de que esta operação foi gerada offline (informativo).
      offline_lote_ref: referencia,
      offline_data_pagamento: new Date().toISOString(),
    },
    meta: {
      kind: "pos.cobrar",
      offline_lote_ref: referencia,
      aluno_id: aluno?.id ?? null,
      aluno_nome: aluno?.user?.nome ?? null,
      total: lote.reduce((s, p) => s + Number(p.valor || 0) + Number(p.multa_valor || 0) - Number(p.bolsa_valor || 0), 0),
      itens: lote.length,
    },
    label: `Cobrança POS · ${aluno?.user?.nome ?? "—"} · ${referencia}`,
  });

  return { lote, referencia, seq, ano, outboxId: id };
}

/**
 * Sintetiza uma nova cobrança (ainda por enviar ao servidor) e empacota o
 * `POST /pagamentos` na outbox. Devolve a entidade local para a UI mostrar
 * imediatamente como dívida pendente.
 *
 * O ID atribuído é uma string `tmp-...` — o flush de fila, depois de sincronizar,
 * faz mapping para o ID real do servidor em qualquer entrada subsequente que
 * referencie este ID (ex.: um `pos.cobrar` na mesma sessão offline).
 */
export async function enqueueCriarPagamento({ aluno, payload }) {
  const localId = newLocalId();
  const hoje = new Date().toISOString().slice(0, 10);
  const novo = {
    id: localId,
    aluno_id: aluno?.id ?? payload.aluno_id,
    tipo: payload.tipo,
    valor: Number(payload.valor || 0),
    propina_id: payload.propina_id ?? null,
    emolumento_id: payload.emolumento_id ?? null,
    mes_referencia: payload.mes_referencia ?? null,
    observacao: payload.observacao ?? null,
    data_vencimento: payload.data_vencimento ?? null,
    data_emissao: hoje,
    status: "pendente",
    multa_valor: 0,
    bolsa_valor: 0,
    _offline: true,
  };
  const outboxId = await enqueue({
    method: "POST",
    url: "/pagamentos",
    data: { ...payload, offline_local_id: localId },
    meta: {
      kind: "pagamentos.criar",
      local_id: localId,
      aluno_id: aluno?.id ?? null,
      aluno_nome: aluno?.user?.nome ?? null,
      tipo: payload.tipo,
      valor: Number(payload.valor || 0),
    },
    label: `Nova cobrança · ${aluno?.user?.nome ?? "—"} · ${payload.tipo}`,
  });
  return { pagamento: novo, outboxId, localId };
}

