import { useEffect, useState } from "react";
import { WifiOff, CloudUpload, AlertTriangle, X, Printer, Clock, ChevronDown, ChevronRight } from "lucide-react";
import { useNetworkStatus, useOutboxCount } from "../offline/network";
import { flush, listOutbox, removeEntry, removeEntryWithCascade, findDependents, retry } from "../offline/queue";
import { imprimirRecibo } from "./Recibo";
import { useAuthStore } from "../store/auth";

/**
 * Banner persistente no topo da app:
 *   - vermelho/laranja quando offline
 *   - azul a indicar sincronização pendente (mesmo online)
 *   - âmbar quando há entradas falhadas que precisam atenção do utilizador
 *
 * Clique no banner abre o painel da outbox.
 */
export default function OfflineBanner() {
  const online = useNetworkStatus();
  const { pending, failed, blocked } = useOutboxCount();
  const [open, setOpen] = useState(false);

  // Quando voltar a online com pendentes, dispara um flush automaticamente.
  useEffect(() => {
    if (online && (pending + blocked) > 0) flush();
  }, [online, pending, blocked]);

  const showOffline = !online;
  const showPending = online && pending > 0;
  const showFailed  = failed > 0;
  const showBlocked = blocked > 0 && !showOffline;

  if (!showOffline && !showPending && !showFailed && !showBlocked) return null;

  let bg = "bg-blue-600";
  let Icon = CloudUpload;
  let texto = `A sincronizar ${pending} ${pending === 1 ? "operação" : "operações"} pendente${pending === 1 ? "" : "s"}…`;
  if (showOffline) {
    bg = "bg-rose-600";
    Icon = WifiOff;
    const totalGuardadas = pending + blocked;
    texto = totalGuardadas > 0
      ? `Sem ligação — ${totalGuardadas} ${totalGuardadas === 1 ? "operação guardada" : "operações guardadas"} para enviar quando voltar a internet.`
      : "Sem ligação — a trabalhar offline. As alterações serão sincronizadas quando voltar.";
  } else if (showFailed && !showPending) {
    bg = "bg-amber-500";
    Icon = AlertTriangle;
    texto = `${failed} ${failed === 1 ? "operação requer" : "operações requerem"} atenção. Clique para rever.`;
  } else if (showBlocked && !showPending && !showFailed) {
    bg = "bg-slate-500";
    Icon = Clock;
    texto = `${blocked} ${blocked === 1 ? "operação à espera" : "operações à espera"} de sincronizar dependências.`;
  }

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`${bg} text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none`}
      >
        <Icon size={16} />
        <span>{texto}</span>
        {(pending + failed + blocked) > 0 && (
          <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold">
            ver detalhes
          </span>
        )}
      </div>
      {open && <OutboxModal onClose={() => setOpen(false)} />}
    </>
  );
}

function OutboxModal({ onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const rows = await listOutbox();
    setEntries(rows.sort((a, b) => b.createdAt - a.createdAt));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const totais = entries.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Operações offline</h2>
            <p className="text-xs text-slate-500">Alterações guardadas localmente à espera de sincronizar.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X size={16} /></button>
        </div>

        {/* Sumário */}
        <div className="flex gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs">
          <Resumo label="Pendentes" value={totais.pending || 0} cor="text-amber-700" />
          <Resumo label="A sincronizar" value={totais.syncing || 0} cor="text-blue-700" />
          <Resumo label="Bloqueadas" value={totais.blocked || 0} cor="text-slate-500" />
          <Resumo label="Falhadas" value={totais.failed || 0} cor="text-rose-600" />
          <Resumo label="Sincronizadas" value={totais.synced || 0} cor="text-emerald-600" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-6 text-sm text-slate-500">A carregar…</div>}
          {!loading && entries.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">Nenhuma operação na fila.</div>
          )}
          {!loading && entries.map(e => (
            <OutboxRow key={e.id} entry={e} onChange={refresh} />
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => { flush().then(refresh); }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >Tentar sincronizar agora</button>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">Fechar</button>
        </div>
      </div>
    </div>
  );
}

function Resumo({ label, value, cor }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1">
      <span className={`font-bold ${cor}`}>{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

const STATUS_LABEL = {
  pending:  "Pendente",
  syncing:  "A enviar",
  blocked:  "Bloqueada",
  failed:   "Falhada",
  synced:   "Sincronizada",
};
const STATUS_COR = {
  pending:  "text-amber-600",
  syncing:  "text-blue-600",
  blocked:  "text-slate-500",
  failed:   "text-rose-600",
  synced:   "text-emerald-600",
};

function OutboxRow({ entry, onChange }) {
  const { escola } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const cor = STATUS_COR[entry.status] || "text-slate-600";
  const data = new Date(entry.createdAt).toLocaleString("pt-PT");

  const podeReimprimir = entry.status === "synced"
    && entry.meta?.kind === "pos.cobrar"
    && entry.response?.pagamentos?.length > 0;

  const reimprimirOficial = () => {
    try {
      imprimirRecibo(
        entry.response.pagamentos,
        escola,
        entry.response.carteira || null,
        entry.response.via_number || 2,
      );
    } catch (e) {
      console.error("Falha ao reimprimir recibo oficial:", e);
    }
  };

  const removerComConfirma = async () => {
    const dependents = entry.meta?.local_id ? await findDependents(entry.meta.local_id) : [];
    const msg = dependents.length > 0
      ? `Esta operação tem ${dependents.length} ${dependents.length === 1 ? "operação dependente" : "operações dependentes"} (cobranças baseadas neste registo). Remover esta também cancela ${dependents.length === 1 ? "essa" : "essas"}. Continuar?`
      : `Remover esta operação da fila? Isto não pode ser desfeito.`;
    if (!confirm(msg)) return;
    if (dependents.length > 0) {
      await removeEntryWithCascade(entry.id);
    } else {
      await removeEntry(entry.id);
    }
    onChange();
  };

  // Para falhas, parse de erros de validação (Laravel ⇒ data.errors = { campo: [...mensagens] }).
  const validationErrors = entry.lastError?.data?.errors;
  const erroMsg = entry.lastError?.message;
  const isBlocked = entry.status === "blocked";

  return (
    <div className={`px-5 py-3 border-b border-slate-100 ${entry.status === "failed" ? "bg-rose-50/30" : entry.status === "blocked" ? "bg-slate-50/40" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-0.5 text-slate-400 hover:text-slate-700"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{entry.label || `${entry.method} ${entry.url}`}</p>
          <p className="text-[11px] text-slate-500">{data} · {entry.attempts} tentativa{entry.attempts === 1 ? "" : "s"}</p>
          {erroMsg && !isBlocked && (
            <p className="text-[11px] text-rose-600 mt-0.5">
              {entry.lastError?.status ? `HTTP ${entry.lastError.status} · ` : ""}{erroMsg}
            </p>
          )}
          {isBlocked && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              A aguardar que as dependências sincronizem primeiro.
            </p>
          )}
          {podeReimprimir && (
            <button onClick={reimprimirOficial}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold">
              <Printer size={11} /> Reimprimir recibo oficial
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wide ${cor}`}>{STATUS_LABEL[entry.status] || entry.status}</span>
          {entry.status === "failed" && (
            <button onClick={async () => { await retry(entry.id); onChange(); }}
              className="text-[11px] text-blue-600 hover:underline font-semibold">Tentar de novo</button>
          )}
          {(entry.status === "failed" || entry.status === "synced" || entry.status === "blocked") && (
            <button onClick={removerComConfirma}
              className="text-[11px] text-slate-400 hover:text-rose-500 hover:underline">Remover</button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-2 ml-6 space-y-2 text-[11px]">
          {/* Erros de validação Laravel detalhados */}
          {validationErrors && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2">
              <p className="font-semibold text-rose-700 mb-1">Erros de validação:</p>
              <ul className="space-y-0.5 list-disc list-inside text-rose-700">
                {Object.entries(validationErrors).flatMap(([campo, msgs]) =>
                  (Array.isArray(msgs) ? msgs : [msgs]).map((m, i) => (
                    <li key={`${campo}-${i}`}><strong>{campo}:</strong> {m}</li>
                  ))
                )}
              </ul>
            </div>
          )}
          {/* Operação técnica */}
          <details className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-600">
            <summary className="cursor-pointer font-semibold">Detalhes técnicos</summary>
            <div className="mt-2 space-y-1 font-mono text-[10px]">
              <div><span className="text-slate-400">URL:</span> {entry.method} {entry.url}</div>
              {entry.meta?.kind && <div><span className="text-slate-400">Tipo:</span> {entry.meta.kind}</div>}
              {entry.meta?.local_id && <div><span className="text-slate-400">ID local:</span> {entry.meta.local_id}</div>}
              {entry.lastError?.data?.blockedBy && (
                <div><span className="text-slate-400">À espera de:</span> {entry.lastError.data.blockedBy.join(", ")}</div>
              )}
              <div><span className="text-slate-400">Payload:</span>
                <pre className="bg-white border border-slate-200 rounded p-1.5 mt-0.5 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(entry.data, null, 2)}</pre>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
