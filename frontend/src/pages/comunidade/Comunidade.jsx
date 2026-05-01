import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Pin, Trash2, Send, X, Globe, Users, CheckCircle2, MoreVertical } from "lucide-react";
import { comunidadeService } from "../../services/comunidadeService";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const fmtRelativo = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric" });
};
const iniciais = (n) => (n || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

function Avatar({ nome, foto, size = 36 }) {
  if (foto) return <img src={foto} alt={nome} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}>
      {iniciais(nome)}
    </div>
  );
}

function CartaoPost({ post, onAbrir, onGostar, onApagar, podeApagar }) {
  return (
    <div className={`bg-white rounded-2xl border ${post.fixado ? "border-amber-200" : "border-slate-100"} shadow-sm overflow-hidden`}>
      {post.fixado && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
          <Pin size={12}/> Fixado
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <Avatar nome={post.autor.nome} foto={post.autor.foto} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{post.autor.nome}</p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span className="capitalize">{post.autor.tipo}</span>
                  <span>·</span>
                  <span>{fmtRelativo(post.created_at)}</span>
                  {post.audiencia === "escola" && <><span>·</span><Globe size={10}/></>}
                  {post.audiencia === "turma" && post.turma && <><span>·</span><Users size={10}/><span>{post.turma.nome}</span></>}
                </p>
              </div>
              {podeApagar && (
                <button onClick={() => onApagar(post)} className="text-slate-300 hover:text-red-500 p-1 rounded" title="Apagar">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            {post.tipo === "forum" && post.titulo && (
              <h3 className="text-base font-semibold text-slate-800 mt-2">{post.titulo}</h3>
            )}
            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap break-words">{post.corpo}</p>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => onGostar(post)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  post.gostei ? "text-rose-600" : "text-slate-500 hover:text-rose-600"
                }`}
              >
                <Heart size={14} fill={post.gostei ? "currentColor" : "none"} />
                <span>{post.gostos}</span>
              </button>
              <button onClick={() => onAbrir(post)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600">
                <MessageCircle size={14} />
                <span>{post.comentarios}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditorPost({ turmaId, modoForum, onCriado, turmasUser }) {
  const [corpo, setCorpo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [audiencia, setAudiencia] = useState(turmaId ? "turma" : "escola");
  const [turmaSel, setTurmaSel] = useState(turmaId || "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const submeter = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!corpo.trim()) return;
    if (modoForum && !titulo.trim()) { setErro("Título obrigatório."); return; }
    if (audiencia === "turma" && !turmaSel) { setErro("Escolha a turma."); return; }

    setEnviando(true);
    try {
      const payload = {
        tipo: modoForum ? "forum" : "post",
        audiencia,
        turma_id: audiencia === "turma" ? Number(turmaSel) : null,
        titulo: modoForum ? titulo.trim() : null,
        corpo: corpo.trim(),
      };
      const novo = await comunidadeService.criar(payload);
      onCriado(novo);
      setCorpo(""); setTitulo("");
    } catch (e) {
      setErro(e?.response?.data?.message || "Erro ao publicar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={submeter} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        {modoForum ? "Novo tópico de fórum" : "Partilhar com a comunidade"}
      </p>
      {modoForum && (
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do tópico..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      )}
      <textarea
        value={corpo}
        onChange={(e) => setCorpo(e.target.value)}
        rows={3}
        placeholder={modoForum ? "Descreva a sua dúvida ou tema..." : "O que se passa?"}
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
      />
      {!modoForum && (
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-slate-500">Visível para:</label>
          <select
            value={audiencia}
            onChange={(e) => setAudiencia(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50"
          >
            <option value="escola">Toda a escola</option>
            <option value="turma">Uma turma</option>
          </select>
          {audiencia === "turma" && (
            <select
              value={turmaSel}
              onChange={(e) => setTurmaSel(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50"
            >
              <option value="">— escolher turma —</option>
              {turmasUser.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {erro && <p className="text-xs text-rose-600">{erro}</p>}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={!corpo.trim() || enviando}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
        >
          <Send size={14} /> {enviando ? "A publicar..." : "Publicar"}
        </button>
      </div>
    </form>
  );
}

function ModalDetalhe({ postId, modoForum, onClose, onAlterado }) {
  const { user } = useAuthStore();
  const [det, setDet] = useState(null);
  const [load, setLoad] = useState(true);
  const [novoComentario, setNovoComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const carregar = () => {
    setLoad(true);
    comunidadeService.show(postId)
      .then(setDet)
      .finally(() => setLoad(false));
  };

  useEffect(() => { carregar(); }, [postId]);

  const podeAceitar = modoForum && det?.post && (user?.id === det.post.autor?.id || user?.tipo === "admin");

  const gostar = async () => {
    const r = await comunidadeService.gostar(postId);
    setDet({ ...det, post: { ...det.post, gostos: r.gostos, gostei: r.gostei } });
    onAlterado?.();
  };
  const comentar = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;
    setEnviando(true);
    try {
      const c = await comunidadeService.comentar(postId, novoComentario.trim());
      setDet({
        ...det,
        post: { ...det.post, comentarios: det.post.comentarios + 1 },
        comentarios: [...det.comentarios, c],
      });
      setNovoComentario("");
      onAlterado?.();
    } finally { setEnviando(false); }
  };
  const apagarCom = async (cid) => {
    if (!confirm("Apagar comentário?")) return;
    await comunidadeService.apagarComentario(cid);
    setDet({
      ...det,
      post: { ...det.post, comentarios: Math.max(0, det.post.comentarios - 1) },
      comentarios: det.comentarios.filter((c) => c.id !== cid),
    });
    onAlterado?.();
  };
  const aceitar = async (cid) => {
    const r = await comunidadeService.aceitar(postId, cid);
    setDet({
      ...det,
      post: { ...det.post, resposta_aceite_id: r.resposta_aceite_id },
      comentarios: det.comentarios.map((c) => ({ ...c, aceite: c.id === r.resposta_aceite_id })),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">{modoForum ? "Tópico" : "Publicação"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {load && <p className="text-center text-xs text-slate-400 py-8">A carregar...</p>}
          {!load && det && (
            <>
              <div className="flex items-start gap-3">
                <Avatar nome={det.post.autor.nome} foto={det.post.autor.foto} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{det.post.autor.nome}</p>
                  <p className="text-[11px] text-slate-400">
                    <span className="capitalize">{det.post.autor.tipo}</span> · {fmtRelativo(det.post.created_at)}
                  </p>
                  {det.post.titulo && <h2 className="text-lg font-semibold text-slate-800 mt-2">{det.post.titulo}</h2>}
                  <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap break-words">{det.post.corpo}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <button onClick={gostar}
                      className={`flex items-center gap-1.5 text-xs font-medium ${det.post.gostei ? "text-rose-600" : "text-slate-500 hover:text-rose-600"}`}>
                      <Heart size={14} fill={det.post.gostei ? "currentColor" : "none"} />
                      <span>{det.post.gostos}</span>
                    </button>
                    <span className="text-xs text-slate-500 flex items-center gap-1.5">
                      <MessageCircle size={14}/> {det.post.comentarios}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Comentários</p>
                {det.comentarios.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sem comentários ainda.</p>
                )}
                {det.comentarios.map((c) => {
                  const meu = c.autor.id === user?.id;
                  const podeApagar = meu || user?.tipo === "admin";
                  return (
                    <div key={c.id} className={`flex items-start gap-3 p-3 rounded-xl ${c.aceite ? "bg-emerald-50 border border-emerald-100" : ""}`}>
                      <Avatar nome={c.autor.nome} foto={c.autor.foto} size={32}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            {c.autor.nome}
                            {c.aceite && <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12}/> resposta aceite</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{fmtRelativo(c.created_at)}</span>
                            {podeAceitar && (
                              <button onClick={() => aceitar(c.id)} title={c.aceite ? "Remover aceite" : "Marcar como aceite"}
                                className={`text-xs ${c.aceite ? "text-emerald-600" : "text-slate-300 hover:text-emerald-600"}`}>
                                <CheckCircle2 size={14}/>
                              </button>
                            )}
                            {podeApagar && (
                              <button onClick={() => apagarCom(c.id)} className="text-slate-300 hover:text-red-500" title="Apagar">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{c.corpo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <form onSubmit={comentar} className="border-t border-slate-100 p-3 flex items-end gap-2 shrink-0">
          <textarea
            value={novoComentario}
            onChange={(e) => setNovoComentario(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); comentar(e); } }}
            rows={1}
            placeholder="Escreva um comentário..."
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none max-h-32"
          />
          <button type="submit" disabled={!novoComentario.trim() || enviando}
            className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shrink-0">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Comunidade({ turmaId = null, modoForum = false }) {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState([]);
  const [load, setLoad] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(true);
  const [postAberto, setPostAberto] = useState(null);
  const [turmasUser, setTurmasUser] = useState([]);
  const sentinelRef = useRef(null);

  const carregar = async () => {
    setLoad(true);
    try {
      const data = modoForum
        ? await comunidadeService.forumTurma(turmaId)
        : await comunidadeService.feed();
      setPosts(data || []);
      setTemMais((data || []).length === 20);
    } finally { setLoad(false); }
  };

  useEffect(() => { carregar(); }, [turmaId, modoForum]);

  // Lista de turmas para o selector de audiência (não-fórum)
  useEffect(() => {
    if (modoForum) return;
    if (user?.tipo === "aluno") {
      api.get("/portal/me").then(r => {
        const t = r.data?.turma_actual;
        if (t) setTurmasUser([{ id: t.id, nome: t.nome }]);
      }).catch(() => {});
    } else if (user?.tipo === "professor") {
      api.get("/portal/professor/me").then(r => {
        setTurmasUser(r.data?.turmas || []);
      }).catch(() => {});
    } else {
      api.get("/turmas").then(r => setTurmasUser(r.data || [])).catch(() => {});
    }
  }, [modoForum, user?.tipo]);

  const carregarMais = async () => {
    if (carregandoMais || !temMais || posts.length === 0) return;
    setCarregandoMais(true);
    try {
      const antes = posts[posts.length - 1].id;
      const novos = modoForum
        ? await comunidadeService.forumTurma(turmaId, antes)
        : await comunidadeService.feed(antes);
      if ((novos || []).length < 20) setTemMais(false);
      setPosts([...posts, ...(novos || [])]);
    } finally { setCarregandoMais(false); }
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) carregarMais();
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [posts, temMais, carregandoMais]);

  const onCriado = (novo) => setPosts([novo, ...posts]);
  const onGostar = async (p) => {
    const r = await comunidadeService.gostar(p.id);
    setPosts(posts.map((x) => x.id === p.id ? { ...x, gostos: r.gostos, gostei: r.gostei } : x));
  };
  const onApagar = async (p) => {
    if (!confirm("Apagar publicação?")) return;
    await comunidadeService.apagar(p.id);
    setPosts(posts.filter((x) => x.id !== p.id));
  };
  const podeApagarPost = (p) => p.podeEditar || user?.tipo === "admin";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{modoForum ? "Fórum da turma" : "Comunidade Educaja"}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {modoForum ? "Tópicos e dúvidas dos colegas e professores." : "Partilhe e veja o que se passa na escola."}
        </p>
      </div>

      <EditorPost turmaId={turmaId} modoForum={modoForum} onCriado={onCriado} turmasUser={turmasUser} />

      {load && <p className="text-center text-xs text-slate-400 py-8">A carregar...</p>}

      {!load && posts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <p className="text-sm text-slate-400">{modoForum ? "Nenhum tópico ainda. Seja o primeiro!" : "Sem publicações ainda."}</p>
        </div>
      )}

      {posts.map((p) => (
        <CartaoPost
          key={p.id}
          post={p}
          onAbrir={() => setPostAberto(p)}
          onGostar={onGostar}
          onApagar={onApagar}
          podeApagar={podeApagarPost(p)}
        />
      ))}

      {!load && posts.length > 0 && (
        <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
          {carregandoMais ? "A carregar mais..." : (!temMais && "— fim do feed —")}
        </div>
      )}

      {postAberto && (
        <ModalDetalhe
          postId={postAberto.id}
          modoForum={postAberto.tipo === "forum"}
          onClose={() => setPostAberto(null)}
          onAlterado={() => carregar()}
        />
      )}
    </div>
  );
}
