import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Send, Search, MessageCircle, Mail, Phone, Loader2, CheckCheck, Check, Archive, MoreVertical } from "lucide-react";

const ESTADO_BADGE = {
  aberto:   "bg-green-100 text-green-700",
  em_curso: "bg-blue-100 text-blue-700",
  fechado:  "bg-gray-100 text-gray-500",
};
const ESTADO_LABEL = { aberto: "Aberto", em_curso: "Em curso", fechado: "Fechado" };

export default function SuperAdminChat() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [chats, setChats] = useState([]);
  const [activo, setActivo] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [loadingLista, setLoadingLista] = useState(true);
  const scrollRef = useRef(null);
  const lastIdRef = useRef(0);

  // carregar lista
  async function carregarLista() {
    try {
      const params = {};
      if (busca) params.q = busca;
      if (filtroEstado) params.estado = filtroEstado;
      const { data } = await api.get("/site-chats", { params });
      setChats(data.data || data);
    } finally {
      setLoadingLista(false);
    }
  }

  useEffect(() => { carregarLista(); }, [busca, filtroEstado]);
  useEffect(() => {
    const id = setInterval(carregarLista, 8000);
    return () => clearInterval(id);
  }, [busca, filtroEstado]);

  // carregar mensagens do activo
  async function carregarMensagens(reset = false) {
    if (!activo) return;
    try {
      const params = reset ? {} : (lastIdRef.current ? { desde: lastIdRef.current } : {});
      const { data } = await api.get(`/site-chats/${activo.id}/mensagens`, { params });
      if (reset) {
        setMensagens(data.mensagens || []);
        lastIdRef.current = (data.mensagens || []).reduce((m, x) => Math.max(m, x.id), 0);
      } else if ((data.mensagens || []).length) {
        setMensagens((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const novos = data.mensagens.filter((m) => !ids.has(m.id));
          const next = [...prev, ...novos];
          lastIdRef.current = next.reduce((m, x) => Math.max(m, x.id), 0);
          return next;
        });
      }
      if (data.chat) setActivo((prev) => ({ ...prev, ...data.chat }));
    } catch {/* ignore */}
  }

  useEffect(() => {
    if (!activo) return;
    lastIdRef.current = 0;
    carregarMensagens(true);
    const id = setInterval(() => carregarMensagens(false), 4000);
    return () => clearInterval(id);
  }, [activo?.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens.length, activo?.id]);

  async function enviar(e) {
    e?.preventDefault();
    const texto = novoTexto.trim();
    if (!texto || !activo) return;
    setEnviando(true);
    try {
      const { data } = await api.post(`/site-chats/${activo.id}/mensagens`, { texto });
      setMensagens((prev) => [...prev, data]);
      lastIdRef.current = Math.max(lastIdRef.current, data.id);
      setNovoTexto("");
      carregarLista();
    } finally {
      setEnviando(false);
    }
  }

  async function mudarEstado(novoEstado) {
    if (!activo) return;
    await api.patch(`/site-chats/${activo.id}`, { estado: novoEstado });
    setActivo({ ...activo, estado: novoEstado });
    carregarLista();
  }

  return (
    <div className="h-full flex">
      {/* Lista */}
      <aside className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-gray-800 mb-3">Chat do Site</h1>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar..."
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <div className="flex gap-1 text-xs">
            {[["", "Todas"], ["aberto", "Abertas"], ["em_curso", "Em curso"], ["fechado", "Fechadas"]].map(([v, l]) => (
              <button key={v} onClick={() => setFiltroEstado(v)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${filtroEstado === v ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLista ? (
            <p className="text-gray-400 text-center py-10 text-sm">A carregar...</p>
          ) : chats.length === 0 ? (
            <p className="text-gray-400 text-center py-10 text-sm">Sem conversas.</p>
          ) : chats.map((c) => (
            <button key={c.id} onClick={() => setActivo(c)}
              className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${activo?.id === c.id ? "bg-blue-50" : ""}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm text-gray-800 truncate flex-1">{c.nome}</p>
                {c.nao_lidas_admin > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">{c.nao_lidas_admin}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate">
                {c.email && <><Mail size={10} /><span className="truncate">{c.email}</span></>}
                {!c.email && c.telefone && <><Phone size={10} /><span>{c.telefone}</span></>}
              </div>
              {c.assunto && <p className="text-xs text-gray-600 truncate mt-1">📌 {c.assunto}</p>}
              <div className="flex items-center justify-between mt-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[c.estado] ?? ESTADO_BADGE.aberto}`}>
                  {ESTADO_LABEL[c.estado] ?? c.estado}
                </span>
                <span className="text-[10px] text-gray-400">
                  {c.ultima_mensagem_em ? new Date(c.ultima_mensagem_em).toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Painel */}
      <section className="flex-1 flex flex-col bg-gray-50">
        {!activo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona uma conversa para responder.</p>
            </div>
          </div>
        ) : (
          <>
            <header className="bg-white border-b px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">{activo.nome}</h2>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  {activo.email && <span className="flex items-center gap-1"><Mail size={11} /> {activo.email}</span>}
                  {activo.telefone && <span className="flex items-center gap-1"><Phone size={11} /> {activo.telefone}</span>}
                  {activo.assunto && <span>· {activo.assunto}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_BADGE[activo.estado] ?? ESTADO_BADGE.aberto}`}>
                  {ESTADO_LABEL[activo.estado] ?? activo.estado}
                </span>
                <select value={activo.estado} onChange={(e) => mudarEstado(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300">
                  <option value="aberto">Marcar aberto</option>
                  <option value="em_curso">Em curso</option>
                  <option value="fechado">Fechar</option>
                </select>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {mensagens.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">Sem mensagens ainda.</p>
              ) : mensagens.map((m) => {
                const meu = m.autor === "admin";
                return (
                  <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[65%] px-3.5 py-2 rounded-2xl text-sm leading-snug
                      ${meu ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"}`}>
                      {!meu && <p className="text-[10px] font-semibold text-gray-500 mb-0.5">{m.autor_nome}</p>}
                      <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                      <p className={`text-[10px] mt-1 flex items-center gap-1 ${meu ? "text-blue-100" : "text-gray-400"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {meu && (m.lida_em ? <CheckCheck size={11} /> : <Check size={11} />)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={enviar} className="bg-white border-t p-3 flex items-center gap-2">
              <input
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
                placeholder={activo.estado === "fechado" ? "Conversa fechada — abre para responder" : "Resposta..."}
                disabled={activo.estado === "fechado"}
                className="flex-1 px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
              />
              <button type="submit" disabled={enviando || !novoTexto.trim() || activo.estado === "fechado"}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
                {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
