import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, UserPlus, Camera, X, AlertCircle, KeyRound, Eye, EyeOff, CheckCircle, Printer, Filter, ChevronDown } from "lucide-react";
import api from "../../services/api";
import { useCachedApi } from "../../hooks/useCachedApi";
import { searchAlunosLocal, getAllAlunosLocal } from "../../offline/alunos";

function Avatar({ aluno, size = "md", onUpload }) {
  const ref = useRef();
  const sz = size === "lg" ? "w-12 h-12 text-sm" : "w-9 h-9 text-xs";
  const fotoUrl = aluno.foto ? `/storage/${aluno.foto}?t=${aluno._bust ?? 0}` : null;
  const handleClick = () => onUpload && ref.current?.click();
  return (
    <div className="relative group" style={{ display: "inline-flex" }}>
      <div
        className={`${sz} rounded-full flex items-center justify-center font-bold flex-shrink-0 overflow-hidden ${fotoUrl ? "" : "bg-blue-100 text-blue-700"} ${onUpload ? "cursor-pointer" : ""}`}
        onClick={handleClick}
      >
        {fotoUrl
          ? <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
          : (aluno.user?.nome?.[0] ?? "?").toUpperCase()
        }
        {onUpload && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera size={14} className="text-white" />
          </div>
        )}
      </div>
      {onUpload && <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />}
    </div>
  );
}

function matriculaActiva(aluno) {
  return aluno.matriculas?.find(m => m.status === "activa") ?? aluno.matriculas?.[0] ?? null;
}

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";
const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

function printLista(alunos, filtros, escolaNome, logoUrl) {
  const rows = alunos.map((a, i) => {
    const mat   = matriculaActiva(a);
    const turma = mat?.turma;
    const turno = turma?.turnoObj?.nome ?? turma?.turno ?? "—";
    return `<tr>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;text-align:center;font-family:monospace;font-size:11px">${i+1}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;font-family:monospace;font-size:11px;color:#64748b">${a.numero_aluno ?? ""}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;font-weight:600">${a.user?.nome ?? ""}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;color:#475569">${turma?.classe?.curso?.nome ?? "—"}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;color:#475569">${turma?.classe?.nome ?? "—"}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;color:#475569">${turma?.nome ?? "—"}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;color:#475569">${turno}</td>
      <td style="border:1px solid #e2e8f0;padding:4px 8px;color:#475569;text-align:center">${mat?.status ?? "—"}</td>
    </tr>`;
  }).join("");
  const filtroDesc = Object.entries(filtros).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(" | ");
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px" onerror="this.style.display='none'">` : "";
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Lista de Alunos</title>
    <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}table{border-collapse:collapse;width:100%}
    thead tr{background:#1e293b;color:#fff}th{padding:6px 8px;text-align:left;font-size:11px}
    tbody tr:nth-child(even){background:#f8fafc}@media print{button{display:none}}</style>
  </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
      <div style="display:flex;align-items:center">
        ${logoHtml}
        <div>
          ${escolaNome ? `<p style="margin:0 0 2px;font-weight:bold;font-size:13px">${escolaNome}</p>` : ""}
          <h2 style="margin:0">Lista de Alunos</h2>
          ${filtroDesc ? `<p style="margin:4px 0;color:#64748b;font-size:11px">${filtroDesc}</p>` : ""}
          <p style="margin:4px 0;color:#94a3b8;font-size:10px">Total: ${alunos.length} alunos &nbsp;|&nbsp; ${new Date().toLocaleDateString("pt-PT")}</p>
        </div>
      </div>
      <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer">Imprimir</button>
    </div>
    <table><thead><tr>
      <th style="width:36px">Nº</th><th style="width:80px">Código</th><th>Nome Completo</th>
      <th>Curso</th><th>Classe</th><th>Turma</th><th>Turno</th><th style="width:80px">Estado</th>
    </tr></thead><tbody>${rows}</tbody></table>
  </body></html>`);
  w.document.close();
}

export default function Alunos() {
  const [alunos,      setAlunos]      = useState([]);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [showFiltros, setShowFiltros] = useState(false);

  // Filtros avançados — dropdowns lidos via useCachedApi (cache local quando
  // offline, evita ficarem vazios e impedirem a aplicação de filtros).
  const { data: turmasRaw }   = useCachedApi("/turmas");
  const { data: cursosRaw }   = useCachedApi("/cursos");
  const { data: classesRaw }  = useCachedApi("/classes");
  const { data: turnosRaw }   = useCachedApi("/turnos");
  const turmas   = Array.isArray(turmasRaw)  ? turmasRaw  : (turmasRaw?.data ?? []);
  const cursos   = Array.isArray(cursosRaw)  ? cursosRaw  : (cursosRaw?.data ?? []);
  const classes  = Array.isArray(classesRaw) ? classesRaw : (classesRaw?.data ?? []);
  const turnos   = Array.isArray(turnosRaw)  ? turnosRaw  : (turnosRaw?.data ?? []);
  const [filtro, setFiltro] = useState({
    turma_id: "", curso_id: "", classe_id: "", turno_id: "", status: "", genero: "", ano_letivo: ""
  });

  const [form, setForm] = useState({
    nome:"", email:"", telefone:"", data_nascimento:"", genero:"",
    nome_pai:"", nome_mae:"", telefone_responsavel:"", email_responsavel:"", endereco:""
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const [senhaModal,   setSenhaModal]   = useState(null);
  const [senhaForm,    setSenhaForm]    = useState({ password: "", password_confirmation: "" });
  const [showSenha,    setShowSenha]    = useState(false);
  const [savingSenha,  setSavingSenha]  = useState(false);
  const [msgSenha,     setMsgSenha]     = useState(null);
  const [meta,         setMeta]         = useState(null);
  const [escola,       setEscola]       = useState(null);

  // Escola: mantida em api.get porque hoje só serve para o cabeçalho do PDF de impressão
  // — uma falha offline é tolerável (PDF não é uso primário).
  useEffect(() => {
    api.get("/configuracoes/escola").then(r => setEscola(r.data)).catch(() => {});
  }, []);

  const load = useCallback(async (q = search, f = filtro) => {
    setLoading(true);
    const params = { search: q, per_page: 100, ...Object.fromEntries(Object.entries(f).filter(([,v]) => v)) };
    try {
      const { data } = await api.get("/alunos", { params });
      setAlunos(data.data || data);
      setMeta(data.meta ?? null);
    } catch (e) {
      if (!e?.response) {
        // Sem rede → snapshot local. Filtros do servidor não se aplicam ao
        // snapshot enxuto; só filtramos por busca textual. O operador vê
        // todos os alunos cacheados (com aviso no canto via OfflineBanner).
        try {
          const locais = q
            ? await searchAlunosLocal(q, 200, { rich: true })
            : await getAllAlunosLocal({ limit: 200 });
          setAlunos(locais);
          setMeta({ total: locais.length, _offline: true });
        } catch {
          setAlunos([]); setMeta(null);
        }
      } else {
        setError(e.response?.data?.message || "Erro a carregar alunos.");
      }
    } finally {
      setLoading(false);
    }
  }, [search, filtro]);

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => { e.preventDefault(); load(search, filtro); };
  const handleFiltroChange = (key, val) => {
    const f = { ...filtro, [key]: val };
    setFiltro(f);
  };
  const aplicarFiltros = () => { load(search, filtro); setShowFiltros(false); };
  const limparFiltros  = () => {
    const f = { turma_id: "", curso_id: "", classe_id: "", turno_id: "", status: "", genero: "", ano_letivo: "" };
    setFiltro(f); load(search, f);
  };
  const filtrosActivos = Object.values(filtro).some(v => v);

  const abrirSenha = (aluno) => { setSenhaModal(aluno); setSenhaForm({ password: "", password_confirmation: "" }); setMsgSenha(null); setShowSenha(false); };

  const handleConfirmarMatricula = async (matriculaId, alunoNome) => {
    if (!confirm(`Confirmar matrícula de ${alunoNome}?`)) return;
    try {
      await api.patch(`/matriculas/${matriculaId}/confirmar`);
      load();
    } catch (err) {
      const faltam = err.response?.data?.documentos_em_falta;
      if (err.response?.status === 422 && Array.isArray(faltam) && faltam.length) {
        const msg = `Faltam documentos obrigatórios para ${alunoNome}:\n\n  • ${faltam.join("\n  • ")}\n\nForçar a confirmação mesmo assim?`;
        if (!confirm(msg)) return;
        try {
          await api.patch(`/matriculas/${matriculaId}/confirmar?forcar=1`);
          load();
        } catch (e2) {
          alert(e2.response?.data?.message || "Erro ao forçar confirmação.");
        }
        return;
      }
      alert(err.response?.data?.message || "Erro ao confirmar matrícula.");
    }
  };

  const handleDefinirSenha = async (e) => {
    e.preventDefault();
    if (senhaForm.password !== senhaForm.password_confirmation) { setMsgSenha({ type: "error", text: "As senhas não coincidem." }); return; }
    setSavingSenha(true); setMsgSenha(null);
    try {
      const res = await api.patch(`/alunos/${senhaModal.id}/definir-senha`, senhaForm);
      setMsgSenha({ type: "success", text: res.data.message });
      setSenhaForm({ password: "", password_confirmation: "" });
    } catch (err) { setMsgSenha({ type: "error", text: err.response?.data?.message || "Erro ao definir senha." }); }
    finally { setSavingSenha(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await api.post("/alunos", form);
      setShowForm(false);
      setForm({ nome:"", email:"", telefone:"", data_nascimento:"", genero:"", nome_pai:"", nome_mae:"", telefone_responsavel:"", email_responsavel:"", endereco:"" });
      load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const handleUploadFoto = async (alunoId, file) => {
    setUploadingId(alunoId);
    try {
      const fd = new FormData(); fd.append("foto", file);
      const res = await api.post(`/alunos/${alunoId}/foto`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAlunos(prev => prev.map(a => a.id === alunoId ? { ...a, foto: res.data.foto_url.replace("/storage/", ""), _bust: Date.now() } : a));
    } catch {} finally { setUploadingId(null); }
  };

  const filtroLabels = { turma_id:"Turma", curso_id:"Curso", classe_id:"Classe", turno_id:"Turno", status:"Estado", genero:"Género", ano_letivo:"Ano Lectivo" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Alunos {meta ? <span className="text-base font-normal text-slate-400 ml-2">({meta.total ?? alunos.length})</span> : null}</h1>
        <div className="flex gap-2">
          <button onClick={() => printLista(alunos, Object.fromEntries(Object.entries(filtro).filter(([,v]) => v).map(([k,v]) => [filtroLabels[k]??k, v])), escola?.nome, escola?.logo ? `/storage/${escola.logo}` : null)}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-sm font-medium">
            <Printer size={15} /> Imprimir Lista
          </button>
          <Link to="/matriculas"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
            <UserPlus size={16} /> Nova Inscrição
          </Link>
        </div>
      </div>

      {/* Barra de pesquisa + filtros */}
      <div className="space-y-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar por nome ou email..."
              className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
          </div>
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">Pesquisar</button>
          <button type="button" onClick={() => setShowFiltros(s => !s)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              filtrosActivos ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Filter size={14} /> Filtros {filtrosActivos && <span className="w-2 h-2 rounded-full bg-blue-500" />}
            <ChevronDown size={12} className={`transition-transform ${showFiltros ? "rotate-180" : ""}`} />
          </button>
        </form>

        {/* Painel de filtros */}
        {showFiltros && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Turma</label>
                <select value={filtro.turma_id} onChange={e => handleFiltroChange("turma_id", e.target.value)} className={sel}>
                  <option value="">Todas</option>
                  {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Curso</label>
                <select value={filtro.curso_id} onChange={e => handleFiltroChange("curso_id", e.target.value)} className={sel}>
                  <option value="">Todos</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Classe</label>
                <select value={filtro.classe_id} onChange={e => handleFiltroChange("classe_id", e.target.value)} className={sel}>
                  <option value="">Todas</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Turno</label>
                <select value={filtro.turno_id} onChange={e => handleFiltroChange("turno_id", e.target.value)} className={sel}>
                  <option value="">Todos</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Estado Matrícula</label>
                <select value={filtro.status} onChange={e => handleFiltroChange("status", e.target.value)} className={sel}>
                  <option value="">Todos</option>
                  <option value="activa">Activa</option>
                  <option value="pendente">Pendente</option>
                  <option value="concluida">Concluída</option>
                  <option value="transferida">Transferida</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Género</label>
                <select value={filtro.genero} onChange={e => handleFiltroChange("genero", e.target.value)} className={sel}>
                  <option value="">Todos</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ano Lectivo</label>
                <input value={filtro.ano_letivo} onChange={e => handleFiltroChange("ano_letivo", e.target.value)} className={sel} placeholder="2025-2026" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={limparFiltros} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Limpar</button>
              <button onClick={aplicarFiltros} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl">Aplicar Filtros</button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-16">A carregar...</p>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Nº</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-52">Aluno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-44">Curso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Classe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Turma</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Turno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alunos.map((a) => {
                const mat   = matriculaActiva(a);
                const turma = mat?.turma;
                const turno = turma?.turnoObj?.nome ?? turma?.turno ?? "—";
                const cursoNome = turma?.classe?.curso?.nome ?? "—";
                const statusCls = {
                  activa:     "bg-emerald-50 text-emerald-700",
                  pendente:   "bg-amber-50 text-amber-700",
                  concluida:  "bg-blue-50 text-blue-700",
                  cancelada:  "bg-red-50 text-red-700",
                  transferida:"bg-purple-50 text-purple-700",
                }[mat?.status] ?? "bg-slate-100 text-slate-500";
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="relative">
                        <Avatar aluno={a} onUpload={(file) => handleUploadFoto(a.id, file)} />
                        {uploadingId === a.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">{a.numero_aluno}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 truncate">{a.user?.nome}</div>
                      <div className="text-xs text-slate-400 truncate">{a.user?.email}</div>
                    </td>
                    <td className="px-4 py-3"><span className="block truncate text-slate-600" title={cursoNome}>{cursoNome}</span></td>
                    <td className="px-4 py-3 text-slate-600 truncate">{turma?.classe?.nome ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 truncate">{turma?.nome ?? "—"}</td>
                    <td className="px-4 py-3">
                      {turno !== "—"
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">{turno}</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {mat?.status
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusCls}`}>{mat.status}</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link to={`/alunos/${a.id}`} className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium">Ver</Link>
                        {mat?.status === "pendente" && (
                          <button onClick={() => handleConfirmarMatricula(mat.id, a.user?.nome)} title="Confirmar matrícula"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button onClick={() => abrirSenha(a)} title="Definir senha"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                          <KeyRound size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {alunos.length === 0 && (
                <tr><td colSpan={9} className="text-center py-16 text-slate-400">Nenhum aluno encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal senha */}
      {senhaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div><h2 className="font-semibold text-slate-800">Definir Senha</h2><p className="text-xs text-slate-400 mt-0.5">{senhaModal.user?.nome}</p></div>
              <button onClick={() => setSenhaModal(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
            </div>
            {msgSenha && (
              <div className={`mx-5 mt-4 flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border ${msgSenha.type==="success"?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-red-50 text-red-700 border-red-200"}`}>
                {msgSenha.type==="success"?<CheckCircle size={14}/>:<AlertCircle size={14}/>} {msgSenha.text}
              </div>
            )}
            <form onSubmit={handleDefinirSenha} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Nova Senha</label>
                <div className="relative">
                  <input type={showSenha?"text":"password"} required minLength={6} value={senhaForm.password} onChange={e=>setSenhaForm({...senhaForm,password:e.target.value})} className={inp} placeholder="Mínimo 6 caracteres"/>
                  <button type="button" onClick={()=>setShowSenha(s=>!s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showSenha?<EyeOff size={15}/>:<Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar Senha</label>
                <input type={showSenha?"text":"password"} required minLength={6} value={senhaForm.password_confirmation} onChange={e=>setSenhaForm({...senhaForm,password_confirmation:e.target.value})} className={inp} placeholder="Repetir senha"/>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={()=>setSenhaModal(null)} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={savingSenha} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm font-medium flex items-center justify-center gap-1.5">
                  <KeyRound size={14}/>{savingSenha?"A guardar...":"Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal novo aluno */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Novo Aluno</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
            </div>
            {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2"><AlertCircle size={14}/>{error}</div>}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Nome Completo *</label><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className={inp}/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Email *</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className={inp}/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label><input value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} className={inp}/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Data Nasc.</label><input type="date" value={form.data_nascimento} onChange={e=>setForm({...form,data_nascimento:e.target.value})} className={inp}/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Género</label><select value={form.genero} onChange={e=>setForm({...form,genero:e.target.value})} className={inp}><option value="">Seleccionar</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option></select></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Tel. Responsável</label><input value={form.telefone_responsavel} onChange={e=>setForm({...form,telefone_responsavel:e.target.value})} className={inp}/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Email do Responsável</label><input type="email" value={form.email_responsavel} onChange={e=>setForm({...form,email_responsavel:e.target.value})} className={inp}/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Nome do Pai</label><input value={form.nome_pai} onChange={e=>setForm({...form,nome_pai:e.target.value})} className={inp}/></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Nome da Mãe</label><input value={form.nome_mae} onChange={e=>setForm({...form,nome_mae:e.target.value})} className={inp}/></div>
                <div className="col-span-2"><label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label><input value={form.endereco} onChange={e=>setForm({...form,endereco:e.target.value})} className={inp}/></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 text-sm font-medium">{saving?"A guardar...":"Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
