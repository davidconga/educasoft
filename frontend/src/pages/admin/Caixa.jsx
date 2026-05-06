import { useState, useEffect, useMemo } from "react";
import { Wallet, Lock, Unlock, ArrowDownCircle, ArrowUpCircle, Receipt, FileText, Loader2, Plus, X, Printer, Filter, BarChart3 } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const fmt = (v) => Number(v || 0).toLocaleString("pt-AO") + " Kz";
const fmtDate = (d) => d ? new Date(d).toLocaleString("pt-AO") : "—";

const TIPO_LABEL = {
  pagamento: { label: "Pagamento", cor: "text-emerald-700 bg-emerald-50" },
  reforco:   { label: "Reforço",   cor: "text-blue-700 bg-blue-50" },
  sangria:   { label: "Sangria",   cor: "text-amber-700 bg-amber-50" },
  despesa:   { label: "Despesa",   cor: "text-red-700 bg-red-50" },
};

export default function Caixa() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [actual, setActual]   = useState(null);   // sessão activa do operador
  const [resumo, setResumo]   = useState(null);
  const [historico, setHistorico] = useState([]);
  const [resumoAgregado, setResumoAgregado] = useState(null);
  const [periodo, setPeriodo] = useState("hoje"); // hoje | semana | mes | tudo
  const [filtroOperador, setFiltroOperador] = useState("");
  const [movimentos, setMovimentos] = useState([]);
  const [acaoLoading, setAcaoLoading] = useState(false);
  const [erro, setErro] = useState(null);

  // Modais
  const [showAbrir, setShowAbrir] = useState(false);
  const [showFechar, setShowFechar] = useState(false);
  const [showMov, setShowMov] = useState(null); // 'sangria' | 'reforco' | 'despesa'
  const [formAbrir, setFormAbrir] = useState({ fundo_inicial: "", nome_caixa: "", observacoes_abertura: "" });
  const [formFechar, setFormFechar] = useState({ total_contado: "", observacoes_fecho: "" });
  const [formMov, setFormMov] = useState({ valor: "", metodo: "dinheiro", descricao: "" });

  // Calcula intervalo de datas a partir do período seleccionado
  const calcDatas = (p) => {
    const hoje = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    if (p === "hoje")   return { de: fmt(hoje), ate: fmt(hoje) };
    if (p === "semana") {
      const ini = new Date(hoje); ini.setDate(hoje.getDate() - 6);
      return { de: fmt(ini), ate: fmt(hoje) };
    }
    if (p === "mes") {
      const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { de: fmt(ini), ate: fmt(hoje) };
    }
    return { de: null, ate: null };
  };

  const carregar = async () => {
    setLoading(true);
    try {
      const datas = calcDatas(periodo);
      const params = {};
      if (datas.de)  params.de = datas.de;
      if (datas.ate) params.ate = datas.ate;
      if (filtroOperador) params.operador = filtroOperador;

      const [acRes, hRes, rRes] = await Promise.all([
        api.get("/caixa/actual"),
        api.get("/caixa", { params: { ...params, per_page: 50 } }),
        api.get("/caixa/resumo", { params: datas.de ? params : { de: "1900-01-01" } }),
      ]);
      // Só aceita sessão se tem id válido — evita state stale com objeto incompleto
      const sessaoActual = (acRes.data && acRes.data.id) ? acRes.data : null;
      setActual(sessaoActual);
      setHistorico(hRes.data?.data || []);
      setResumoAgregado(rRes.data || null);
      if (sessaoActual) {
        const det = await api.get(`/caixa/${sessaoActual.id}`);
        setResumo(det.data?.resumo || null);
        setMovimentos(det.data?.sessao?.movimentos || []);
      } else {
        setResumo(null); setMovimentos([]);
      }
    } catch (e) {
      setErro(e.response?.data?.message || "Erro a carregar caixa.");
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, [periodo, filtroOperador]);

  const flash = (m, t = "ok") => {
    setErro(t === "err" ? m : null);
    if (t === "ok") { /* feedback silencioso */ }
    setTimeout(() => setErro(null), 4000);
  };

  const abrir = async () => {
    setAcaoLoading(true);
    try {
      const r = await api.post("/caixa/abrir", {
        fundo_inicial: Number(formAbrir.fundo_inicial || 0),
        nome_caixa: formAbrir.nome_caixa || null,
        observacoes_abertura: formAbrir.observacoes_abertura || null,
      });
      setShowAbrir(false);
      setFormAbrir({ fundo_inicial: "", nome_caixa: "", observacoes_abertura: "" });
      await carregar();
    } catch (e) {
      flash(e.response?.data?.message || "Falha ao abrir caixa.", "err");
    } finally { setAcaoLoading(false); }
  };

  const fechar = async () => {
    if (!actual?.id) {
      setActual(null); setShowFechar(false);
      flash("A sessão de caixa não tem ID válido — recarregando estado.", "err");
      carregar();
      return;
    }
    setAcaoLoading(true);
    try {
      await api.post(`/caixa/${actual.id}/fechar`, {
        total_contado: Number(formFechar.total_contado || 0),
        observacoes_fecho: formFechar.observacoes_fecho || null,
      });
      setShowFechar(false);
      setFormFechar({ total_contado: "", observacoes_fecho: "" });
      await carregar();
    } catch (e) {
      flash(e.response?.data?.message || "Falha ao fechar.", "err");
    } finally { setAcaoLoading(false); }
  };

  const registarMov = async () => {
    if (!actual?.id || !showMov) return;
    setAcaoLoading(true);
    try {
      await api.post(`/caixa/${actual.id}/${showMov}`, {
        valor: Number(formMov.valor || 0),
        metodo: formMov.metodo,
        descricao: formMov.descricao,
      });
      setShowMov(null);
      setFormMov({ valor: "", metodo: "dinheiro", descricao: "" });
      await carregar();
    } catch (e) {
      flash(e.response?.data?.message || "Falha ao registar.", "err");
    } finally { setAcaoLoading(false); }
  };

  const totalEsperado = useMemo(() => Number(actual?.total_esperado || 0), [actual]);

  const abrirPdfFecho = async (sessaoId) => {
    if (!sessaoId) { flash("ID da sessão inválido.", "err"); return; }
    try {
      const r = await api.get(`/caixa/${sessaoId}/fecho.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      window.open(url, "_blank");
    } catch (e) {
      flash(e.response?.data?.message || "Erro a gerar PDF.", "err");
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 size={16} className="animate-spin" /> A carregar...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Wallet size={24} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Caixa</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={carregar} title="Recarregar estado actual"
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-2 rounded-xl text-sm">
            ↻ Recarregar
          </button>
          {!actual && (
            <button onClick={() => setShowAbrir(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
              <Unlock size={15} /> Abrir caixa
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{erro}</div>
      )}

      {/* Sessão activa */}
      {actual ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">SESSÃO ABERTA</span>
                <span className="font-mono text-xs text-slate-500">{actual.codigo}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 mt-1">{actual.nome_caixa}</h2>
              <p className="text-xs text-slate-500">Aberta em {fmtDate(actual.abriu_em)} · Operador: {actual.operador_nome}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => abrirPdfFecho(actual.id)}
                className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold">
                <Printer size={15} /> Relatório
              </button>
              <button onClick={() => setShowFechar(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
                <Lock size={15} /> Fechar caixa
              </button>
            </div>
          </div>

          {resumo && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <Stat label="Fundo inicial" valor={resumo.fundo_inicial} />
              <Stat label="Pagamentos" valor={resumo.pagamentos} cor="text-emerald-600" />
              <Stat label="Reforços" valor={resumo.reforcos} cor="text-blue-600" />
              <Stat label="Sangrias" valor={resumo.sangrias} cor="text-amber-600" sinal="-" />
              <Stat label="Despesas" valor={resumo.despesas} cor="text-red-600" sinal="-" />
              <Stat label="Esperado em caixa" valor={resumo.total_esperado} forte />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowMov("reforco")} className="flex items-center gap-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
              <ArrowDownCircle size={14} /> Reforço
            </button>
            <button onClick={() => setShowMov("sangria")} className="flex items-center gap-2 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium">
              <ArrowUpCircle size={14} /> Sangria
            </button>
            <button onClick={() => setShowMov("despesa")} className="flex items-center gap-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium">
              <FileText size={14} /> Despesa
            </button>
            <a href="/pos" className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium">
              <Receipt size={14} /> Ir para POS
            </a>
          </div>

          {movimentos.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Movimentos da sessão</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Hora</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Método</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimentos.map(m => {
                      const t = TIPO_LABEL[m.tipo] || { label: m.tipo, cor: "text-slate-700 bg-slate-50" };
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-xs text-slate-500">{fmtDate(m.created_at)}</td>
                          <td className="px-4 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.cor}`}>{t.label}</span></td>
                          <td className="px-4 py-2 text-slate-700">{m.descricao || "—"}</td>
                          <td className="px-4 py-2 text-slate-500 capitalize">{m.metodo || "—"}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${m.sentido === -1 ? "text-red-600" : "text-emerald-600"}`}>
                            {m.sentido === -1 ? "−" : "+"}{fmt(m.valor)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Wallet size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">Não tens nenhuma sessão de caixa aberta.</p>
          <p className="text-xs text-slate-400 mt-1">Abre uma para começar a cobrar pagamentos via POS.</p>
        </div>
      )}

      {/* Resumo agregado */}
      {resumoAgregado && resumoAgregado.n_sessoes > 0 && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={18}/>
            <h3 className="font-bold text-sm uppercase tracking-wider">Resumo {periodoLabel(periodo)}{filtroOperador ? " · operador filtrado" : ""}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <ResumoStat label="Sessões" valor={resumoAgregado.n_sessoes} sufixo={resumoAgregado.abertas > 0 ? `(${resumoAgregado.abertas} abertas)` : ""}/>
            <ResumoStat label="Pagamentos" valor={`${resumoAgregado.n_pagamentos}`} sufixo={fmt(resumoAgregado.pagamentos)}/>
            <ResumoStat label="Reforços" valor={fmt(resumoAgregado.reforcos)}/>
            <ResumoStat label="Sangrias + Despesas" valor={fmt(Number(resumoAgregado.sangrias) + Number(resumoAgregado.despesas))}/>
            <ResumoStat label="Diferença total" valor={fmt(resumoAgregado.diferenca_total)}
              cor={Number(resumoAgregado.diferenca_total) === 0 ? "" : Number(resumoAgregado.diferenca_total) > 0 ? "text-emerald-200" : "text-red-200"}/>
          </div>
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-slate-700">Histórico de Sessões</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider min-w-[55px]">
              <Filter size={11}/> Período
            </span>
            <FiltroChip ativo={periodo === "hoje"}   onClick={() => setPeriodo("hoje")}>Hoje</FiltroChip>
            <FiltroChip ativo={periodo === "semana"} onClick={() => setPeriodo("semana")}>Últimos 7 dias</FiltroChip>
            <FiltroChip ativo={periodo === "mes"}    onClick={() => setPeriodo("mes")}>Mês actual</FiltroChip>
            <FiltroChip ativo={periodo === "tudo"}   onClick={() => setPeriodo("tudo")}>Tudo</FiltroChip>
          </div>
          {resumoAgregado?.operadores?.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider min-w-[55px]">Operador</span>
              <FiltroChip ativo={!filtroOperador} onClick={() => setFiltroOperador("")}>Todos</FiltroChip>
              {resumoAgregado.operadores.map(op => (
                <FiltroChip key={op.operador_id} ativo={String(filtroOperador) === String(op.operador_id)}
                  onClick={() => setFiltroOperador(op.operador_id)}>
                  {op.operador_nome}
                </FiltroChip>
              ))}
            </div>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Código</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Operador</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Aberta</th>
              <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Fechada</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Esperado</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Contado</th>
              <th className="text-right px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Diferença</th>
              <th className="text-center px-5 py-2 text-xs font-semibold text-slate-500 uppercase">Estado</th>
              <th className="text-center px-5 py-2 text-xs font-semibold text-slate-500 uppercase">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historico.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-slate-400">Sem histórico.</td></tr>
            ) : historico.map(s => {
              const dif = Number(s.diferenca || 0);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-mono text-xs">{s.codigo}</td>
                  <td className="px-5 py-2.5 text-slate-700">{s.operador_nome}</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">{fmtDate(s.abriu_em)}</td>
                  <td className="px-5 py-2.5 text-xs text-slate-500">{s.fechou_em ? fmtDate(s.fechou_em) : "—"}</td>
                  <td className="px-5 py-2.5 text-right">{fmt(s.total_esperado)}</td>
                  <td className="px-5 py-2.5 text-right">{s.total_contado ? fmt(s.total_contado) : "—"}</td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${dif === 0 ? "text-slate-500" : dif > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {s.fechou_em ? (dif > 0 ? "+" : "") + fmt(dif) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "aberta" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-center">
                    <button onClick={() => abrirPdfFecho(s.id)} title="Relatório de fecho"
                      className="text-blue-600 hover:text-blue-800">
                      <Printer size={14}/>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal abrir */}
      {showAbrir && (
        <Modal title="Abrir caixa" onClose={() => setShowAbrir(false)}>
          <Field label="Fundo inicial (Kz) *">
            <input type="number" min="0" step="any" value={formAbrir.fundo_inicial}
              onChange={e => setFormAbrir(f => ({ ...f, fundo_inicial: e.target.value }))}
              className={inp} placeholder="0" autoFocus/>
          </Field>
          <Field label="Nome da caixa">
            <input value={formAbrir.nome_caixa} onChange={e => setFormAbrir(f => ({ ...f, nome_caixa: e.target.value }))}
              className={inp} placeholder={`Caixa ${user?.nome || ""}`}/>
          </Field>
          <Field label="Observações">
            <textarea rows={2} value={formAbrir.observacoes_abertura}
              onChange={e => setFormAbrir(f => ({ ...f, observacoes_abertura: e.target.value }))}
              className={`${inp} resize-none`}/>
          </Field>
          <ModalAction onConfirm={abrir} loading={acaoLoading} label="Abrir caixa" cor="bg-blue-600 hover:bg-blue-700"/>
        </Modal>
      )}

      {/* Modal fechar */}
      {showFechar && actual && (
        <Modal title="Fechar caixa" onClose={() => setShowFechar(false)}>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2">
            <p className="text-xs text-slate-500">Total esperado em caixa</p>
            <p className="text-2xl font-bold text-slate-800">{fmt(totalEsperado)}</p>
          </div>
          <Field label="Total contado (físico) *">
            <input type="number" min="0" step="any" value={formFechar.total_contado}
              onChange={e => setFormFechar(f => ({ ...f, total_contado: e.target.value }))}
              className={inp} autoFocus/>
            {formFechar.total_contado !== "" && (
              <p className={`text-xs mt-1 ${Number(formFechar.total_contado) - totalEsperado >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                Diferença: {fmt(Number(formFechar.total_contado) - totalEsperado)}
              </p>
            )}
          </Field>
          <Field label="Observações de fecho">
            <textarea rows={2} value={formFechar.observacoes_fecho}
              onChange={e => setFormFechar(f => ({ ...f, observacoes_fecho: e.target.value }))}
              className={`${inp} resize-none`}/>
          </Field>
          <ModalAction onConfirm={fechar} loading={acaoLoading} label="Confirmar fecho" cor="bg-slate-800 hover:bg-slate-900"/>
        </Modal>
      )}

      {/* Modal movimento */}
      {showMov && (
        <Modal title={`Registar ${TIPO_LABEL[showMov]?.label}`} onClose={() => setShowMov(null)}>
          <Field label="Valor (Kz) *">
            <input type="number" min="0.01" step="any" value={formMov.valor}
              onChange={e => setFormMov(f => ({ ...f, valor: e.target.value }))}
              className={inp} autoFocus/>
          </Field>
          <Field label="Método">
            <select value={formMov.metodo} onChange={e => setFormMov(f => ({ ...f, metodo: e.target.value }))} className={inp}>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
              <option value="multicaixa">Multicaixa</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
          <Field label="Descrição *">
            <input value={formMov.descricao} onChange={e => setFormMov(f => ({ ...f, descricao: e.target.value }))} className={inp}
              placeholder={showMov === "despesa" ? "Ex: lanches, materiais..." : showMov === "sangria" ? "Ex: depósito banco" : "Ex: troco extra"}/>
          </Field>
          <ModalAction onConfirm={registarMov} loading={acaoLoading} label="Registar" cor="bg-blue-600 hover:bg-blue-700"/>
        </Modal>
      )}
    </div>
  );
}

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

function Stat({ label, valor, cor = "text-slate-800", forte = false, sinal = "" }) {
  return (
    <div className={`rounded-xl border ${forte ? "border-blue-200 bg-blue-50/40" : "border-slate-100 bg-slate-50/40"} p-3`}>
      <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">{label}</p>
      <p className={`${forte ? "text-base" : "text-sm"} font-bold ${cor} mt-0.5`}>{sinal}{fmt(valor)}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function periodoLabel(p) {
  return ({ hoje: "de hoje", semana: "dos últimos 7 dias", mes: "do mês actual", tudo: "global" }[p] || "");
}

function FiltroChip({ ativo, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
        ativo
          ? "bg-blue-600 text-white border-blue-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
      }`}>
      {children}
    </button>
  );
}

function ResumoStat({ label, valor, sufixo, cor = "" }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${cor}`}>{valor}</p>
      {sufixo && <p className="text-[10px] opacity-80 mt-0.5">{sufixo}</p>}
    </div>
  );
}

function ModalAction({ onConfirm, loading, label, cor }) {
  return (
    <button onClick={onConfirm} disabled={loading}
      className={`w-full ${cor} text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 mt-2 flex items-center justify-center gap-2`}>
      {loading ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
      {loading ? "A processar..." : label}
    </button>
  );
}
