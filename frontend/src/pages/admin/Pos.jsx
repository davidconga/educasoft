import { useState, useEffect, useRef } from "react";
import { Search, ScanBarcode, User, Receipt, AlertCircle, CheckCircle, Loader2, X, Wallet, Printer, Filter, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { usePermissao } from "../../hooks/usePermissao";
import { imprimirRecibo } from "../../components/Recibo";
import { useMeses } from "../../hooks/useMeses";
import ModalVerificarAcademicos from "../../components/ModalVerificarAcademicos";
import { enqueuePosCobranca, enqueueCriarPagamento } from "../../offline/pos";
import { sendOrEnqueue } from "../../offline/sendOrEnqueue";
import { searchAlunosLocal, getDividasLocal, cacheDividas } from "../../offline/alunos";
import { setCache, getCache } from "../../offline/db";

const fmt = (v) => Number(v || 0).toLocaleString("pt-PT") + " Kz";

const METODOS = [
  { id: "dinheiro",              label: "Dinheiro" },
  { id: "multicaixa",            label: "Multicaixa" },
  { id: "multicaixa_express",    label: "Multicaixa Express" },
  { id: "transferencia",         label: "Transferência" },
  { id: "referencia_multicaixa", label: "Referência Multicaixa" },
  { id: "cheque",                label: "Cheque" },
  { id: "carteira",              label: "Carteira (Saldo)" },
];

export default function Pos() {
  const { escola } = useAuthStore();
  const { can } = usePermissao();
  const podeDepositar = can("carteira_depositar");
  const podeLevantar  = can("carteira_levantar");
  const navigate = useNavigate();
  const meses = useMeses();
  const [sessao, setSessao]   = useState(null);
  const [carregaSessao, setCarregaSessao] = useState(true);
  const [query, setQuery]     = useState("");
  const [resultados, setResultados] = useState([]);
  const [pesquisando, setPesquisando] = useState(false);
  const [aluno, setAluno]     = useState(null);
  const [showVerifAcad, setShowVerifAcad] = useState(false);
  const [dividas, setDividas] = useState([]);
  const [totalDevido, setTotalDevido] = useState(0);
  const [selected, setSelected] = useState([]);
  const [metodo, setMetodo]   = useState("multicaixa");
  const [valorEntregue, setValorEntregue] = useState("");
  const [numRef, setNumRef]   = useState("");
  const [refCheck, setRefCheck] = useState({ status: "idle", data: null }); // idle | checking | livre | usada | erro
  const [acao, setAcao]       = useState(false);
  const [erro, setErro]       = useState(null);
  const [ultimoLote, setUltimoLote] = useState(null);
  const [filtros, setFiltros] = useState({ tipo: "", mes: "", soVencidas: false });
  const [showAbrir, setShowAbrir] = useState(false);
  const [abrirForm, setAbrirForm] = useState({ fundo_inicial: "0", nome_caixa: "" });
  const [abrindo, setAbrindo] = useState(false);
  const [showNovaCobr, setShowNovaCobr] = useState(false);
  const [novaCobr, setNovaCobr] = useState({
    tipo: "mensalidade",
    propina_id: "",
    emolumento_id: "",
    valor: "",
    mes_num: String(new Date().getMonth() + 1).padStart(2, "0"),
    mes_ano: String(new Date().getFullYear()),
    observacao: "",
    data_vencimento: "",
  });
  const [criandoCobr, setCriandoCobr] = useState(false);
  const [propinas, setPropinas]         = useState([]);
  const [emolumentos, setEmolumentos]   = useState([]);

  // Carteira: saldo + modais de depósito/levantamento
  const [saldoCarteira, setSaldoCarteira] = useState(0);
  const [lotesRecentes, setLotesRecentes] = useState([]);
  const [reimprimindo, setReimprimindo]   = useState(null);
  const [valorCarteira, setValorCarteira] = useState("");
  const [showDeposito, setShowDeposito]   = useState(false);
  const [showLevantamento, setShowLevantamento] = useState(false);
  const [carteiraForm, setCarteiraForm]   = useState({ valor: "", metodo: "dinheiro", num_referencia_externa: "", observacao: "" });
  const [carteiraSaving, setCarteiraSaving] = useState(false);
  const [carteiraError, setCarteiraError] = useState("");

  const inputRef = useRef();

  // Carrega sessão activa + precário. Online refresca a cache; offline lê-a.
  // Sem o fallback, /precario/propinas e /emolumentos falhavam silenciosamente
  // offline e o formulário "Criar Cobrança Nova" ficava com dropdowns vazios.
  useEffect(() => {
    let cancelado = false;
    const carregarPropinas = async () => {
      try {
        const r = await api.get("/precario/propinas");
        if (cancelado) return;
        const dados = r.data || [];
        setPropinas(dados);
        setCache("pos:propinas", dados).catch(() => {});
      } catch (e) {
        if (e?.response) return; // erro do servidor → não tocar no estado
        const c = await getCache("pos:propinas").catch(() => null);
        if (!cancelado && c?.value) setPropinas(c.value);
      }
    };
    const carregarEmolumentos = async () => {
      try {
        const r = await api.get("/precario/emolumentos");
        if (cancelado) return;
        const dados = r.data || [];
        setEmolumentos(dados);
        setCache("pos:emolumentos", dados).catch(() => {});
      } catch (e) {
        if (e?.response) return;
        const c = await getCache("pos:emolumentos").catch(() => null);
        if (!cancelado && c?.value) setEmolumentos(c.value);
      }
    };
    const carregarSessao = async () => {
      try {
        const r = await api.get("/caixa/actual");
        if (cancelado) return;
        setSessao(r.data || null);
        setCache("pos:caixa_actual", r.data || null).catch(() => {});
      } catch (e) {
        if (e?.response) return; // ex.: 401 já tratado pelo interceptor
        // Sem rede: tenta último snapshot. Pode estar stale mas é melhor do
        // que mostrar "Sem caixa aberta" quando o operador acabou de a abrir online.
        const c = await getCache("pos:caixa_actual").catch(() => null);
        if (!cancelado && c?.value?.id) setSessao(c.value);
      } finally {
        if (!cancelado) setCarregaSessao(false);
      }
    };
    carregarSessao();
    carregarPropinas();
    carregarEmolumentos();
    return () => { cancelado = true; };
  }, []);

  // Procura aluno (debounced). Online: API. Offline / falha de rede: cache IndexedDB.
  useEffect(() => {
    if (!query.trim()) { setResultados([]); return; }
    setPesquisando(true);
    const timer = setTimeout(async () => {
      const useLocal = async () => {
        try {
          const locais = await searchAlunosLocal(query);
          setResultados(locais);
        } catch { setResultados([]); }
      };
      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (isOffline) {
        await useLocal();
        setPesquisando(false);
        return;
      }
      try {
        const r = await api.get("/pos/alunos", { params: { q: query } });
        setResultados(r.data || []);
      } catch (e) {
        if (!e?.response) {
          // falha de rede → tenta local
          await useLocal();
        } else {
          setResultados([]);
        }
      } finally { setPesquisando(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const aplicarDividasPayload = (payload, { offline = false } = {}) => {
    const al = payload.aluno;
    setAluno(offline ? { ...al, _offline: true } : al);
    setDividas(payload.dividas || []);
    setTotalDevido(payload.total_devido || 0);
    setSaldoCarteira(Number(payload.saldo_carteira || 0));
    setLotesRecentes(payload.lotes_recentes || []);
  };

  const escolherAluno = async (a) => {
    setQuery(""); setResultados([]); setSelected([]);
    setErro(null); setValorCarteira("");
    const carregarLocal = async () => {
      const cached = await getDividasLocal(a.id);
      if (cached) {
        aplicarDividasPayload(cached, { offline: true });
        return true;
      }
      // Sem cache: monta um payload mínimo a partir do snapshot da pesquisa,
      // para o operador poder pelo menos criar uma cobrança nova offline.
      aplicarDividasPayload({
        aluno: { id: a.id, nome: a.nome, numero_aluno: a.numero_aluno, foto: a.foto, user: { nome: a.nome }, matriculas: [] },
        dividas: [],
        total_devido: 0,
        saldo_carteira: 0,
        lotes_recentes: [],
      }, { offline: true });
      setErro("Aluno em modo offline sem dívidas cacheadas. Apenas é possível criar uma cobrança nova.");
      return true;
    };
    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    if (isOffline) { await carregarLocal(); return; }
    try {
      const r = await api.get(`/pos/alunos/${a.id}/dividas`);
      aplicarDividasPayload(r.data);
      cacheDividas(a.id, r.data); // best-effort, não bloqueia
      if (escola?.permite_pago_historico && !r.data.aluno?.dados_academicos_verificados_em) {
        setShowVerifAcad(true);
      }
    } catch (e) {
      if (!e?.response) {
        await carregarLocal();
      } else {
        setErro(e.response?.data?.message || "Erro a carregar dívidas.");
      }
    }
  };

  const recarregarAluno = async () => {
    if (!aluno) return;
    try {
      const r = await api.get(`/pos/alunos/${aluno.id}/dividas`);
      setDividas(r.data.dividas || []);
      setTotalDevido(r.data.total_devido || 0);
      setSaldoCarteira(Number(r.data.saldo_carteira || 0));
      setLotesRecentes(r.data.lotes_recentes || []);
      cacheDividas(aluno.id, r.data);
    } catch (_) { /* ignore */ }
  };

  const reimprimirLote = async (lote) => {
    const key = lote.lote_id || `PAG-${lote.pagamento_id}`;
    setReimprimindo(key);
    try {
      const r = await api.get(`/pos/recibo/${encodeURIComponent(key)}`);
      imprimirRecibo(r.data.pagamentos, escola, r.data.carteira || null, r.data.via_number || 2);
    } catch (e) {
      setErro(e.response?.data?.message || "Falha ao reimprimir recibo.");
    } finally {
      setReimprimindo(null);
    }
  };

  const submeterDeposito = async (e) => {
    e.preventDefault();
    setCarteiraError("");
    const valorNum = parseFloat(String(carteiraForm.valor).replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setCarteiraError("Indique um valor válido (maior que zero).");
      return;
    }
    const exigeNumRefDep = ["multicaixa","transferencia","referencia"].includes(carteiraForm.metodo);
    if (exigeNumRefDep && !carteiraForm.num_referencia_externa.trim()) {
      setCarteiraError(`Para método "${carteiraForm.metodo}", indique o nº de referência.`);
      return;
    }
    setCarteiraSaving(true);
    const offlineRef = `OFFDEP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase();
    try {
      const result = await sendOrEnqueue({
        method: "POST",
        url: `/pagamentos/carteira/${aluno.id}/depositar`,
        data: {
          valor: valorNum,
          metodo: carteiraForm.metodo,
          num_referencia_externa: carteiraForm.num_referencia_externa || null,
          observacao: carteiraForm.observacao || null,
          offline_lote_ref: offlineRef,
          offline_data_pagamento: new Date().toISOString().slice(0, 10),
        },
        meta: { kind: "carteira.depositar", aluno_id: aluno.id, aluno_nome: aluno?.user?.nome, valor: valorNum },
        label: `Depósito carteira · ${aluno?.user?.nome ?? "—"} · ${valorNum.toLocaleString("pt-PT")} Kz`,
      });
      setShowDeposito(false);
      setCarteiraForm({ valor: "", metodo: "dinheiro", num_referencia_externa: "", observacao: "" });
      if (result.queued) {
        // offline: actualizar saldo optimistamente; sincronização real virá pelo flush
        setSaldoCarteira(prev => Number(prev || 0) + valorNum);
      } else {
        recarregarAluno();
      }
    } catch (err) {
      setCarteiraError(err.response?.data?.message || "Falha ao registar depósito.");
    } finally {
      setCarteiraSaving(false);
    }
  };

  const submeterLevantamento = async (e) => {
    e.preventDefault();
    setCarteiraError("");
    const valorNum = parseFloat(String(carteiraForm.valor).replace(",", "."));
    if (!Number.isFinite(valorNum) || valorNum <= 0) {
      setCarteiraError("Indique um valor válido (maior que zero).");
      return;
    }
    // Pré-validação local de saldo (offline o backend não pode rejeitar a tempo).
    if (valorNum > Number(saldoCarteira || 0) + 0.001) {
      setCarteiraError(`Saldo em carteira insuficiente (disponível ${Number(saldoCarteira||0).toLocaleString("pt-PT")} Kz).`);
      return;
    }
    setCarteiraSaving(true);
    const offlineRef = `OFFLEV-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`.toUpperCase();
    try {
      const result = await sendOrEnqueue({
        method: "POST",
        url: `/pagamentos/carteira/${aluno.id}/levantar`,
        data: {
          valor: valorNum,
          observacao: carteiraForm.observacao || null,
          offline_lote_ref: offlineRef,
          offline_data_pagamento: new Date().toISOString().slice(0, 10),
        },
        meta: { kind: "carteira.levantar", aluno_id: aluno.id, aluno_nome: aluno?.user?.nome, valor: valorNum },
        label: `Levantamento carteira · ${aluno?.user?.nome ?? "—"} · ${valorNum.toLocaleString("pt-PT")} Kz`,
      });
      setShowLevantamento(false);
      setCarteiraForm({ valor: "", metodo: "dinheiro", num_referencia_externa: "", observacao: "" });
      if (result.queued) {
        setSaldoCarteira(prev => Math.max(0, Number(prev || 0) - valorNum));
      } else {
        recarregarAluno();
      }
    } catch (err) {
      setCarteiraError(err.response?.data?.message || "Falha ao registar levantamento.");
    } finally {
      setCarteiraSaving(false);
    }
  };

  const criarNovaCobranca = async (e) => {
    e?.preventDefault();
    if (!aluno) return;
    if (!novaCobr.valor || Number(novaCobr.valor) <= 0) {
      alert("Selecciona/indica um valor válido."); return;
    }
    if (novaCobr.tipo === "mensalidade" && !novaCobr.mes_num) {
      alert("Selecciona o mês de referência."); return;
    }
    setCriandoCobr(true);
    const mesRef = novaCobr.tipo === "mensalidade"
      ? `${novaCobr.mes_ano}-${novaCobr.mes_num}`
      : null;
    const payload = {
      aluno_id: aluno.id,
      tipo: novaCobr.tipo,
      valor: Number(novaCobr.valor),
      propina_id:    novaCobr.tipo === "mensalidade" || novaCobr.tipo === "matricula" ? (novaCobr.propina_id || null) : null,
      emolumento_id: novaCobr.tipo === "emolumento" ? (novaCobr.emolumento_id || null) : null,
      mes_referencia: mesRef,
      observacao: novaCobr.observacao || null,
      data_vencimento: novaCobr.data_vencimento || null,
      metodo: "dinheiro",
    };
    const resetForm = () => {
      setShowNovaCobr(false);
      setNovaCobr({
        tipo: "mensalidade", propina_id: "", emolumento_id: "", valor: "",
        mes_num: String(new Date().getMonth() + 1).padStart(2, "0"),
        mes_ano: String(new Date().getFullYear()),
        observacao: "", data_vencimento: "",
      });
    };
    const aplicarNova = (novo) => {
      setDividas(prev => [...prev, novo]);
      setSelected(prev => [...prev, novo.id]);
      setTotalDevido(prev => prev + Number(novo.valor || 0));
    };

    const offlineAgora = typeof navigator !== "undefined" && navigator.onLine === false;
    if (offlineAgora) {
      try {
        const { pagamento } = await enqueueCriarPagamento({ aluno, payload });
        aplicarNova(pagamento);
        resetForm();
      } catch (err) {
        alert("Não foi possível guardar a cobrança localmente.");
      } finally {
        setCriandoCobr(false);
      }
      return;
    }

    try {
      const r = await api.post("/pagamentos", payload);
      aplicarNova(r.data);
      resetForm();
    } catch (err) {
      if (!err.response) {
        // erro de rede → cair para offline
        try {
          const { pagamento } = await enqueueCriarPagamento({ aluno, payload });
          aplicarNova(pagamento);
          resetForm();
        } catch (e2) {
          alert("Falha ao criar cobrança (e ao guardar offline).");
        }
      } else {
        alert(err.response?.data?.message || "Falha ao criar cobrança.");
      }
    } finally {
      setCriandoCobr(false);
    }
  };

  const fecharAluno = () => {
    setAluno(null); setDividas([]); setSelected([]); setValorEntregue(""); setUltimoLote(null);
    setLotesRecentes([]); setSaldoCarteira(0);
    inputRef.current?.focus();
  };

  // Lookup por nome (case + acento insensitive) → month_id da tabela `meses`.
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const mesIdPorNome = (nome) => meses?.find(m => norm(m.nome) === norm(nome))?.id ?? null;

  // Converte mes_referencia em chave numérica ordenável (ano*100 + month_id).
  // Suporta "Janeiro 2024" (PT, via tabela meses), "2026-11" e "2026-2027-3".
  const mesKey = (mr) => {
    if (!mr) return null;
    const s = String(mr).trim();
    const m0 = s.match(/^([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);
    if (m0) {
      const id = mesIdPorNome(m0[1]);
      if (id) return Number(m0[2]) * 100 + id;
    }
    const m1 = s.match(/^(\d{4})-\d{4}-(\d+)$/);
    if (m1) return Number(m1[1]) * 100 + Number(m1[2]);
    const m2 = s.match(/^(\d{4})-(\d+)$/);
    if (m2) return Number(m2[1]) * 100 + Number(m2[2]);
    return null;
  };

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(s => s.filter(x => x !== id));
      return;
    }
    const item = dividas.find(d => d.id === id);
    // Regra: para mensalidades, não se pode seleccionar um mês futuro antes do passado/presente.
    if (item?.tipo === "mensalidade" && item.mes_referencia) {
      const k = mesKey(item.mes_referencia);
      if (k !== null) {
        const anteriores = dividas.filter(d =>
          d.id !== id &&
          d.tipo === "mensalidade" &&
          d.mes_referencia &&
          mesKey(d.mes_referencia) !== null &&
          mesKey(d.mes_referencia) < k &&
          !selected.includes(d.id)
        );
        if (anteriores.length > 0) {
          const meses = [...new Set(anteriores.map(a => a.mes_referencia))].join(", ");
          setErro(`Tens mensalidades anteriores pendentes (${meses}). Selecciona-as primeiro — não é permitido pagar um mês futuro antes do passado.`);
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => setErro(null), 7000);
          return;
        }
      }
    }
    setSelected(s => [...s, id]);
  };

  const toggleTodos = () => {
    const ids = dividasFiltradas.map(d => d.id);
    const todosSel = ids.every(id => selected.includes(id));
    if (todosSel) setSelected(s => s.filter(id => !ids.includes(id)));
    else setSelected(s => [...new Set([...s, ...ids])]);
  };

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  // Ordem cronológica: mensalidades por mês ascendente, depois outros tipos por vencimento
  const dividasOrdenadas = [...dividas].sort((a, b) => {
    const ka = mesKey(a.mes_referencia), kb = mesKey(b.mes_referencia);
    if (ka !== null && kb !== null) return ka - kb;
    if (ka !== null) return -1;
    if (kb !== null) return 1;
    return new Date(a.data_vencimento || 0) - new Date(b.data_vencimento || 0);
  });
  const dividasFiltradas = dividasOrdenadas.filter(d => {
    if (filtros.tipo && d.tipo !== filtros.tipo) return false;
    if (filtros.mes && d.mes_referencia !== filtros.mes) return false;
    if (filtros.soVencidas) {
      if (!d.data_vencimento) return false;
      if (new Date(d.data_vencimento) >= hoje) return false;
    }
    return true;
  });

  const tiposDisponiveis = [...new Set(dividas.map(d => d.tipo).filter(Boolean))];
  const mesesDisponiveis = [...new Set(dividas.map(d => d.mes_referencia).filter(Boolean))].sort();

  // Mensalidades vencidas (tipo mensalidade + data_vencimento no passado)
  const mensalidadesVencidas = dividas.filter(d =>
    d.tipo === "mensalidade" && d.data_vencimento && new Date(d.data_vencimento) < hoje
  );
  const totalVencidas = mensalidadesVencidas.reduce((s, d) =>
    s + Number(d.valor) + Number(d.multa_valor || 0) - Number(d.bolsa_valor || 0), 0);

  const totalSeleccionado = dividas
    .filter(d => selected.includes(d.id))
    .reduce((s, d) => s + Number(d.valor) + Number(d.multa_valor || 0) - Number(d.bolsa_valor || 0), 0);

  const exigeRef = ["multicaixa","multicaixa_express","transferencia","referencia","referencia_multicaixa","cheque"].includes(metodo);

  // Formato esperado da referência por método (Angola).
  // Devolve { ok: bool, msg: string } — msg vazio se ok ou se ainda não há input.
  const formatoRef = () => {
    const r = numRef.trim();
    if (!exigeRef || !r) return { ok: true, msg: "" };

    if (metodo === "multicaixa" || metodo === "multicaixa_express") {
      if (!/^\d+$/.test(r))    return { ok: false, msg: "Referência Multicaixa deve conter apenas dígitos." };
      if (r.length < 6)        return { ok: false, msg: `Referência demasiado curta (${r.length} dígitos; mínimo 6).` };
      if (r.length > 15)       return { ok: false, msg: `Referência demasiado longa (${r.length} dígitos; máximo 15).` };
      return { ok: true, msg: "" };
    }
    if (metodo === "referencia_multicaixa" || metodo === "referencia") {
      if (!/^\d+$/.test(r))    return { ok: false, msg: "Referência Multicaixa por entidade deve ser numérica." };
      if (r.length !== 9)      return { ok: false, msg: `Referência por entidade tem 9 dígitos (${r.length} introduzidos).` };
      return { ok: true, msg: "" };
    }
    if (metodo === "cheque") {
      if (!/^\d+$/.test(r))    return { ok: false, msg: "Nº do cheque deve ser numérico." };
      if (r.length < 6 || r.length > 12) return { ok: false, msg: "Nº do cheque com 6 a 12 dígitos." };
      return { ok: true, msg: "" };
    }
    if (metodo === "transferencia") {
      if (r.length < 4)        return { ok: false, msg: "Referência da transferência demasiado curta." };
      return { ok: true, msg: "" };
    }
    return { ok: true, msg: "" };
  };
  const formato = formatoRef();

  // Verificação live de duplicação da referência (debounced) — só corre se o formato bater
  useEffect(() => {
    if (!exigeRef || !numRef.trim() || !formato.ok) { setRefCheck({ status: "idle", data: null }); return; }
    setRefCheck({ status: "checking", data: null });
    const handle = setTimeout(async () => {
      try {
        const r = await api.get("/pos/verificar-referencia", { params: { ref: numRef.trim() } });
        setRefCheck(r.data?.usada
          ? { status: "usada", data: r.data.pagamento }
          : { status: "livre", data: null });
      } catch {
        setRefCheck({ status: "erro", data: null });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [numRef, exigeRef, formato.ok]);

  const abrirCaixaRapida = async () => {
    setAbrindo(true); setErro(null);
    try {
      const payload = {
        fundo_inicial: Number(abrirForm.fundo_inicial || 0),
        nome_caixa: abrirForm.nome_caixa || null,
      };
      const r = await sendOrEnqueue({
        method: "POST",
        url: "/caixa/abrir",
        data: payload,
        label: `Abrir caixa (${payload.nome_caixa || "rápida"})`,
        meta: { tipo: "caixa_abrir" },
      });
      if (r.queued) {
        // Offline: sintetiza a sessão localmente para a UI funcionar até sincronizar.
        // O backend irá criar a sessão real quando esta entrada da outbox enviar;
        // entretanto, qualquer `pos/cobrar` que façamos também vai para a outbox
        // e a ordem FIFO garante que a sessão é criada antes das cobranças.
        const agora = new Date();
        const ymd = agora.toISOString().slice(0,10).replace(/-/g,"");
        setSessao({
          id:             "tmp-caixa-" + agora.getTime(),
          codigo:         `OFF-CX-${ymd}-${String(agora.getTime()).slice(-3)}`,
          operador_id:    null,
          operador_nome:  "(offline)",
          nome_caixa:     payload.nome_caixa || "Caixa (offline)",
          fundo_inicial:  payload.fundo_inicial,
          total_esperado: payload.fundo_inicial,
          abriu_em:       agora.toISOString(),
          status:         "aberta",
          _offline:       true,
        });
      } else {
        setSessao(r.data);
      }
      setShowAbrir(false);
      setAbrirForm({ fundo_inicial: "0", nome_caixa: "" });
    } catch (e) {
      setErro(e?.response?.data?.message || "Erro ao abrir caixa.");
    } finally { setAbrindo(false); }
  };

  const cobrar = async () => {
    if (selected.length === 0) return;
    if (exigeRef && !numRef.trim()) {
      setErro("Indica a referência da transacção para este método de pagamento.");
      return;
    }
    if (exigeRef && !formato.ok) {
      setErro("Formato da referência inválido: " + formato.msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (exigeRef && refCheck.status === "usada") {
      const p = refCheck.data;
      setErro(`Esta referência já foi usada no pagamento ${p?.referencia} (${p?.aluno || "—"}, ${p?.data_pagamento || ""}).`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setAcao(true); setErro(null);
    const usaCarteiraTotal = metodo === "carteira";
    const carteiraNum = parseFloat(String(valorCarteira).replace(",", "."));
    const carteiraValido = !usaCarteiraTotal && Number.isFinite(carteiraNum) && carteiraNum > 0;
    const payload = {
      ids: selected,
      metodo,
      num_referencia_externa: exigeRef ? numRef.trim() : null,
      valor_entregue: !usaCarteiraTotal && valorEntregue ? Number(valorEntregue) : null,
      ...(carteiraValido ? { valor_carteira: carteiraNum } : {}),
    };

    const offlineAgora = typeof navigator !== "undefined" && navigator.onLine === false;

    // Helper: tudo o que acontece DEPOIS de uma cobrança bem-sucedida (online ou offline).
    const finalizarLote = (lote, viaNumber) => {
      setUltimoLote(lote);
      try { imprimirRecibo(lote.pagamentos, escola, lote.carteira || null, viaNumber || 1); }
      catch (e) { console.error("Falha imprimir recibo:", e); }
      setSelected([]); setValorEntregue(""); setNumRef(""); setValorCarteira("");
      setRefCheck({ status: "idle", data: null });
    };

    // Caminho offline: gera recibo provisório, faz enqueue para sincronizar depois.
    const cobrarOffline = async () => {
      try {
        const { lote: pagamentos, referencia } = await enqueuePosCobranca({
          aluno, dividas, selected, payload,
        });
        // Actualizar UI optimistamente
        const idsPagos = new Set(selected);
        const totalPago = dividas
          .filter(d => idsPagos.has(d.id))
          .reduce((s, d) => s + Number(d.valor || 0) + Number(d.multa_valor || 0) - Number(d.bolsa_valor || 0), 0);
        setDividas(prev => prev.filter(d => !idsPagos.has(d.id)));
        setTotalDevido(prev => Math.max(0, prev - totalPago));
        if (carteiraValido) setSaldoCarteira(prev => Math.max(0, prev - carteiraNum));
        // Adicionar à lista de lotes recentes (visualmente marcado como provisório)
        setLotesRecentes(prev => [
          { lote_id: referencia, total: totalPago, data_pagamento: new Date().toISOString(), _offline: true },
          ...prev,
        ]);
        finalizarLote({ pagamentos, carteira: null, via_number: 1 }, 1);
        setErro(null);
      } catch (err) {
        console.error("[POS] erro a guardar cobrança offline:", err);
        setErro("Não foi possível guardar a cobrança localmente. Tente novamente.");
      }
    };

    // Caso 1: já estamos offline → guarda directamente sem tentar a rede.
    if (offlineAgora) {
      await cobrarOffline();
      setAcao(false);
      return;
    }

    // Caso 2: temos rede, tenta o caminho normal. Se for erro de rede, cai para offline.
    try {
      // Re-valida sessão activa antes de cobrar (evita cache stale).
      // Nota: usamos a flag headers para distinguir falha-de-rede de "sem sessão".
      const ac = await api.get("/caixa/actual");
      if (!ac.data) {
        setSessao(null);
        setErro("A sessão de caixa já não está aberta. Abre uma nova abaixo.");
        setAcao(false);
        return;
      }

      const r = await api.post("/pos/cobrar", payload);
      finalizarLote(r.data, r.data.via_number || 1);
      await recarregarAluno();
    } catch (e) {
      const isNetwork = !e.response; // sem resposta = falha de rede
      if (isNetwork) {
        // Rede caiu entre o pedido e a resposta → modo offline.
        await cobrarOffline();
      } else {
        console.error("[POS] erro a cobrar:", e?.response?.status, e?.response?.data, e);
        const validationErrs = e?.response?.data?.errors;
        if (validationErrs) {
          const lista = Object.values(validationErrs).flat().join(" · ");
          setErro("Validação falhou: " + lista);
        } else {
          setErro(e?.response?.data?.message || `Erro a cobrar (HTTP ${e?.response?.status ?? "?"}).`);
        }
      }
    } finally { setAcao(false); }
  };

  if (carregaSessao) return (
    <div className="p-8 flex items-center gap-2 text-slate-500">
      <Loader2 size={16} className="animate-spin" /> A carregar...
    </div>
  );

  if (!sessao) return (
    <>
      <div className="max-w-2xl mx-auto bg-white border border-amber-200 bg-amber-50/40 rounded-2xl p-8 text-center">
        <Wallet size={36} className="mx-auto text-amber-500 mb-3" />
        <h2 className="font-bold text-slate-800 text-lg mb-1">Sem caixa aberta</h2>
        <p className="text-sm text-slate-600 mb-4">Para usar o POS precisas de abrir uma sessão de caixa primeiro.</p>
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">
            {erro}
          </div>
        )}
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => setShowAbrir(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
            <Unlock size={15}/> Abrir caixa rápida
          </button>
          <button onClick={() => navigate("/caixa")}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold">
            Ir para Caixa
          </button>
        </div>
      </div>
      {showAbrir && (
        <ModalAbrirCaixa form={abrirForm} setForm={setAbrirForm}
          onClose={() => setShowAbrir(false)} onConfirm={abrirCaixaRapida} loading={abrindo}/>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Header com sessão */}
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Receipt size={18} className="text-emerald-700"/>
          <div>
            <p className="text-xs text-emerald-700 font-semibold uppercase">POS — Cobrança rápida</p>
            <p className="text-xs text-slate-600">Caixa <span className="font-mono">{sessao.codigo}</span> · {sessao.operador_nome} · esperado {fmt(sessao.total_esperado)}</p>
          </div>
        </div>
        <button onClick={() => navigate("/caixa")} className="text-xs text-emerald-700 font-semibold hover:underline">Gerir caixa →</button>
      </div>

      {erro && (
        <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2 shadow-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0"/>
          <div className="flex-1">{erro}</div>
          <button onClick={() => setErro(null)} className="text-red-500 hover:text-red-700">
            <X size={14}/>
          </button>
        </div>
      )}

      {!aluno ? (
        // Pesquisa
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Procurar aluno</h2>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input ref={inputRef} autoFocus type="search" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Nº de aluno, nome ou email..."
              className="w-full pl-10 pr-3 py-3 text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <ScanBarcode size={12}/> Ponta o leitor de código de barras / QR para um cartão de aluno.
          </p>

          {pesquisando && <p className="text-sm text-slate-400 mt-4 flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> A procurar...</p>}

          {resultados.length > 0 && (
            <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {resultados.map(a => (
                <button key={a.id} onClick={() => escolherAluno(a)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden">
                    {a.foto
                      ? <img src={`${window.location.origin}/storage/${a.foto}`} alt={a.nome} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }}/>
                      : <User size={16}/>}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{a.nome}</p>
                    <p className="text-xs text-slate-500">{a.numero_aluno ? `Nº ${a.numero_aluno}` : ""} {a.turma ? `· ${a.turma}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && !pesquisando && resultados.length === 0 && (
            <p className="text-sm text-slate-400 mt-4 text-center py-6">Sem resultados.</p>
          )}
        </div>
      ) : (
        <>
          {/* Cabeçalho aluno */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 overflow-hidden ring-2 ring-blue-100">
              {aluno.foto ? (
                <img
                  src={`${window.location.origin}/storage/${aluno.foto}`}
                  alt={aluno.nome}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.outerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'; }}
                />
              ) : (
                <User size={22}/>
              )}
            </div>
            <div className="flex-1 min-w-[180px]">
              <h2 className="text-lg font-bold text-slate-800">{aluno.nome}</h2>
              <p className="text-sm text-slate-500">{aluno.numero_aluno ? `Nº ${aluno.numero_aluno}` : ""} {aluno.turma ? `· ${aluno.turma}` : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-semibold">Saldo Carteira</p>
              <p className={`text-lg font-bold ${saldoCarteira > 0 ? "text-indigo-600" : "text-slate-400"}`}>{fmt(saldoCarteira)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-semibold">Total devido</p>
              <p className="text-xl font-bold text-red-600">{fmt(totalDevido)}</p>
            </div>
            <div className="flex items-center gap-2">
              {podeDepositar && (
                <button onClick={() => { setCarteiraError(""); setCarteiraForm({ valor: "", metodo: "dinheiro", num_referencia_externa: "", observacao: "" }); setShowDeposito(true); }}
                  className="flex items-center gap-1.5 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-xs font-medium px-3 py-2 rounded-xl">
                  + Depositar
                </button>
              )}
              {podeLevantar && (
                <button onClick={() => { setCarteiraError(""); setCarteiraForm({ valor: "", metodo: "dinheiro", num_referencia_externa: "", observacao: "" }); setShowLevantamento(true); }}
                  disabled={saldoCarteira <= 0}
                  className="flex items-center gap-1.5 border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium px-3 py-2 rounded-xl">
                  − Levantar
                </button>
              )}
            </div>
            <button onClick={fecharAluno} className="text-slate-400 hover:text-slate-700 p-2"><X size={18}/></button>
          </div>

          {/* Banner destacado: mensalidades vencidas */}
          {mensalidadesVencidas.length > 0 && (
            <button
              onClick={() => setFiltros(f => ({ ...f, soVencidas: !f.soVencidas, tipo: f.soVencidas ? f.tipo : "mensalidade" }))}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl border-2 transition-all text-left
                ${filtros.soVencidas
                  ? "bg-red-600 border-red-600 text-white shadow-md"
                  : "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"}`}>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center ${filtros.soVencidas ? "bg-white/20" : "bg-red-200"}`}>
                <AlertCircle size={20} className={filtros.soVencidas ? "text-white" : "text-red-700"}/>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm uppercase tracking-wider">
                  {mensalidadesVencidas.length} mensalidade{mensalidadesVencidas.length !== 1 ? "s" : ""} vencida{mensalidadesVencidas.length !== 1 ? "s" : ""}
                </p>
                <p className={`text-xs mt-0.5 ${filtros.soVencidas ? "text-white/90" : "text-red-700"}`}>
                  Total em atraso: <strong>{fmt(totalVencidas)}</strong> · Clica para {filtros.soVencidas ? "remover filtro" : "destacar e cobrar primeiro"}
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${filtros.soVencidas ? "bg-white text-red-700" : "bg-red-600 text-white"}`}>
                {filtros.soVencidas ? "Filtro activo" : "Filtrar"}
              </span>
            </button>
          )}

          {/* Dívidas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-slate-700">
                Pagamentos pendentes ({dividasFiltradas.length}{dividasFiltradas.length !== dividas.length ? `/${dividas.length}` : ""})
              </h3>
              <div className="flex items-center gap-3">
                {dividasFiltradas.length > 0 && (
                  <button onClick={toggleTodos} className="text-xs text-blue-600 hover:underline">
                    {dividasFiltradas.every(d => selected.includes(d.id)) ? "Desmarcar visíveis" : "Seleccionar visíveis"}
                  </button>
                )}
                <button onClick={() => setShowNovaCobr(true)}
                  className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md">
                  + Nova cobrança
                </button>
              </div>
            </div>

            {dividas.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 space-y-2">
                {tiposDisponiveis.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider min-w-[55px]">
                      <Filter size={11}/> Tipo
                    </span>
                    <Chip ativo={!filtros.tipo} onClick={() => setFiltros(f => ({...f, tipo: ""}))}>Todos</Chip>
                    {tiposDisponiveis.map(t => (
                      <Chip key={t} ativo={filtros.tipo === t} onClick={() => setFiltros(f => ({...f, tipo: t}))}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Chip>
                    ))}
                  </div>
                )}
                {mesesDisponiveis.length > 1 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider min-w-[55px]">Mês</span>
                    <Chip ativo={!filtros.mes} onClick={() => setFiltros(f => ({...f, mes: ""}))}>Todos</Chip>
                    {mesesDisponiveis.map(m => (
                      <Chip key={m} ativo={filtros.mes === m} onClick={() => setFiltros(f => ({...f, mes: m}))}>{m}</Chip>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider min-w-[55px]">Estado</span>
                  <Chip ativo={!filtros.soVencidas} onClick={() => setFiltros(f => ({...f, soVencidas: false}))}>Todas</Chip>
                  <Chip ativo={filtros.soVencidas} onClick={() => setFiltros(f => ({...f, soVencidas: true}))} cor="amber">
                    Só vencidas
                  </Chip>
                  {(filtros.tipo || filtros.mes || filtros.soVencidas) && (
                    <button onClick={() => setFiltros({ tipo: "", mes: "", soVencidas: false })}
                      className="text-xs text-slate-500 hover:text-slate-700 ml-auto underline">Limpar</button>
                  )}
                </div>
              </div>
            )}

            {dividasFiltradas.length === 0 ? (
              <p className="text-center text-slate-400 py-10 text-sm">
                {dividas.length === 0 ? "Sem pagamentos pendentes. 🎉" : "Nenhum resultado para os filtros aplicados."}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-10 px-4 py-2"></th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Mês ref.</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Multa</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">A pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dividasFiltradas.map(d => {
                    const isSel = selected.includes(d.id);
                    const isVencida = d.tipo === "mensalidade" && d.data_vencimento && new Date(d.data_vencimento) < hoje;
                    const aPagar = Number(d.valor) + Number(d.multa_valor || 0) - Number(d.bolsa_valor || 0);
                    return (
                      <tr key={d.id} className={`hover:bg-slate-50 cursor-pointer ${isSel ? "bg-blue-50/40" : isVencida ? "bg-red-50/30" : ""}`} onClick={() => toggle(d.id)}>
                        <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={isSel} onChange={() => toggle(d.id)} className="rounded"/>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-slate-800">{d.propina?.nome || d.emolumento?.nome || d.observacao || d.tipo}</p>
                          <p className="text-xs text-slate-400 font-mono">{d.referencia}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">{d.mes_referencia || "—"}</td>
                        <td className={`px-4 py-2.5 text-xs ${isVencida ? "text-red-600 font-bold" : "text-slate-500"}`}>
                          {d.data_vencimento ? new Date(d.data_vencimento).toLocaleDateString("pt-AO") : "—"}
                          {isVencida && <span className="ml-1 text-[9px] uppercase">vencida</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">{fmt(d.valor)}</td>
                        <td className="px-4 py-2.5 text-right text-amber-600">{Number(d.multa_valor) > 0 ? fmt(d.multa_valor) : "—"}</td>
                        <td className="px-4 py-2.5 text-right font-bold">{fmt(aPagar)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Recibos recentes — sempre visível para o aluno seleccionado */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Printer size={14} className="text-slate-400"/> Recibos recentes
                {lotesRecentes.length > 0 && <span className="text-[11px] text-slate-400 font-normal">({lotesRecentes.length})</span>}
              </h3>
              <span className="text-[11px] text-slate-400">Clica em reimprimir</span>
            </div>
            {lotesRecentes.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">Sem recibos pagos ainda para este aluno.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {lotesRecentes.map(l => {
                  const key = l.lote_id || `PAG-${l.pagamento_id}`;
                  const isLoading = reimprimindo === key;
                  return (
                    <div key={key} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {l.lote_id ? `Lote ${l.lote_id}` : (l.referencia || `PAG-${l.pagamento_id}`)}
                          {l.n_pagamentos > 1 && <span className="text-xs text-slate-400 ml-1">· {l.n_pagamentos} pag.</span>}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {l.data_pagamento ? new Date(l.data_pagamento).toLocaleDateString("pt-AO") : "—"}
                          {l.metodo ? ` · ${l.metodo}` : ""}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{fmt(l.total)}</span>
                      <button onClick={() => reimprimirLote(l)} disabled={isLoading}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-300 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg disabled:opacity-60">
                        {isLoading ? <Loader2 size={12} className="animate-spin"/> : <Printer size={12}/>}
                        Reimprimir
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagamento */}
          {selected.length > 0 && (() => {
            const usandoCarteiraTotal = metodo === "carteira";
            const podeCarteiraTotal   = saldoCarteira >= totalSeleccionado - 0.001;
            const carteiraNum         = parseFloat(String(valorCarteira).replace(",", "."));
            const carteiraAplicar     = (() => {
              if (usandoCarteiraTotal) return 0;
              if (!Number.isFinite(carteiraNum) || carteiraNum <= 0) return 0;
              return Math.min(carteiraNum, saldoCarteira, totalSeleccionado);
            })();
            const restoCash = Math.max(0, totalSeleccionado - carteiraAplicar);
            const isCash    = metodo === "dinheiro";
            const cobre     = usandoCarteiraTotal
              ? podeCarteiraTotal
              : (isCash ? Number(valorEntregue || 0) + carteiraAplicar >= totalSeleccionado - 0.001 : true);
            const podeCobrar = !acao && cobre && (usandoCarteiraTotal || !exigeRef || (formato.ok && refCheck.status !== "usada" && numRef.trim() !== ""));
            return (
            <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-md p-5 sticky bottom-3 z-10">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total a cobrar ({selected.length})</p>
                  <p className="text-3xl font-bold text-blue-700">{fmt(totalSeleccionado)}</p>
                </div>
                <div className="w-44">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Método</label>
                  <select value={metodo} onChange={e => { setMetodo(e.target.value); if (e.target.value === "carteira") setValorCarteira(""); }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500">
                    {METODOS.filter(m => m.id !== "carteira" || saldoCarteira > 0).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                {exigeRef && (
                  <div className="w-60">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nº de referência *</label>
                    <div className="relative">
                      <input value={numRef}
                        onChange={e => setNumRef(
                          (metodo === "cheque" || metodo === "multicaixa" || metodo === "multicaixa_express" || metodo === "referencia_multicaixa" || metodo === "referencia")
                            ? e.target.value.replace(/\D+/g, "")  // só dígitos
                            : e.target.value
                        )}
                        inputMode={metodo === "transferencia" ? "text" : "numeric"}
                        placeholder={
                          metodo === "cheque" ? "Nº do cheque (6-12 dígitos)" :
                          metodo === "referencia_multicaixa" || metodo === "referencia" ? "9 dígitos" :
                          metodo === "multicaixa" || metodo === "multicaixa_express" ? "Nº da transacção" :
                          "Referência"
                        }
                        className={`w-full border rounded-xl px-3 py-2.5 pr-9 text-sm focus:ring-2 focus:outline-none transition-colors
                          ${(numRef && !formato.ok) || refCheck.status === "usada" ? "border-red-400 focus:ring-red-500 bg-red-50/40"
                          : refCheck.status === "livre" ? "border-emerald-400 focus:ring-emerald-500 bg-emerald-50/40"
                          : "border-slate-200 focus:ring-blue-500"}`}/>
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        {numRef && !formato.ok       && <AlertCircle size={14} className="text-red-600"/>}
                        {numRef && formato.ok && refCheck.status === "checking" && <Loader2 size={14} className="animate-spin text-slate-400"/>}
                        {refCheck.status === "livre" && <CheckCircle size={14} className="text-emerald-600"/>}
                        {refCheck.status === "usada" && <AlertCircle size={14} className="text-red-600"/>}
                      </span>
                    </div>
                    {numRef && !formato.ok && (
                      <p className="text-[11px] text-red-600 mt-1 leading-tight">{formato.msg}</p>
                    )}
                    {formato.ok && refCheck.status === "usada" && refCheck.data && (
                      <p className="text-[11px] text-red-600 mt-1 leading-tight">
                        Já usada em <strong>{refCheck.data.referencia}</strong>
                        {refCheck.data.aluno ? ` · ${refCheck.data.aluno}` : ""}
                        {refCheck.data.data_pagamento ? ` (${refCheck.data.data_pagamento})` : ""}
                      </p>
                    )}
                    {formato.ok && refCheck.status === "livre" && (
                      <p className="text-[11px] text-emerald-600 mt-1">Referência livre ✓</p>
                    )}
                  </div>
                )}
                {!exigeRef && !usandoCarteiraTotal && (
                  <div className="w-40">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Valor entregue</label>
                    <input type="number" min="0" step="any" value={valorEntregue}
                      onChange={e => setValorEntregue(e.target.value)}
                      placeholder={fmt(restoCash)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"/>
                    {valorEntregue && Number(valorEntregue) > restoCash && (
                      <p className="text-xs text-emerald-600 mt-1">Troco: {fmt(Number(valorEntregue) - restoCash)}</p>
                    )}
                  </div>
                )}
                {!usandoCarteiraTotal && saldoCarteira > 0 && (
                  <div className="w-52">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-indigo-700">Carteira (Kz)</label>
                      <button type="button"
                        onClick={() => setValorCarteira(String(Math.min(saldoCarteira, totalSeleccionado)))}
                        className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 px-1.5 py-0.5 rounded border border-indigo-300 bg-white">
                        Máx
                      </button>
                    </div>
                    <input type="text" inputMode="decimal" autoComplete="off" value={valorCarteira}
                      onChange={e => setValorCarteira(e.target.value.replace(/[^\d.,]/g, ""))}
                      placeholder={`0 (disp. ${fmt(saldoCarteira)})`}
                      className="w-full border border-indigo-200 bg-indigo-50/40 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"/>
                    {carteiraAplicar > 0 && (
                      <p className="text-[11px] text-indigo-700 mt-1">Resto: <strong>{fmt(restoCash)}</strong></p>
                    )}
                  </div>
                )}
                {usandoCarteiraTotal && (
                  <div className="flex-1 min-w-[180px]">
                    <p className={`text-xs font-medium ${podeCarteiraTotal ? "text-indigo-700" : "text-red-600"}`}>
                      {podeCarteiraTotal
                        ? `Será debitado ${fmt(totalSeleccionado)} do saldo (disponível ${fmt(saldoCarteira)}).`
                        : `Saldo insuficiente: necessário ${fmt(totalSeleccionado)}, disponível ${fmt(saldoCarteira)}.`}
                    </p>
                  </div>
                )}
                <button onClick={cobrar} disabled={!podeCobrar}
                  title={!cobre ? (usandoCarteiraTotal ? "Saldo insuficiente" : "Valor entregue insuficiente para cobrir o total") : ""}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-7 py-3 rounded-xl text-base font-bold">
                  {acao ? <Loader2 size={18} className="animate-spin"/> : <Receipt size={18}/>}
                  {acao ? "A cobrar..." : "Cobrar"}
                </button>
              </div>
            </div>
            );
          })()}

          {showAbrir && (
            <ModalAbrirCaixa form={abrirForm} setForm={setAbrirForm}
              onClose={() => setShowAbrir(false)} onConfirm={abrirCaixaRapida} loading={abrindo}/>
          )}

          {/* Confirmação último lote */}
          {ultimoLote && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-emerald-800">Cobrança efectuada — lote <span className="font-mono">{ultimoLote.lote_id}</span></p>
                <p className="text-xs text-emerald-700">{ultimoLote.pagamentos?.length} pagamento(s) registados. Recibo enviado para impressão.</p>
              </div>
              <button onClick={() => imprimirRecibo(ultimoLote.pagamentos, escola, ultimoLote.carteira || null, ultimoLote.via_number || 1)}
                className="flex items-center gap-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-xs font-semibold">
                <Printer size={13}/> Reimprimir
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal: nova cobrança avulsa */}
      {showNovaCobr && aluno && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold">+ Nova cobrança</h2>
              <p className="text-xs text-slate-500 mt-1">
                Cria um pagamento pendente para <strong>{aluno.nome || aluno.user?.nome}</strong>.
                Após criar, fica seleccionado e pronto para cobrar.
              </p>
            </div>
            <form onSubmit={criarNovaCobranca} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
                <select value={novaCobr.tipo}
                  onChange={e => setNovaCobr(c => ({ ...c, tipo: e.target.value, propina_id: "", emolumento_id: "", valor: "" }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="mensalidade">Mensalidade</option>
                  <option value="matricula">Matrícula</option>
                  <option value="emolumento">Emolumento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* VALOR — depende do tipo */}
              {(novaCobr.tipo === "mensalidade" || novaCobr.tipo === "matricula") && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Propina / Valor *
                  </label>
                  <select required value={novaCobr.propina_id} autoFocus
                    onChange={e => {
                      const p = propinas.find(x => String(x.id) === e.target.value);
                      const v = novaCobr.tipo === "matricula" ? (p?.valor_matricula || p?.valor_mensal) : p?.valor_mensal;
                      setNovaCobr(c => ({ ...c, propina_id: e.target.value, valor: v ?? "" }));
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Selecciona —</option>
                    {propinas.map(p => {
                      const val = novaCobr.tipo === "matricula" ? (p.valor_matricula || p.valor_mensal) : p.valor_mensal;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.nome}{p.nivel ? ` (${p.nivel})` : ""} — {Number(val||0).toLocaleString("pt-PT")} Kz
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {novaCobr.tipo === "emolumento" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Emolumento *</label>
                  <select required value={novaCobr.emolumento_id} autoFocus
                    onChange={e => {
                      const em = emolumentos.find(x => String(x.id) === e.target.value);
                      setNovaCobr(c => ({ ...c, emolumento_id: e.target.value, valor: em?.valor ?? "" }));
                    }}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Selecciona —</option>
                    {emolumentos.map(em => (
                      <option key={em.id} value={em.id}>
                        {em.nome} — {Number(em.valor||0).toLocaleString("pt-PT")} Kz
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {novaCobr.tipo === "outro" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor (Kz) *</label>
                  <input type="number" min="0" step="0.01" required autoFocus
                    value={novaCobr.valor}
                    onChange={e => setNovaCobr(c => ({ ...c, valor: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              {/* Valor a pagar (visível como confirmação) */}
              {novaCobr.tipo !== "outro" && novaCobr.valor !== "" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm text-emerald-800">
                  Valor a cobrar: <strong>{Number(novaCobr.valor||0).toLocaleString("pt-PT")} Kz</strong>
                </div>
              )}

              {/* MÊS — só para mensalidade */}
              {novaCobr.tipo === "mensalidade" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mês *</label>
                      <select required value={novaCobr.mes_num}
                        onChange={e => setNovaCobr(c => ({ ...c, mes_num: e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm">
                        {[
                          ["01","Janeiro"],["02","Fevereiro"],["03","Março"],["04","Abril"],
                          ["05","Maio"],["06","Junho"],["07","Julho"],["08","Agosto"],
                          ["09","Setembro"],["10","Outubro"],["11","Novembro"],["12","Dezembro"],
                        ].map(([n, l]) => <option key={n} value={n}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ano *</label>
                      <select required value={novaCobr.mes_ano}
                        onChange={e => setNovaCobr(c => ({ ...c, mes_ano: String(e.target.value) }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm">
                        {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                    Será criado para: <strong>{
                      ["","Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][parseInt(novaCobr.mes_num,10)] || "—"
                    } {novaCobr.mes_ano}</strong>
                    <span className="text-blue-500"> (mes_referencia: {novaCobr.mes_ano}-{novaCobr.mes_num})</span>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
                  <input type="date" value={novaCobr.data_vencimento}
                    onChange={e => setNovaCobr(c => ({ ...c, data_vencimento: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
                  <input type="text" maxLength={255}
                    value={novaCobr.observacao}
                    onChange={e => setNovaCobr(c => ({ ...c, observacao: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowNovaCobr(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={criandoCobr || !novaCobr.valor}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60">
                  {criandoCobr ? "A criar..." : "+ Criar cobrança"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: verificar dados académicos (Golfinho) */}
      {showVerifAcad && aluno && (
        <ModalVerificarAcademicos
          aluno={aluno}
          onClose={() => setShowVerifAcad(false)}
          onSaved={(alunoActualizado) => {
            setShowVerifAcad(false);
            setAluno(alunoActualizado);
          }}
        />
      )}

      {/* Modal: Depositar em Carteira */}
      {showDeposito && aluno && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-emerald-600"/>
                <h3 className="font-semibold text-slate-800">Depositar em Carteira</h3>
              </div>
              <button onClick={() => setShowDeposito(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
            </div>
            <form onSubmit={submeterDeposito} className="p-5 space-y-3">
              <p className="text-xs text-slate-500">{aluno.nome} · Saldo actual <strong>{fmt(saldoCarteira)}</strong></p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor (Kz) *</label>
                <input type="text" inputMode="decimal" autoComplete="off" required value={carteiraForm.valor}
                  onChange={e => setCarteiraForm(f => ({ ...f, valor: e.target.value.replace(/[^\d.,]/g, "") }))}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Método de entrada</label>
                <select value={carteiraForm.metodo}
                  onChange={e => { setCarteiraForm(f => ({ ...f, metodo: e.target.value })); setCarteiraError(""); }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="referencia">Referência</option>
                </select>
              </div>
              {["multicaixa","transferencia","referencia"].includes(carteiraForm.metodo) && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nº de referência *</label>
                  <input value={carteiraForm.num_referencia_externa}
                    onChange={e => setCarteiraForm(f => ({ ...f, num_referencia_externa: e.target.value }))}
                    placeholder="Nº da operação"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
                <input value={carteiraForm.observacao}
                  onChange={e => setCarteiraForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Ex.: Pré-pagamento de propinas"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"/>
              </div>
              {carteiraError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">{carteiraError}</div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowDeposito(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={carteiraSaving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-60">
                  {carteiraSaving ? "A depositar..." : "Depositar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Levantar de Carteira */}
      {showLevantamento && aluno && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-amber-600"/>
                <h3 className="font-semibold text-slate-800">Levantar de Carteira</h3>
              </div>
              <button onClick={() => setShowLevantamento(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
            </div>
            <form onSubmit={submeterLevantamento} className="p-5 space-y-3">
              <p className="text-xs text-slate-500">{aluno.nome} · Saldo disponível <strong>{fmt(saldoCarteira)}</strong></p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Valor a levantar (Kz) *</label>
                <input type="text" inputMode="decimal" autoComplete="off" required value={carteiraForm.valor}
                  onChange={e => setCarteiraForm(f => ({ ...f, valor: e.target.value.replace(/[^\d.,]/g, "") }))}
                  placeholder="0"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"/>
                <p className="text-[11px] text-slate-400 mt-1">Saída em dinheiro registada na sessão de caixa.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
                <input value={carteiraForm.observacao}
                  onChange={e => setCarteiraForm(f => ({ ...f, observacao: e.target.value }))}
                  placeholder="Ex.: Devolução ao encarregado"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"/>
              </div>
              {carteiraError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs">{carteiraError}</div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowLevantamento(false)}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={carteiraSaving || parseFloat(String(carteiraForm.valor).replace(",", ".")) > saldoCarteira}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2 rounded-xl text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                  {carteiraSaving ? "A levantar..." : "Levantar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalAbrirCaixa({ form, setForm, onClose, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-blue-600"/>
            <h3 className="font-semibold text-slate-800">Abrir caixa</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fundo inicial (Kz) *</label>
            <input type="number" min="0" step="any" autoFocus
              value={form.fundo_inicial}
              onChange={e => setForm(f => ({ ...f, fundo_inicial: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"/>
            <p className="text-xs text-slate-400 mt-1">Dinheiro físico em caixa no momento da abertura. Pode ser 0.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome da caixa</label>
            <input value={form.nome_caixa}
              onChange={e => setForm(f => ({ ...f, nome_caixa: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(automático: o teu nome)"/>
          </div>
          <button onClick={onConfirm} disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 mt-2 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin"/> : <Unlock size={14}/>}
            {loading ? "A abrir..." : "Abrir caixa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ ativo, onClick, children, cor = "blue" }) {
  const cores = {
    blue:  ativo ? "bg-blue-600 text-white border-blue-600"   : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600",
    amber: ativo ? "bg-amber-500 text-white border-amber-500" : "bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-600",
  };
  return (
    <button onClick={onClick}
      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${cores[cor]}`}>
      {children}
    </button>
  );
}
