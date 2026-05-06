import { useEffect, useRef, useState } from "react";
import { centralApi } from "../../services/api";
import { MessageCircle, X, Send, Loader2, Check, CheckCheck } from "lucide-react";

const STORAGE_TOKEN = "site_chat_token";
const STORAGE_NOME  = "site_chat_nome";
const POLL_MS = 5000;

export default function SiteChatWidget() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN) || "");
  const [chat, setChat]   = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novoTexto, setNovoTexto] = useState("");
  const [enviando, setEnviando]   = useState(false);
  const [erro, setErro]           = useState("");
  const naoLidasRef = useRef(0);
  const [naoLidas, setNaoLidas] = useState(0);
  const scrollRef = useRef(null);

  // form inicial
  const [form, setForm] = useState(() => ({
    nome: localStorage.getItem(STORAGE_NOME) || "",
    email: "",
    telefone: "",
    assunto: "",
    mensagem: "",
    website: "",
  }));

  useEffect(() => {
    if (!token) return;
    let cancel = false;
    let lastId = 0;
    async function tick() {
      try {
        const url = `/site/chat/${token}/mensagens` + (lastId ? `?desde=${lastId}` : "");
        const { data } = await centralApi.get(url);
        if (cancel) return;
        if (data.chat) setChat(data.chat);
        if (Array.isArray(data.mensagens) && data.mensagens.length) {
          setMensagens((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const novos = data.mensagens.filter((m) => !ids.has(m.id));
            const next = [...prev, ...novos];
            lastId = next.length ? next[next.length - 1].id : lastId;
            return next;
          });
          // contagem para badge quando widget fechado
          if (!open) {
            const novosAdmin = data.mensagens.filter((m) => m.autor === "admin").length;
            if (novosAdmin > 0) {
              naoLidasRef.current += novosAdmin;
              setNaoLidas(naoLidasRef.current);
            }
          }
        }
      } catch (e) {
        // token inválido → limpa
        if (e?.response?.status === 404) {
          localStorage.removeItem(STORAGE_TOKEN);
          setToken("");
          setChat(null);
          setMensagens([]);
        }
      }
    }
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { cancel = true; clearInterval(id); };
  }, [token, open]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (open) {
      naoLidasRef.current = 0;
      setNaoLidas(0);
    }
  }, [open, mensagens.length]);

  async function iniciarConversa(e) {
    e.preventDefault();
    setErro("");
    if (!form.nome.trim() || !form.mensagem.trim()) {
      setErro("Indica o teu nome e a mensagem.");
      return;
    }
    setEnviando(true);
    try {
      const { data } = await centralApi.post("/site/chat/iniciar", form);
      localStorage.setItem(STORAGE_TOKEN, data.token);
      localStorage.setItem(STORAGE_NOME, form.nome);
      setToken(data.token);
      setMensagens([{
        id: 0,
        autor: "visitante",
        autor_nome: form.nome,
        texto: form.mensagem,
        created_at: new Date().toISOString(),
      }]);
      setForm((f) => ({ ...f, mensagem: "" }));
    } catch (e) {
      setErro(e?.response?.data?.message || "Não foi possível iniciar. Tenta novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarMensagem(e) {
    e?.preventDefault();
    const texto = novoTexto.trim();
    if (!texto || !token) return;
    setEnviando(true);
    try {
      const { data } = await centralApi.post(`/site/chat/${token}/mensagens`, { texto });
      setMensagens((prev) => [...prev, data]);
      setNovoTexto("");
    } catch (e) {
      setErro(e?.response?.data?.message || "Falha ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    localStorage.removeItem(STORAGE_TOKEN);
    setToken("");
    setChat(null);
    setMensagens([]);
    setForm({ nome: localStorage.getItem(STORAGE_NOME) || "", email: "", telefone: "", assunto: "", mensagem: "", website: "" });
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir chat"
          className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-300 flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageCircle size={22} />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-[360px] max-w-[calc(100vw-1.5rem)] h-[520px] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Suporte Educajá</p>
              <p className="text-[11px] text-blue-100">Tipicamente respondemos em minutos</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          {!token ? (
            <form onSubmit={iniciarConversa} className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-slate-500">Olá! Deixa o teu contacto e a tua questão — respondemos pelo chat e/ou email.</p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nome *</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    placeholder="9XX XXX XXX"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assunto</label>
                <input value={form.assunto} onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                  placeholder="Ex: Demonstração, preços, suporte…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mensagem *</label>
                <textarea rows={4} value={form.mensagem} onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              {/* honeypot */}
              <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                tabIndex={-1} autoComplete="off"
                className="hidden" aria-hidden="true" />
              {erro && <p className="text-xs text-red-600">{erro}</p>}
              <button type="submit" disabled={enviando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
                Iniciar conversa
              </button>
            </form>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
                {mensagens.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-6">A carregar conversa…</div>
                )}
                {mensagens.map((m) => {
                  const meu = m.autor === "visitante";
                  return (
                    <div key={m.id || `${m.autor}-${m.created_at}`}
                      className={`flex ${meu ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-snug
                        ${meu ? "bg-blue-600 text-white rounded-br-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"}`}>
                        {!meu && <p className="text-[10px] font-semibold text-blue-700 mb-0.5">{m.autor_nome || "Suporte"}</p>}
                        <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                        <p className={`text-[10px] mt-1 flex items-center gap-1 ${meu ? "text-blue-100" : "text-slate-400"}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {meu && (m.lida_em ? <CheckCheck size={11} /> : <Check size={11} />)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {chat?.estado === "fechado" ? (
                <div className="border-t bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                  Esta conversa foi encerrada. <button onClick={reiniciar} className="font-semibold underline">Iniciar nova</button>
                </div>
              ) : (
                <form onSubmit={enviarMensagem} className="border-t bg-white p-2 flex items-center gap-2">
                  <input
                    value={novoTexto}
                    onChange={(e) => setNovoTexto(e.target.value)}
                    placeholder="Escreve a tua mensagem…"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button type="submit" disabled={enviando || !novoTexto.trim()}
                    className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center justify-center">
                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </form>
              )}

              <div className="px-3 py-1.5 text-[10px] text-slate-400 border-t bg-white text-right">
                <button onClick={reiniciar} className="hover:text-slate-600">Iniciar nova conversa</button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
