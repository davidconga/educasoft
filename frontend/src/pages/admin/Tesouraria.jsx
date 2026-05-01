import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { imprimirRecibo, buildReciboHtml } from "../../components/Recibo";
import { useMeses } from "../../hooks/useMeses";
import SaftButton from "../../components/SaftButton";

const fmt = (v) => Number(v || 0).toLocaleString("pt-AO");
const ANO_ATUAL = String(new Date().getFullYear());
const ANOS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i));
const getAnoFromMesRef = (mr) => { if (!mr) return null; const m = mr.match(/\b(\d{4})\b/); return m ? m[1] : null; };

const statusCfg = {
  pago:      { label: "Pago",      cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  pendente:  { label: "Pendente",  cls: "bg-amber-50  text-amber-700  ring-1 ring-amber-200"  },
  vencido:   { label: "Vencido",   cls: "bg-red-50    text-red-700    ring-1 ring-red-200"    },
  cancelado: { label: "Cancelado", cls: "bg-slate-100 text-slate-500  ring-1 ring-slate-200"  },
};

const tipoCfg = {
  mensalidade: { label: "Mensalidade", icon: "📅" },
  matricula:   { label: "Matrícula",   icon: "📋" },
  emolumento:  { label: "Emolumento",  icon: "🏷️" },
  outro:       { label: "Outro",       icon: "📌" },
};

function StatCard({ label, value, sub, color }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value} Kz</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-12 h-12 mb-3 opacity-30">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
      <p className="text-sm">{msg}</p>
    </div>
  );
}

function MetodoSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {["dinheiro","transferencia","multicaixa"].map(m => (
        <button key={m} type="button" onClick={() => onChange(m)}
          className={`py-2 rounded-xl text-xs font-medium capitalize border transition-colors ${value === m ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
          {m}
        </button>
      ))}
    </div>
  );
}

/* ── Calendário de Propinas ─────────────────────────────────── */
function CalendarioPropinas({ alunoSel, onConfirmar }) {
  const [anoLetivo, setAnoLetivo]       = useState(ANO_ATUAL);
  const [calendario, setCalendario]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [selCal, setSelCal]             = useState(new Set());
  const [bulkMetodo, setBulkMetodo]     = useState("dinheiro");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [pagandoBulk, setPagandoBulk]   = useState(false);
  const [warnMes, setWarnMes]           = useState(null);

  const load = async () => {
    setLoading(true); setSelCal(new Set());
    try {
      const r = await api.get(`/pagamentos/calendario?aluno_id=${alunoSel.id}&ano_letivo=${anoLetivo}`);
      setCalendario(r.data);
    } catch { setCalendario([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [alunoSel.id, anoLetivo]);

  // Can month at index idx be selected? Previous month must be paid or already selected.
  const podeSelecionar = (idx) => {
    if (idx <= 0) return true;
    const ant = calendario[idx - 1];
    return ant.pagamento?.status === "pago" || selCal.has(ant.pagamento?.id);
  };

  const toggleSelCal = (idx, calEntry) => {
    const pag = calEntry.pagamento;
    if (!pag) return;
    if (!selCal.has(pag.id) && !podeSelecionar(idx)) {
      setWarnMes(calEntry.mes);
      setTimeout(() => setWarnMes(null), 2500);
      return;
    }
    setSelCal(prev => {
      const next = new Set(prev);
      if (next.has(pag.id)) {
        // unselect this and all subsequent to maintain consecutive order
        for (let i = idx; i < calendario.length; i++) {
          const pid = calendario[i].pagamento?.id;
          if (pid) next.delete(pid);
        }
      } else {
        next.add(pag.id);
      }
      return next;
    });
  };

  const pagarSelecionados = async () => {
    const ordenados = calendario.filter(c => c.pagamento && selCal.has(c.pagamento.id));
    setPagandoBulk(true);
    try {
      for (const c of ordenados) {
        await api.patch(`/pagamentos/${c.pagamento.id}/pagar`, {
          metodo: bulkMetodo,
          data_pagamento: new Date().toISOString().split("T")[0],
        });
      }
    } finally {
      setPagandoBulk(false);
      setShowBulkConfirm(false);
      load();
    }
  };

  const totalPago     = calendario.reduce((s, m) => m.pagamento?.status === "pago"     ? s + Number(m.pagamento.valor) : s, 0);
  const totalPendente = calendario.reduce((s, m) => m.pagamento?.status === "pendente" ? s + Number(m.pagamento.valor) : s, 0);
  const semPagamento  = calendario.filter(m => !m.pagamento).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controles */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Ano Lectivo:</span>
          <select value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"/> Pago: <strong className="text-slate-700">{fmt(totalPago)} Kz</strong></span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/> Pendente: <strong className="text-slate-700">{fmt(totalPendente)} Kz</strong></span>
          {semPagamento > 0 && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block"/> Sem registo: <strong className="text-slate-700">{semPagamento}</strong></span>}
        </div>
      </div>

      {/* Barra de selecção */}
      {selCal.size > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">{selCal.size} mês(es) seleccionado(s)</span>
          <div className="flex gap-2">
            <button onClick={() => setSelCal(new Set())} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
              Limpar
            </button>
            <button onClick={() => setShowBulkConfirm(true)}
              className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg transition-colors">
              Pagar Seleccionados
            </button>
          </div>
        </div>
      )}

      {/* Tabela de meses */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">A carregar...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-3 py-3 w-10" />
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Mês</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Preçário</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Referência</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Vencimento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pago em</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Valor</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {calendario.map(({ mes, mes_nome, referencia, pagamento: p }, idx) => {
                const podeCheck    = p && (p.status === "pendente" || p.status === "vencido");
                const checked      = podeCheck && selCal.has(p.id);
                const bloqueado    = podeCheck && !podeSelecionar(idx);
                const mostrarAviso = warnMes === mes;
                return (
                  <tr key={mes} className={`transition-colors ${checked ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                    <td className="px-3 py-3.5 text-center">
                      {podeCheck && (
                        <div className="relative inline-flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={!!checked}
                            onChange={() => toggleSelCal(idx, { mes, mes_nome, referencia, pagamento: p })}
                            className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${bloqueado ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}
                          />
                          {mostrarAviso && (
                            <span className="absolute left-7 top-1/2 -translate-y-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 shadow-lg">
                              Pague o mês anterior primeiro
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800">{mes_nome}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">
                      {p?.propina?.nome || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{referencia}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {p?.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString("pt-AO") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                      {p?.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-AO") : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                      {p ? `${fmt(p.valor)} Kz` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {p ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg[p.status]?.cls || statusCfg.pendente.cls}`}>
                          {statusCfg[p.status]?.label || p.status}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          Sem registo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p?.status === "pendente" && (
                        <button onClick={() => onConfirmar(p.id)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                          Confirmar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Confirmar pagamento em massa */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">Pagar {selCal.size} mensalidade(s)</h3>
                <p className="text-xs text-slate-400">Seleccione o método de pagamento</p>
              </div>
            </div>
            <MetodoSelector value={bulkMetodo} onChange={setBulkMetodo} />
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBulkConfirm(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={pagarSelecionados} disabled={pagandoBulk}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                {pagandoBulk ? "A pagar..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Modal: Gerar Propinas ──────────────────────────────────── */
function ModalGerarPropinas({ alunoSel, onClose, onSuccess }) {
  const meses = useMeses();
  const [propinas, setPropinas] = useState([]);
  const [form, setForm]         = useState({ propina_id: "", ano_letivo: ANO_ATUAL, meses: Array.from({length:12},(_,i)=>i+1), para_todos: false });
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState("");

  // Identificar classe + curso do aluno seleccionado (a partir da matrícula activa)
  const matAtiva   = alunoSel.matriculas?.find(m => m.status === "activa") ?? alunoSel.matriculas?.[0];
  const alunoClasse = matAtiva?.turma?.classe?.nome ?? null;
  const alunoCursoId = matAtiva?.turma?.classe?.curso_id ?? null;

  useEffect(() => {
    api.get("/precario/propinas").then(r => setPropinas(r.data)).catch(() => {});
  }, []);

  // Filtra propinas pela classe/curso do aluno (excepto se gerar para todos)
  const propinasVisiveis = (form.para_todos || !alunoClasse)
    ? propinas
    : propinas.filter(p => {
        const matchClasse = !p.nivel || p.nivel === alunoClasse;
        const matchCurso  = !p.curso_id || String(p.curso_id) === String(alunoCursoId);
        return matchClasse && matchCurso;
      });

  // Reset propina_id se a actual deixar de estar visível
  useEffect(() => {
    if (form.propina_id && !propinasVisiveis.some(p => String(p.id) === String(form.propina_id))) {
      setForm(f => ({ ...f, propina_id: "" }));
    }
  }, [propinasVisiveis.length, form.para_todos]);

  const toggleMes = (m) => setForm(f => ({
    ...f,
    meses: f.meses.includes(m) ? f.meses.filter(x => x !== m) : [...f.meses, m].sort((a,b)=>a-b)
  }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.propina_id) { setMsg("Seleccione uma propina."); return; }
    setSaving(true); setMsg("");
    try {
      const payload = { propina_id: form.propina_id, ano_letivo: form.ano_letivo, meses: form.meses };
      if (!form.para_todos) payload.aluno_id = alunoSel.id;
      const r = await api.post("/pagamentos/gerar-propinas", payload);
      setMsg(r.data.message);
      onSuccess();
    } catch (err) { setMsg(err.response?.data?.message || "Erro ao gerar."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Gerar Propinas Anuais</h3>
            <p className="text-xs text-slate-400 mt-0.5">{alunoSel.user?.nome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {msg && <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-4 py-2 text-sm">{msg}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Propina (Precário) *
                {alunoClasse && !form.para_todos && (
                  <span className="ml-2 font-normal text-slate-400">— filtradas para {alunoClasse}</span>
                )}
              </label>
              <select required value={form.propina_id} onChange={e => setForm({...form, propina_id: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                <option value="">{propinasVisiveis.length ? "Seleccionar..." : "Sem propinas associadas a esta classe"}</option>
                {propinasVisiveis.map(p => <option key={p.id} value={p.id}>{p.nome || p.nivel || "Propina"} — {fmt(p.valor_mensal)} Kz/mês</option>)}
              </select>
              {alunoClasse && !form.para_todos && propinasVisiveis.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠ Nenhuma propina associada a {alunoClasse}. Configure em Precário → Propinas.</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Ano Lectivo *</label>
              <select value={form.ano_letivo} onChange={e => setForm({...form, ano_letivo: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Meses a gerar</label>
            <div className="grid grid-cols-4 gap-1.5">
              {meses.map(({ id, nome, abreviatura }) => {
                const sel = form.meses.includes(id);
                return (
                  <button key={id} type="button" onClick={() => toggleMes(id)}
                    title={nome}
                    className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${sel ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {abreviatura}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setForm(f => ({...f, meses: f.meses.length === 12 ? [] : Array.from({length:12},(_,i)=>i+1)}))}
              className="mt-1.5 text-xs text-blue-600 hover:underline">
              {form.meses.length === 12 ? "Desmarcar todos" : "Seleccionar todos"}
            </button>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none pt-1">
            <div className="relative" onClick={() => setForm(f => ({...f, para_todos: !f.para_todos}))}>
              <input type="checkbox" className="sr-only" checked={form.para_todos} readOnly />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.para_todos ? "bg-blue-600" : "bg-slate-200"}`} />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.para_todos ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-slate-600">Gerar para <strong>todos os alunos</strong></span>
          </label>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving || form.meses.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              {saving ? "A gerar..." : `Gerar ${form.meses.length} mês(es)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal: Gerar Emolumentos ───────────────────────────────── */
function ModalGerarEmolumentos({ alunoSel, onClose, onSuccess }) {
  const [form, setForm]     = useState({ ano_letivo: ANO_ATUAL, para_todos: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg("");
    try {
      const payload = { ano_letivo: form.ano_letivo };
      if (!form.para_todos) payload.aluno_id = alunoSel.id;
      const r = await api.post("/pagamentos/gerar-emolumentos", payload);
      setMsg(r.data.message);
      onSuccess();
    } catch (err) { setMsg(err.response?.data?.message || "Erro ao gerar."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Gerar Emolumentos</h3>
            <p className="text-xs text-slate-400 mt-0.5">{alunoSel.user?.nome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {msg && <div className="bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-4 py-2 text-sm">{msg}</div>}
          <p className="text-sm text-slate-500">Serão gerados pagamentos para todos os emolumentos <strong>obrigatórios</strong> do ano lectivo seleccionado.</p>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Ano Lectivo *</label>
            <select value={form.ano_letivo} onChange={e => setForm({...form, ano_letivo: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative" onClick={() => setForm(f => ({...f, para_todos: !f.para_todos}))}>
              <input type="checkbox" className="sr-only" checked={form.para_todos} readOnly />
              <div className={`w-10 h-5 rounded-full transition-colors ${form.para_todos ? "bg-blue-600" : "bg-slate-200"}`} />
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.para_todos ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-slate-600">Gerar para <strong>todos os alunos</strong></span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              {saving ? "A gerar..." : "Gerar Emolumentos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────── */
/**
 * Constrói um label descritivo do "serviço" de um pagamento.
 * Combina nome + escopo (nivel/turno) da propina/emolumento para diferenciar
 * mesmo quando o nome é genérico (ex: várias propinas chamadas "Propina").
 */
function descServico(p, tipoCfg) {
  if (p?.propina) {
    const parts = [p.propina.nome || "Propina"];
    const escopo = [p.propina.nivel, p.propina.turno].filter(Boolean).join(" · ");
    if (escopo) parts.push(escopo);
    return parts.join(" — ");
  }
  if (p?.emolumento) {
    return p.emolumento.nome || "Emolumento";
  }
  if (p?.plano) {
    return p.plano.nome || "Plano";
  }
  return tipoCfg?.[p?.tipo]?.label || p?.tipo || p?.referencia || "—";
}

/**
 * Converte mes_referencia para label legível.
 * Aceita formatos: "YYYY-MM" (→ "Janeiro 2026"), "YYYY-YYYY-MM" (→ "Janeiro 2025-2026"),
 * e devolve a string original se já tiver nome de mês ou for desconhecida.
 */
function formatMesRef(mr, meses) {
  if (!mr || !meses?.length) return mr || "";
  // YYYY-YYYY-MM
  let m = mr.match(/^(\d{4})-(\d{4})-(\d{1,2})$/);
  if (m) {
    const nome = meses.find(x => x.id === Number(m[3]))?.nome;
    return nome ? `${nome} ${m[1]}-${m[2]}` : mr;
  }
  // YYYY-MM
  m = mr.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const nome = meses.find(x => x.id === Number(m[2]))?.nome;
    return nome ? `${nome} ${m[1]}` : mr;
  }
  return mr; // já tem nome de mês ou formato desconhecido
}

export default function Tesouraria() {
  const { escola } = useAuthStore();
  const meses = useMeses();
  const [alunos, setAlunos]             = useState([]);
  const [search, setSearch]             = useState("");
  const [loadingAlunos, setLoadingAlunos] = useState(true);
  const [alunoSel, setAlunoSel]         = useState(null);
  const [pagamentos, setPagamentos]     = useState([]);
  const [resumo, setResumo]             = useState(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [filtroStatus, setFiltroStatus]       = useState("todos");
  const [filtroTipo, setFiltroTipo]           = useState("todos");
  const [filtroAnoLetivo, setFiltroAnoLetivo] = useState("");
  const [view, setView]                 = useState("lista");
  const [showForm, setShowForm]         = useState(false);
  const [showGerarPropinas, setShowGerarPropinas]     = useState(false);
  const [showGerarEmolumentos, setShowGerarEmolumentos] = useState(false);
  const [planos, setPlanos]             = useState([]);
  const [propinasList, setPropinasList] = useState([]);
  const [emolumentosList, setEmolumentosList] = useState([]);
  const [form, setForm]                 = useState({ plano_id: "", propina_id: "", emolumento_id: "", valor: "", tipo: "mensalidade", mes_referencia: "", metodo: "dinheiro", data_vencimento: "" });
  const [saving, setSaving]             = useState(false);
  const [confirmId, setConfirmId]           = useState(null);
  const [confirmPag, setConfirmPag]         = useState(null);
  const [confirmMetodo, setConfirmMetodo]   = useState("dinheiro");
  const [confirmData, setConfirmData]       = useState("");
  const [confirmEntregue, setConfirmEntregue] = useState("");
  const [confirmNumRef, setConfirmNumRef]   = useState("");
  const [confirmError, setConfirmError]     = useState("");

  // Bulk selection state (list view)
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [bulkMetodo, setBulkMetodo]       = useState("dinheiro");
  const [bulkData, setBulkData]           = useState("");
  const [bulkEntregue, setBulkEntregue]   = useState("");
  const [bulkNumRef, setBulkNumRef]       = useState("");
  const [bulkError, setBulkError]         = useState("");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [payingBulk, setPayingBulk]       = useState(false);
  const [warnId, setWarnId]               = useState(null);

  useEffect(() => {
    api.get("/alunos?per_page=5000")
      .then(r => setAlunos(r.data.data || r.data))
      .finally(() => setLoadingAlunos(false));
    api.get("/planos-pagamento").then(r => setPlanos(r.data)).catch(() => {});
    api.get("/precario/propinas").then(r => setPropinasList(r.data || [])).catch(() => {});
    api.get("/precario/emolumentos").then(r => setEmolumentosList(r.data || [])).catch(() => {});
  }, []);

  const selecionarAluno = async (aluno) => {
    setAlunoSel(aluno);
    setFiltroStatus("todos");
    setFiltroTipo("todos");
    setFiltroAnoLetivo("");
    setSelectedIds(new Set());
    setLoadingDetalhe(true);
    try {
      const [pRes, rRes] = await Promise.all([
        api.get(`/pagamentos?aluno_id=${aluno.id}&per_page=200`),
        api.get(`/pagamentos/relatorio?aluno_id=${aluno.id}`).catch(() => ({ data: {} })),
      ]);
      setPagamentos(pRes.data.data || pRes.data);
      setResumo(rRes.data);
    } finally {
      setLoadingDetalhe(false);
    }
  };

  const recarregarAluno = () => alunoSel && selecionarAluno(alunoSel);

  const confirmarPagamento = async () => {
    // Validação client-side: nº referência obrigatório para multicaixa/transferência/referencia
    setConfirmError("");
    const exigeNumRef = ["multicaixa","transferencia","referencia"].includes(confirmMetodo);
    if (exigeNumRef && !confirmNumRef.trim()) {
      setConfirmError(`Para método "${confirmMetodo}", é obrigatório indicar o nº de referência.`);
      return;
    }
    let pagamentoId = null;
    try {
      const res = await api.patch(`/pagamentos/${confirmId}/pagar`, {
        metodo: confirmMetodo,
        data_pagamento: confirmData || new Date().toISOString().split("T")[0],
        num_referencia_externa: confirmNumRef || null,
        ...(Number(confirmEntregue) > 0 ? { valor_entregue: Number(confirmEntregue) } : {}),
      });
      pagamentoId = res.data?.pagamento?.id;
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : null)
        || "Erro ao confirmar pagamento.";
      setConfirmError(msg);
      return;
    }
    // Pagamento gravado com sucesso — fecha modal, refresca lista e abre PDF
    setConfirmId(null);
    setConfirmNumRef("");
    recarregarAluno();
    if (pagamentoId) abrirReciboPdf(pagamentoId);
  };

  const abrirReciboPdf = async (pagamentoId) => {
    try {
      const r = await api.get(`/pagamentos/${pagamentoId}/recibo.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const w = window.open(url, "_blank");
      if (!w) {
        // Popup bloqueado — força download
        const a = document.createElement("a");
        a.href = url; a.download = `recibo-${pagamentoId}.pdf`;
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e) {
      console.error("Erro ao abrir recibo PDF:", e);
    }
  };

  const registarPagamento = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/pagamentos", { ...form, aluno_id: alunoSel.id });
      setShowForm(false);
      setForm({ plano_id: "", propina_id: "", emolumento_id: "", valor: "", tipo: "mensalidade", mes_referencia: "", metodo: "dinheiro", data_vencimento: "" });
      recarregarAluno();
    } finally { setSaving(false); }
  };

  // Mensalidades sorted by mes_referencia for sequential enforcement
  const mensalidadesSorted = [...pagamentos]
    .filter(p => p.tipo === "mensalidade")
    .sort((a, b) => (a.mes_referencia ?? "").localeCompare(b.mes_referencia ?? ""));

  // Can this payment be selected? Previous mensalidade must be pago or already selected.
  const podeSelecionar = (pag) => {
    const idx = mensalidadesSorted.findIndex(m => m.id === pag.id);
    if (idx <= 0) return true;
    const ant = mensalidadesSorted[idx - 1];
    return ant.status === "pago" || selectedIds.has(ant.id);
  };

  const toggleSelect = (pag) => {
    if (!selectedIds.has(pag.id) && !podeSelecionar(pag)) {
      setWarnId(pag.id);
      setTimeout(() => setWarnId(null), 2500);
      return;
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(pag.id)) {
        // deselect this and all subsequent to preserve consecutive order
        const idx = mensalidadesSorted.findIndex(m => m.id === pag.id);
        for (let i = idx; i < mensalidadesSorted.length; i++) next.delete(mensalidadesSorted[i].id);
      } else {
        next.add(pag.id);
      }
      return next;
    });
  };

  const pagarSelecionados = async () => {
    setBulkError("");
    const exigeNumRef = ["multicaixa","transferencia","referencia"].includes(bulkMetodo);
    if (exigeNumRef && !bulkNumRef.trim()) {
      setBulkError(`Para método "${bulkMetodo}", é obrigatório indicar o nº de referência.`);
      return;
    }
    const ids = mensalidadesSorted.filter(m => selectedIds.has(m.id)).map(m => m.id);
    setPayingBulk(true);
    let loteId = null;
    try {
      const res = await api.post("/pagamentos/pagar-multiplos", {
        ids,
        metodo: bulkMetodo,
        data_pagamento: bulkData || new Date().toISOString().split("T")[0],
        num_referencia_externa: bulkNumRef || null,
        ...(Number(bulkEntregue) > 0 ? { valor_entregue: Number(bulkEntregue) } : {}),
      });
      // Pega o lote_id do primeiro pagamento devolvido (todos compartilham o mesmo)
      loteId = res.data?.pagamentos?.[0]?.lote_id ?? null;
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setPayingBulk(false);
      setShowBulkConfirm(false);
      setSelectedIds(new Set());
      recarregarAluno();
    }
    // Após o flow finalizar, abre o PDF do lote (consolidado)
    if (loteId) {
      try {
        const r = await api.get(`/pagamentos/lote/${loteId}/recibo.pdf`, { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
        const w = window.open(url, "_blank");
        if (!w) {
          const a = document.createElement("a");
          a.href = url; a.download = `recibo-lote.pdf`;
          document.body.appendChild(a); a.click(); a.remove();
        }
      } catch (err) { console.error("Erro ao abrir PDF do lote:", err); }
    }
  };

  const alunosFiltrados = alunos.filter(a =>
    a.user?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    a.numero_aluno?.toLowerCase().includes(search.toLowerCase())
  );

  const anosDisponiveis = [...new Set(pagamentos.map(p => getAnoFromMesRef(p.mes_referencia)).filter(Boolean))].sort();

  const pagamentosFiltrados = pagamentos.filter(p => {
    const okStatus = filtroStatus === "todos" || p.status === filtroStatus;
    const okTipo   = filtroTipo === "todos"   || p.tipo   === filtroTipo;
    const okAno    = !filtroAnoLetivo          || getAnoFromMesRef(p.mes_referencia) === filtroAnoLetivo;
    return okStatus && okTipo && okAno;
  });

  // Identifica o "lider" de cada lote (1ª linha de cada lote_id encontrada na lista filtrada).
  // Linhas de um lote que não são líder ficam sem botões — o lote inteiro é representado pelo líder.
  const loteLeaders = (() => {
    const seen = new Set();
    const leaders = new Set();
    for (const p of pagamentosFiltrados) {
      if (!p.lote_id) { leaders.add(p.id); continue; }
      if (!seen.has(p.lote_id)) { seen.add(p.lote_id); leaders.add(p.id); }
    }
    return leaders;
  })();

  const totalPago     = pagamentos.filter(p => p.status === "pago").reduce((s, p) => s + Number(p.valor), 0);
  const totalPendente = pagamentos.filter(p => p.status === "pendente").reduce((s, p) => s + Number(p.valor), 0);
  const totalVencido  = pagamentos.filter(p => p.status === "vencido").reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="flex gap-6 h-full -m-6 overflow-hidden">

      {/* ─── Painel esquerdo: lista de alunos ─── */}
      <div className="w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Alunos</h2>
            <SaftButton variant="icon"/>
          </div>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingAlunos ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">A carregar...</div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">Nenhum aluno encontrado.</div>
          ) : (
            alunosFiltrados.map(a => {
              const ativo = alunoSel?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => selecionarAluno(a)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-center gap-3 hover:bg-slate-50 transition-colors ${ativo ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ativo ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                    {a.user?.nome?.[0]?.toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className={`text-sm font-medium truncate ${ativo ? "text-blue-700" : "text-slate-700"}`}>{a.user?.nome}</p>
                    <p className="text-xs text-slate-400 truncate">{a.numero_aluno} · {a.matriculas?.[0]?.turma?.nome || "Sem turma"}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Painel direito: detalhe do aluno ─── */}
      <div className="flex-1 flex flex-col overflow-hidden py-6 pr-6">
        {!alunoSel ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-16 h-16 mb-4 opacity-20">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <p className="text-sm font-medium">Selecione um aluno para ver os detalhes financeiros</p>
          </div>
        ) : (
          <>
            {/* Cabeçalho do aluno */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                  {alunoSel.user?.nome?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{alunoSel.user?.nome}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-slate-500">{alunoSel.numero_aluno}</span>
                    {alunoSel.matriculas?.[0]?.turma && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{alunoSel.matriculas[0].turma.nome}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* Botões de acção */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowGerarEmolumentos(true)}
                  className="flex items-center gap-1.5 border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  Emolumentos
                </button>
                <button onClick={() => setShowGerarPropinas(true)}
                  className="flex items-center gap-1.5 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-medium px-3 py-2 rounded-xl transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Gerar Propinas
                </button>
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Registar Cobrança
                </button>
              </div>
            </div>

            {loadingDetalhe ? (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">A carregar...</div>
            ) : (
              <>
                {/* Cards de resumo */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <StatCard label="Total Pago"     value={fmt(totalPago)}     sub={`${pagamentos.filter(p=>p.status==="pago").length} pagamentos`}     color="bg-emerald-50 text-emerald-800" />
                  <StatCard label="Total Pendente" value={fmt(totalPendente)} sub={`${pagamentos.filter(p=>p.status==="pendente").length} em aberto`}    color="bg-amber-50  text-amber-800"   />
                  <StatCard label="Total Vencido"  value={fmt(totalVencido)}  sub={`${pagamentos.filter(p=>p.status==="vencido").length} vencidos`}      color="bg-red-50    text-red-800"     />
                </div>

                {/* Tabs: Lista | Calendário */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-3 self-start">
                  <button onClick={() => setView("lista")}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${view==="lista" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    Lista de Cobranças
                  </button>
                  <button onClick={() => setView("calendario")}
                    className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${view==="calendario" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    📅 Calendário de Propinas
                  </button>
                </div>

                {view === "calendario" ? (
                  <CalendarioPropinas
                    alunoSel={alunoSel}
                    onConfirmar={(id) => { setConfirmId(id); setConfirmMetodo("dinheiro"); }}
                  />
                ) : (
                  <>
                    {/* Filtros */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {["todos","pago","pendente","vencido"].map(s => (
                          <button key={s} onClick={() => setFiltroStatus(s)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${filtroStatus===s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            {s === "todos" ? "Todos" : statusCfg[s]?.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {["todos","mensalidade","matricula","emolumento","outro"].map(t => (
                          <button key={t} onClick={() => setFiltroTipo(t)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${filtroTipo===t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            {t === "todos" ? "Todos" : tipoCfg[t]?.label}
                          </button>
                        ))}
                      </div>
                      {anosDisponiveis.length > 0 && (
                        <select
                          value={filtroAnoLetivo}
                          onChange={e => setFiltroAnoLetivo(e.target.value)}
                          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos os anos</option>
                          {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Barra de selecção em massa */}
                    {selectedIds.size > 0 && (
                      <div className="mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                        <span className="text-sm text-blue-700 font-medium">{selectedIds.size} mensalidade(s) seleccionada(s)</span>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                            Limpar
                          </button>
                          <button onClick={() => setShowBulkConfirm(true)}
                            className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg transition-colors">
                            Pagar Seleccionadas
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tabela de pagamentos */}
                    <div className="flex-1 bg-white rounded-2xl border border-slate-100 overflow-hidden flex flex-col">
                      {pagamentosFiltrados.length === 0 ? (
                        <EmptyState msg="Nenhuma cobrança encontrada para este filtro." />
                      ) : (
                        <div className="overflow-auto flex-1">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100">
                                <th className="px-3 py-3 w-10" />
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Vencimento</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Pago em</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Valor</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Multa</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Total</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                                <th className="px-5 py-3" />
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {pagamentosFiltrados.map(p => {
                                const isMens    = p.tipo === "mensalidade";
                                const podeCheck = isMens && (p.status === "pendente" || p.status === "vencido");
                                const checked   = podeCheck && selectedIds.has(p.id);
                                const bloqueado = podeCheck && !podeSelecionar(p);
                                const mostrarAviso = warnId === p.id;
                                return (
                                  <tr key={p.id} className={`transition-colors ${checked ? "bg-blue-50/50" : "hover:bg-slate-50"}`}>
                                    <td className="px-3 py-3.5 text-center">
                                      {podeCheck && (
                                        <div className="relative inline-flex items-center justify-center">
                                          <input
                                            type="checkbox"
                                            checked={!!checked}
                                            onChange={() => toggleSelect(p)}
                                            className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${bloqueado ? "cursor-not-allowed opacity-35" : "cursor-pointer"}`}
                                          />
                                          {mostrarAviso && (
                                            <span className="absolute left-7 top-1/2 -translate-y-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 shadow-lg">
                                              Pague o mês anterior primeiro
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <span className="flex items-center gap-1.5 text-slate-600">
                                        <span>{tipoCfg[p.tipo]?.icon || "📌"}</span>
                                        <span className="text-xs font-medium">{tipoCfg[p.tipo]?.label || p.tipo}</span>
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                      <p className="text-slate-700 font-medium">
                                        {p.propina?.nome || p.emolumento?.nome || p.plano?.nome || tipoCfg[p.tipo]?.label || p.tipo || p.referencia}
                                      </p>
                                      {(p.propina?.nivel || p.propina?.turno) && (
                                        <p className="text-xs text-slate-500">
                                          {[p.propina.nivel, p.propina.turno].filter(Boolean).join(" · ")}
                                        </p>
                                      )}
                                      {p.mes_referencia && (
                                        <p className="text-xs text-slate-400">{formatMesRef(p.mes_referencia, meses)}</p>
                                      )}
                                      {p.metodo && p.status === "pago" && (
                                        <p className="text-xs text-slate-400 capitalize">{p.metodo}</p>
                                      )}
                                      {p.observacao && (
                                        <p className="text-xs text-slate-400 italic mt-0.5">{p.observacao}</p>
                                      )}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                                      {p.data_vencimento ? new Date(p.data_vencimento).toLocaleDateString("pt-AO") : "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-slate-500 text-xs">
                                      {p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString("pt-AO") : "—"}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                                      {fmt(p.valor)} Kz
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      {Number(p.multa_valor) > 0 ? (() => {
                                        const dias = p.data_vencimento ? Math.max(0, Math.floor((Date.now() - new Date(p.data_vencimento).getTime()) / 86400000)) : 0;
                                        return (
                                          <div title={`${p.multa?.nome ?? "Multa"} · ${dias} dias de atraso`}>
                                            <span className="font-semibold text-red-600">{fmt(p.multa_valor)} Kz</span>
                                            <p className="text-[10px] text-red-400">+{dias}d</p>
                                          </div>
                                        );
                                      })() : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                                      {fmt(Number(p.valor) + Number(p.multa_valor || 0))} Kz
                                    </td>
                                    <td className="px-5 py-3.5 text-center">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg[p.status]?.cls || statusCfg.pendente.cls}`}>
                                        {statusCfg[p.status]?.label || p.status}
                                      </span>
                                    </td>
                                    <td className="px-5 py-3.5 text-right">
                                      {(p.status === "pendente" || p.status === "vencido") && (
                                        <button
                                          onClick={() => {
                                            setConfirmId(p.id);
                                            setConfirmPag(p);
                                            setConfirmMetodo("dinheiro");
                                            setConfirmData(new Date().toISOString().split("T")[0]);
                                            setConfirmEntregue("");
                                          }}
                                          className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                          Confirmar
                                        </button>
                                      )}
                                      {p.status === "pago" && loteLeaders.has(p.id) && (
                                        <button
                                          onClick={async () => {
                                            // Se faz parte de lote → abre PDF consolidado; senão abre PDF individual
                                            const url = p.lote_id
                                              ? `/pagamentos/lote/${p.lote_id}/recibo.pdf`
                                              : `/pagamentos/${p.id}/recibo.pdf`;
                                            try {
                                              const r = await api.get(url, { responseType: "blob" });
                                              const blob = new Blob([r.data], { type: "application/pdf" });
                                              const blobUrl = URL.createObjectURL(blob);
                                              const w = window.open(blobUrl, "_blank");
                                              if (!w) {
                                                const a = document.createElement("a");
                                                a.href = blobUrl; a.download = `recibo.pdf`;
                                                document.body.appendChild(a); a.click(); a.remove();
                                              }
                                            } catch (err) { console.error("Erro ao abrir PDF:", err); }
                                          }}
                                          title={p.lote_id ? "Imprimir recibo do lote" : "Imprimir recibo"}
                                          className="text-slate-400 hover:text-blue-600 transition-colors"
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 inline"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                        </button>
                                      )}
                                      {p.status === "pago" && !loteLeaders.has(p.id) && (
                                        <span className="text-[10px] text-slate-300 italic" title={`Parte do lote ${p.lote_id}`}>↳ lote</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ─── Modal: Registar Cobrança ─── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Registar Cobrança</h3>
                <p className="text-xs text-slate-400 mt-0.5">{alunoSel?.user?.nome}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={registarPagamento} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo *</label>
                  <select required value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                    <option value="mensalidade">Mensalidade</option>
                    <option value="matricula">Matrícula</option>
                    <option value="emolumento">Emolumento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Mês / Referência</label>
                  <input value={form.mes_referencia} onChange={e => setForm({ ...form, mes_referencia: e.target.value })}
                    placeholder="Ex: 2026-01"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>
              {planos.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Plano de Pagamento</label>
                  <select value={form.plano_id} onChange={e => setForm({ ...form, plano_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                    <option value="">Sem plano</option>
                    {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
              )}
              {form.tipo === "mensalidade" && propinasList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Propina (Precário)</label>
                  <select value={form.propina_id} onChange={e => {
                    const p = propinasList.find(x => String(x.id) === e.target.value);
                    setForm(f => ({ ...f, propina_id: e.target.value, valor: p?.valor_mensal ?? f.valor }));
                  }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                    <option value="">Sem propina (manual)</option>
                    {propinasList.map(p => <option key={p.id} value={p.id}>{p.nome || p.nivel || "Propina"} — {fmt(p.valor_mensal)} Kz/mês</option>)}
                  </select>
                </div>
              )}
              {form.tipo === "emolumento" && emolumentosList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Emolumento (Precário)</label>
                  <select value={form.emolumento_id} onChange={e => {
                    const em = emolumentosList.find(x => String(x.id) === e.target.value);
                    setForm(f => ({ ...f, emolumento_id: e.target.value, valor: em?.valor ?? f.valor }));
                  }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                    <option value="">Sem emolumento (manual)</option>
                    {emolumentosList.map(em => <option key={em.id} value={em.id}>{em.nome} — {fmt(em.valor)} Kz</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor (Kz) *</label>
                  <input type="number" required min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })}
                    placeholder="0"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Vencimento</label>
                  <input type="date" value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Método de Pagamento</label>
                <MetodoSelector value={form.metodo} onChange={m => setForm({ ...form, metodo: m })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors">
                  {saving ? "A registar..." : "Registar Cobrança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Confirmar Pagamento (single) ─── */}
      {confirmId && confirmPag && (() => {
        const valorBase    = Number(confirmPag.valor || 0);
        const multaValor   = Number(confirmPag.multa_valor || 0);
        const valorAPagar  = valorBase + multaValor;
        const entregue     = Number(confirmEntregue || 0);
        const troco        = entregue > 0 ? entregue - valorAPagar : null;
        const saldoCarteira = totalPago - totalPendente;
        const vencidos     = pagamentos.filter(p => p.status === "vencido" && p.id !== confirmId);
        const tipoLabels   = { mensalidade:"Mensalidade", matricula:"Matrícula", emolumento:"Emolumento", outro:"Outro" };
        const descricao    = (tipoLabels[confirmPag.tipo] || confirmPag.tipo) + (confirmPag.mes_referencia ? ` · ${confirmPag.mes_referencia}` : "");

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Confirmar Pagamento</h3>
                    <p className="text-xs text-slate-400">{alunoSel?.user?.nome}</p>
                  </div>
                </div>
                <button onClick={() => setConfirmId(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                {/* Detalhes da cobrança */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Detalhes da Cobrança</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <span className="text-slate-500">Nº Comprovativo</span>
                    <span className="font-mono font-semibold text-slate-800">{confirmPag.referencia || "—"}</span>
                    <span className="text-slate-500">Descrição</span>
                    <span className="font-medium text-slate-800">{descricao}</span>
                    <span className="text-slate-500">Vencimento</span>
                    <span className="font-medium text-slate-800">{confirmPag.data_vencimento ? new Date(confirmPag.data_vencimento).toLocaleDateString("pt-AO") : "—"}</span>
                    <span className="text-slate-500">Valor base</span>
                    <span className="font-medium text-slate-800">{fmt(valorBase)} Kz</span>
                    {multaValor > 0 && (<>
                      <span className="text-red-500">Multa{confirmPag.data_vencimento ? ` (${Math.max(0, Math.floor((Date.now() - new Date(confirmPag.data_vencimento).getTime()) / 86400000))} dias)` : ""}</span>
                      <span className="font-medium text-red-600">+ {fmt(multaValor)} Kz</span>
                    </>)}
                    <span className="text-slate-500">Total a Pagar</span>
                    <span className="font-bold text-blue-700 text-base">{fmt(valorAPagar)} Kz</span>
                  </div>
                </div>

                {/* Carteira */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Carteira do Aluno</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Total Pago</p>
                      <p className="text-sm font-bold text-emerald-600">{fmt(totalPago)} Kz</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-xs text-slate-400 mb-1">Pendente</p>
                      <p className="text-sm font-bold text-amber-600">{fmt(totalPendente)} Kz</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Saldo</p>
                      <p className={`text-sm font-bold ${saldoCarteira >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(saldoCarteira)} Kz</p>
                    </div>
                  </div>
                </div>

                {/* Multas / Em atraso */}
                {vencidos.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">⚠️ Cobranças em Atraso ({vencidos.length})</p>
                    <div className="space-y-1.5">
                      {vencidos.slice(0, 4).map(v => (
                        <div key={v.id} className="flex justify-between text-sm">
                          <span className="text-red-700">{(tipoLabels[v.tipo] || v.tipo)}{v.mes_referencia ? ` · ${v.mes_referencia}` : ""}</span>
                          <span className="font-semibold text-red-800">{fmt(v.valor)} Kz</span>
                        </div>
                      ))}
                      {vencidos.length > 4 && <p className="text-xs text-red-500">+ {vencidos.length - 4} mais...</p>}
                    </div>
                  </div>
                )}

                {/* Dados do pagamento */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dados do Pagamento</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Data de Pagamento</label>
                      <input type="date" value={confirmData} onChange={e => setConfirmData(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor Entregue (Kz)</label>
                      <input type="number" value={confirmEntregue} onChange={e => setConfirmEntregue(e.target.value)}
                        placeholder={fmt(valorAPagar)}
                        min="0" step="100"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Método de Pagamento</label>
                    <MetodoSelector value={confirmMetodo} onChange={(m) => { setConfirmMetodo(m); setConfirmError(""); }} />
                  </div>

                  {["multicaixa","transferencia","referencia"].includes(confirmMetodo) && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Nº de Referência <span className="text-red-500">*</span>
                      </label>
                      <input value={confirmNumRef} onChange={e => { setConfirmNumRef(e.target.value); setConfirmError(""); }}
                        placeholder={confirmMetodo === "multicaixa" ? "Ex: 12345678" : confirmMetodo === "transferencia" ? "Ex: 2024-09-15-001" : "Nº de referência"}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                  )}

                  {confirmError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">
                      {confirmError}
                    </div>
                  )}

                  {entregue > 0 && (
                    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${troco >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      <span className={`text-sm font-semibold ${troco >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {troco >= 0 ? "Troco a devolver" : "Valor insuficiente"}
                      </span>
                      <span className={`text-lg font-bold ${troco >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {troco >= 0 ? fmt(troco) : fmt(Math.abs(troco))} Kz
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                <button onClick={() => setConfirmId(null)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmarPagamento}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Modal: Pagar em Massa ─── */}
      {showBulkConfirm && (() => {
        const selecionados  = mensalidadesSorted.filter(m => selectedIds.has(m.id));
        const totalBaseBulk = selecionados.reduce((s, p) => s + Number(p.valor || 0), 0);
        const totalMultaBulk = selecionados.reduce((s, p) => s + Number(p.multa_valor || 0), 0);
        const totalBulk     = totalBaseBulk + totalMultaBulk;
        const entregueB     = Number(bulkEntregue || 0);
        const trocoB        = entregueB > 0 ? entregueB - totalBulk : null;
        const saldoCarteira = totalPago - totalPendente;
        const vencidos      = pagamentos.filter(p => p.status === "vencido" && !selectedIds.has(p.id));
        const tipoLabels    = { mensalidade:"Mensalidade", matricula:"Matrícula", emolumento:"Emolumento", outro:"Outro" };

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">

              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">Pagar {selecionados.length} mensalidade(s)</h3>
                    <p className="text-xs text-slate-400">{alunoSel?.user?.nome}</p>
                  </div>
                </div>
                <button onClick={() => setShowBulkConfirm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

                {/* Lista de cobranças selecionadas */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Cobranças Selecionadas</p>
                  <div className="space-y-2">
                    {selecionados.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-slate-800">{tipoLabels[p.tipo] || p.tipo}</span>
                          {p.mes_referencia && <span className="text-slate-400 ml-1">· {p.mes_referencia}</span>}
                          {p.referencia && <span className="text-xs font-mono text-slate-400 ml-2">{p.referencia}</span>}
                        </div>
                        <span className="font-semibold text-slate-800">{fmt(p.valor)} Kz</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                    <span className="text-sm font-semibold text-slate-600">Total a Pagar</span>
                    <span className="text-base font-bold text-blue-700">{fmt(totalBulk)} Kz</span>
                  </div>
                </div>

                {/* Carteira */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Carteira do Aluno</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Total Pago</p>
                      <p className="text-sm font-bold text-emerald-600">{fmt(totalPago)} Kz</p>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <p className="text-xs text-slate-400 mb-1">Pendente</p>
                      <p className="text-sm font-bold text-amber-600">{fmt(totalPendente)} Kz</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">Saldo</p>
                      <p className={`text-sm font-bold ${saldoCarteira >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmt(saldoCarteira)} Kz</p>
                    </div>
                  </div>
                </div>

                {/* Multas / Em atraso */}
                {vencidos.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">⚠️ Cobranças em Atraso ({vencidos.length})</p>
                    <div className="space-y-1.5">
                      {vencidos.slice(0, 4).map(v => (
                        <div key={v.id} className="flex justify-between text-sm">
                          <span className="text-red-700">{(tipoLabels[v.tipo] || v.tipo)}{v.mes_referencia ? ` · ${v.mes_referencia}` : ""}</span>
                          <span className="font-semibold text-red-800">{fmt(v.valor)} Kz</span>
                        </div>
                      ))}
                      {vencidos.length > 4 && <p className="text-xs text-red-500">+ {vencidos.length - 4} mais...</p>}
                    </div>
                  </div>
                )}

                {/* Dados do pagamento */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dados do Pagamento</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Data de Pagamento</label>
                      <input type="date" value={bulkData} onChange={e => setBulkData(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor Entregue (Kz)</label>
                      <input type="number" value={bulkEntregue} onChange={e => setBulkEntregue(e.target.value)}
                        placeholder={fmt(totalBulk)} min="0" step="100"
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Método de Pagamento</label>
                    <MetodoSelector value={bulkMetodo} onChange={(m) => { setBulkMetodo(m); setBulkError(""); }} />
                  </div>
                  {["multicaixa","transferencia","referencia"].includes(bulkMetodo) && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Nº de Referência <span className="text-red-500">*</span>
                      </label>
                      <input value={bulkNumRef} onChange={e => { setBulkNumRef(e.target.value); setBulkError(""); }}
                        placeholder={bulkMetodo === "multicaixa" ? "Ex: 12345678" : "Nº de referência"}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
                    </div>
                  )}
                  {bulkError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">
                      {bulkError}
                    </div>
                  )}
                  {entregueB > 0 && (
                    <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${trocoB >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                      <span className={`text-sm font-semibold ${trocoB >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {trocoB >= 0 ? "Troco a devolver" : "Valor insuficiente"}
                      </span>
                      <span className={`text-lg font-bold ${trocoB >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {trocoB >= 0 ? fmt(trocoB) : fmt(Math.abs(trocoB))} Kz
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                <button onClick={() => setShowBulkConfirm(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={pagarSelecionados} disabled={payingBulk}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                  {payingBulk ? "A pagar..." : `Confirmar ${selecionados.length} Pagamento(s)`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Modal: Gerar Propinas ─── */}
      {showGerarPropinas && alunoSel && (
        <ModalGerarPropinas
          alunoSel={alunoSel}
          onClose={() => setShowGerarPropinas(false)}
          onSuccess={() => { recarregarAluno(); }}
        />
      )}

      {/* ─── Modal: Gerar Emolumentos ─── */}
      {showGerarEmolumentos && alunoSel && (
        <ModalGerarEmolumentos
          alunoSel={alunoSel}
          onClose={() => setShowGerarEmolumentos(false)}
          onSuccess={() => { recarregarAluno(); }}
        />
      )}
    </div>
  );
}
