import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Send, Plus, X, MessageSquare, Users } from "lucide-react";
import { chatService } from "../../services/chatService";
import { useSondagemChat } from "../../hooks/useSondagemChat";
import { useAuthStore } from "../../store/auth";

const fmtHora = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" });
};
const fmtDia = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return fmtHora(iso);
  return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit" });
};
const iniciais = (n) =>
  (n || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Avatar({ nome, foto, size = 40 }) {
  if (foto) {
    return (
      <img
        src={foto}
        alt={nome}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {iniciais(nome)}
    </div>
  );
}

function NovaConversaModal({ onClose, onAberta }) {
  const [busca, setBusca] = useState("");
  const [contactos, setContactos] = useState([]);
  const [load, setLoad] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setLoad(true);
    const t = setTimeout(() => {
      chatService.contactos(busca).then((d) => {
        if (!cancelado) setContactos(d || []);
      }).finally(() => !cancelado && setLoad(false));
    }, 200);
    return () => { cancelado = true; clearTimeout(t); };
  }, [busca]);

  const iniciar = async (userId) => {
    const r = await chatService.iniciarPrivada(userId);
    onAberta(r.id);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Nova conversa</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar utilizador..."
              className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {load && <p className="p-6 text-center text-xs text-slate-400">A procurar...</p>}
          {!load && contactos.length === 0 && <p className="p-6 text-center text-xs text-slate-400">Sem resultados.</p>}
          {!load && contactos.map((u) => (
            <button
              key={u.id}
              onClick={() => iniciar(u.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
            >
              <Avatar nome={u.nome} foto={u.foto} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{u.nome}</p>
                <p className="text-xs text-slate-400 capitalize">{u.tipo}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversas, setConversas] = useState([]);
  const [activaId, setActivaId] = useState(null);
  const [activa, setActiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [carregandoMsgs, setCarregandoMsgs] = useState(false);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [temMaisAntigas, setTemMaisAntigas] = useState(true);
  const [corpo, setCorpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [novaModal, setNovaModal] = useState(false);
  const fimRef = useRef(null);
  const listaMsgsRef = useRef(null);

  const carregarConversas = async () => {
    const data = await chatService.conversas();
    setConversas(data || []);
  };

  const carregarConversaActiva = async (id, scrollFundo = true) => {
    setCarregandoMsgs(true);
    try {
      const [det, msgs] = await Promise.all([
        chatService.showConversa(id),
        chatService.mensagens(id),
      ]);
      setActiva(det);
      setMensagens(msgs || []);
      setTemMaisAntigas((msgs || []).length === 50);
      await chatService.marcarLida(id);
      if (scrollFundo) setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "instant" }), 50);
    } finally {
      setCarregandoMsgs(false);
    }
  };

  useEffect(() => { carregarConversas(); }, []);

  // Auto-selecciona conversa via ?conversa=id (ex: vinda de TurmaDetalhe)
  useEffect(() => {
    const id = searchParams.get("conversa");
    if (id) {
      setActivaId(Number(id));
      searchParams.delete("conversa");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (activaId) carregarConversaActiva(activaId);
    else { setActiva(null); setMensagens([]); }
  }, [activaId]);

  useSondagemChat({
    activo: true,
    onAlteradas: (alteradas) => {
      const ids = new Set(alteradas.map((a) => a.id));
      // Se a conversa aberta tem novidades, recarrega só as mensagens
      if (activaId && ids.has(activaId)) {
        chatService.mensagens(activaId).then((msgs) => {
          setMensagens(msgs || []);
          chatService.marcarLida(activaId);
          setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        });
      }
      // Sempre actualiza a barra lateral
      carregarConversas();
    },
  });

  const carregarMaisAntigas = async () => {
    if (!activaId || carregandoAntigas || !temMaisAntigas || mensagens.length === 0) return;
    setCarregandoAntigas(true);
    try {
      const antes = mensagens[0].id;
      const novas = await chatService.mensagens(activaId, antes);
      if ((novas || []).length === 0) setTemMaisAntigas(false);
      else {
        if (novas.length < 50) setTemMaisAntigas(false);
        setMensagens([...novas, ...mensagens]);
      }
    } finally {
      setCarregandoAntigas(false);
    }
  };

  const onScrollMsgs = (e) => {
    if (e.target.scrollTop < 40) carregarMaisAntigas();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (!corpo.trim() || !activaId || enviando) return;
    setEnviando(true);
    try {
      const nova = await chatService.enviar(activaId, corpo.trim());
      setMensagens((ms) => [...ms, nova]);
      setCorpo("");
      carregarConversas();
      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
    } finally {
      setEnviando(false);
    }
  };

  const conversasOrdenadas = useMemo(() => {
    return [...conversas].sort((a, b) => {
      const ta = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0;
      const tb = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0;
      return tb - ta;
    });
  }, [conversas]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex h-[calc(100vh-7rem)]">
      {/* Lista de conversas */}
      <aside className="w-80 border-r border-slate-100 flex flex-col shrink-0">
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Conversas</h2>
          <button
            onClick={() => setNovaModal(true)}
            className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600"
            title="Nova conversa"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversasOrdenadas.length === 0 && (
            <div className="p-8 text-center">
              <MessageSquare className="mx-auto text-slate-300" size={28} />
              <p className="text-xs text-slate-400 mt-2">Sem conversas ainda.</p>
              <button
                onClick={() => setNovaModal(true)}
                className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Iniciar a primeira
              </button>
            </div>
          )}
          {conversasOrdenadas.map((c) => {
            const activo = c.id === activaId;
            const isTurma = c.tipo === "turma";
            return (
              <button
                key={c.id}
                onClick={() => setActivaId(c.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-slate-50 text-left transition-colors ${
                  activo ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                {isTurma ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                    <Users size={16} />
                  </div>
                ) : (
                  <Avatar
                    nome={c.titulo}
                    foto={c.participantes?.find((p) => p.id !== user?.id)?.foto}
                    size={40}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${activo ? "text-blue-700 font-semibold" : "text-slate-800 font-medium"}`}>
                      {c.titulo}
                    </p>
                    <span className="text-[10px] text-slate-400 shrink-0">{fmtDia(c.ultima_mensagem_em)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate">
                      {c.ultima_mensagem
                        ? (c.ultima_mensagem.autor_id === user?.id ? "Eu: " : "") + c.ultima_mensagem.corpo
                        : "Sem mensagens"}
                    </p>
                    {c.nao_lidas > 0 && (
                      <span className="text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center shrink-0">
                        {c.nao_lidas}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Janela da conversa */}
      <section className="flex-1 flex flex-col min-w-0">
        {!activa ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare size={48} strokeWidth={1.2} />
            <p className="text-sm mt-3">Seleccione uma conversa para começar.</p>
          </div>
        ) : (
          <>
            <header className="h-14 px-5 border-b border-slate-100 flex items-center gap-3 shrink-0">
              {activa.tipo === "turma" ? (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                  <Users size={14} />
                </div>
              ) : (
                <Avatar
                  nome={activa.titulo}
                  foto={activa.participantes?.find((p) => p.id !== user?.id)?.foto}
                  size={36}
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{activa.titulo}</p>
                <p className="text-[11px] text-slate-400">
                  {activa.tipo === "turma"
                    ? `${activa.participantes?.length || 0} participantes`
                    : (activa.participantes?.find((p) => p.id !== user?.id)?.tipo || "")}
                </p>
              </div>
            </header>

            <div
              ref={listaMsgsRef}
              onScroll={onScrollMsgs}
              className="flex-1 overflow-y-auto bg-slate-50 px-5 py-4 space-y-2"
            >
              {carregandoAntigas && (
                <p className="text-center text-[11px] text-slate-400 py-2">A carregar mensagens antigas...</p>
              )}
              {!temMaisAntigas && mensagens.length > 0 && (
                <p className="text-center text-[11px] text-slate-300 py-2">— início da conversa —</p>
              )}
              {carregandoMsgs && mensagens.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">A carregar...</p>
              )}
              {!carregandoMsgs && mensagens.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-8">Diga olá &mdash; envie a primeira mensagem.</p>
              )}
              {mensagens.map((m, i) => {
                const meu = m.user_id === user?.id;
                const anterior = mensagens[i - 1];
                const mostraAutor = !meu && (!anterior || anterior.user_id !== m.user_id);
                return (
                  <div key={m.id} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] ${meu ? "items-end" : "items-start"} flex flex-col`}>
                      {mostraAutor && activa.tipo === "turma" && (
                        <span className="text-[10px] text-slate-500 px-3 mb-0.5">{m.autor?.nome}</span>
                      )}
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          meu
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
                        }`}
                      >
                        {m.corpo}
                      </div>
                      <span className={`text-[10px] mt-0.5 px-2 ${meu ? "text-slate-400" : "text-slate-400"}`}>
                        {fmtHora(m.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={fimRef} />
            </div>

            <form onSubmit={enviar} className="border-t border-slate-100 p-3 flex items-end gap-2 shrink-0">
              <textarea
                value={corpo}
                onChange={(e) => setCorpo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e); }
                }}
                rows={1}
                placeholder="Escreva uma mensagem..."
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none max-h-32"
              />
              <button
                type="submit"
                disabled={!corpo.trim() || enviando}
                className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shrink-0"
                title="Enviar"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </section>

      {novaModal && (
        <NovaConversaModal
          onClose={() => setNovaModal(false)}
          onAberta={(id) => { setNovaModal(false); setActivaId(id); carregarConversas(); }}
        />
      )}
    </div>
  );
}
