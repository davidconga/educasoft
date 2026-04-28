import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  BookOpen, CreditCard, AlertCircle, Users, KeyRound, CheckCircle, RotateCcw, Eye, EyeOff,
  Camera, Upload, X, ImageIcon, RefreshCw,
} from "lucide-react";
import api from "../../services/api";

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={14} className="text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Badge({ children, color = "slate" }) {
  const colors = {
    slate:   "bg-slate-100 text-slate-600",
    blue:    "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber:   "bg-amber-50 text-amber-700",
    rose:    "bg-rose-50 text-rose-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

function FotoCard({ alunoId, fotoInicial, onUpdate }) {
  const fileRef   = useRef();
  const videoRef  = useRef();
  const canvasRef = useRef();
  const streamRef = useRef(null);

  const [fotoUrl,   setFotoUrl]   = useState(fotoInicial ? `/storage/${fotoInicial}` : null);
  const [cacheBust, setCacheBust] = useState(() => Date.now());
  const [preview,   setPreview]   = useState(null);
  const [file,      setFile]      = useState(null);
  const [camera,    setCamera]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg,       setMsg]       = useState(null);

  const handleFileChange = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
    setMsg(null);
  };

  const openCamera = async () => {
    setMsg(null);
    setCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode:"user", width:640, height:480 } });
      streamRef.current = stream;
      // wait for modal to render then assign stream
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
    } catch {
      setMsg({ type:"error", text:"Não foi possível aceder à câmara. Verifique as permissões do browser." });
      setCamera(false);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamera(false);
  };

  const capture = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const f = new File([blob], "foto-aluno.jpg", { type:"image/jpeg" });
      setFile(f);
      setPreview(canvas.toDataURL("image/jpeg"));
      closeCamera();
    }, "image/jpeg", 0.9);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setMsg(null);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      const res = await api.post(`/alunos/${alunoId}/foto`, fd, {
        headers: { "Content-Type":"multipart/form-data" },
      });
      const url  = res.data.foto_url;
      const bust = Date.now();
      setFotoUrl(url);
      setCacheBust(bust);
      setPreview(null);
      setFile(null);
      setMsg({ type:"success", text:"Foto actualizada com sucesso." });
      onUpdate?.(`${url}?t=${bust}`);
    } catch {
      setMsg({ type:"error", text:"Erro ao guardar a foto. Verifique o formato (JPG/PNG, máx. 2MB)." });
    } finally { setUploading(false); }
  };

  const cancelPreview = () => { setPreview(null); setFile(null); setMsg(null); };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-pink-500" />
        <h2 className="text-sm font-semibold text-slate-700">Fotografia</h2>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border mb-4
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
          {msg.text}
        </div>
      )}

      <div className="flex items-start gap-5">
        {/* Foto / preview */}
        <div className="shrink-0">
          <div className="w-28 h-28 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-200 flex items-center justify-center">
            {preview
              ? <img src={preview} alt="preview" className="w-full h-full object-cover"/>
              : fotoUrl
                ? <img src={`${fotoUrl}?t=${cacheBust}`} alt="foto" className="w-full h-full object-cover"/>
                : <ImageIcon size={32} className="text-slate-300"/>
            }
          </div>
          {preview && (
            <button onClick={cancelPreview}
              className="mt-1.5 w-full text-xs text-slate-400 hover:text-red-500 flex items-center justify-center gap-1 transition-colors">
              <X size={11}/> Cancelar
            </button>
          )}
        </div>

        {/* Acções */}
        <div className="flex-1 space-y-2.5">
          <p className="text-xs text-slate-400">JPG ou PNG · máx. 2 MB</p>

          {/* Upload ficheiro */}
          <button onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-2 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-sm font-medium px-3 py-2 rounded-xl transition-colors">
            <Upload size={15}/> Carregar ficheiro
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="hidden" onChange={e => handleFileChange(e.target.files?.[0])}/>

          {/* Câmara */}
          <button onClick={openCamera}
            className="w-full flex items-center gap-2 border border-slate-200 hover:border-violet-400 hover:bg-violet-50 text-slate-600 hover:text-violet-700 text-sm font-medium px-3 py-2 rounded-xl transition-colors">
            <Camera size={15}/> Usar câmara
          </button>

          {/* Guardar */}
          {file && (
            <button onClick={handleUpload} disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
              {uploading
                ? <><RefreshCw size={14} className="animate-spin"/> A guardar...</>
                : <><CheckCircle size={14}/> Guardar foto</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Modal câmara */}
      {camera && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Camera size={16} className="text-violet-600"/> Câmara
              </h3>
              <button onClick={closeCamera} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={16}/>
              </button>
            </div>
            <div className="relative bg-black">
              <video ref={videoRef} autoPlay playsInline
                className="w-full aspect-[4/3] object-cover"/>
              {/* guia de enquadramento */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-48 rounded-full border-2 border-white/50 border-dashed"/>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button onClick={closeCamera}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={capture}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <Camera size={15}/> Capturar
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden"/>
    </div>
  );
}

function SenhaCard({ alunoId }) {
  const [form,    setForm]    = useState({ password: "", password_confirmation: "" });
  const [show,    setShow]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg,     setMsg]     = useState(null);

  const handleDefinir = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setMsg({ type: "error", text: "As senhas não coincidem." }); return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await api.patch(`/alunos/${alunoId}/definir-senha`, form);
      setMsg({ type: "success", text: res.data.message });
      setForm({ password: "", password_confirmation: "" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.message || "Erro ao definir senha." });
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!window.confirm("Repor senha para \"educasoft123\"?")) return;
    setResetting(true); setMsg(null);
    try {
      const res = await api.patch(`/alunos/${alunoId}/reset-senha`);
      setMsg({ type: "success", text: res.data.message });
    } catch {
      setMsg({ type: "error", text: "Erro ao repor senha." });
    } finally { setResetting(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-orange-500" />
        <h2 className="text-sm font-semibold text-slate-700">Acesso e Senha</h2>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl border
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {msg.text}
        </div>
      )}

      <form onSubmit={handleDefinir} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nova Senha</label>
          <div className="relative">
            <input type={show ? "text" : "password"} required minLength={6}
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className={inp} placeholder="Mínimo 6 caracteres" />
            <button type="button" onClick={() => setShow(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirmar Senha</label>
          <input type={show ? "text" : "password"} required minLength={6}
            value={form.password_confirmation} onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
            className={inp} placeholder="Repetir senha" />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            <KeyRound size={14} />
            {saving ? "A guardar..." : "Definir Senha"}
          </button>
          <button type="button" onClick={handleReset} disabled={resetting}
            title="Repor para senha padrão (educasoft123)"
            className="flex items-center gap-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium px-3 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            <RotateCcw size={14} />
            {resetting ? "..." : "Repor"}
          </button>
        </div>
      </form>
    </div>
  );
}

const TABS = [
  { key:"perfil",      label:"Perfil",      icon:"👤" },
  { key:"academico",   label:"Académico",   icon:"🎓" },
  { key:"financeiro",  label:"Financeiro",  icon:"💳" },
  { key:"acesso",      label:"Acesso",      icon:"🔑" },
];

export default function AlunoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aluno,    setAluno]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [heroFoto, setHeroFoto] = useState(null);
  const [tab,      setTab]      = useState("perfil");

  useEffect(() => {
    api.get(`/alunos/${id}`)
      .then(r => { setAluno(r.data); setHeroFoto(r.data.foto ? `/storage/${r.data.foto}` : null); })
      .catch(() => setError("Aluno não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="animate-pulse space-y-6 max-w-4xl">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="bg-white rounded-2xl h-32 shadow-sm" />
      <div className="bg-white rounded-2xl h-10 shadow-sm" />
      <div className="bg-white rounded-2xl h-64 shadow-sm" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertCircle size={40} className="text-rose-400" strokeWidth={1.4} />
      <p className="text-slate-600 font-medium">{error}</p>
      <button onClick={() => navigate("/alunos")} className="text-sm text-blue-600 hover:underline">
        Voltar à lista
      </button>
    </div>
  );

  const nome     = aluno.user?.nome;
  const initials = nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "A";
  const matricula = aluno.matriculas?.find(m => m.status === "activa") ?? aluno.matriculas?.[0];

  const STATUS_PAG = {
    pago:     "bg-emerald-50 text-emerald-700",
    pendente: "bg-amber-50 text-amber-700",
    vencido:  "bg-red-50 text-red-700",
    cancelado:"bg-slate-100 text-slate-500",
  };

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/alunos")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Alunos
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{nome}</span>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-blue-200 shrink-0 overflow-hidden">
          {heroFoto
            ? <img src={heroFoto} alt="" className="w-full h-full object-cover" key={heroFoto}/>
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{nome}</h1>
            {matricula?.turma?.nome && <Badge color="blue">{matricula.turma.nome}</Badge>}
            {aluno.genero && <Badge color="slate">{aluno.genero}</Badge>}
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">{aluno.numero_aluno}</p>
          {matricula?.turma?.classe?.curso?.nome && (
            <p className="text-xs text-slate-400 mt-0.5">{matricula.turma.classe.curso.nome}</p>
          )}
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${tab === t.key
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── ABA PERFIL ── */}
          {tab === "perfil" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados pessoais */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Dados Pessoais</h3>
                <InfoRow icon={User}     label="Nome completo"   value={nome} />
                <InfoRow icon={Mail}     label="Email"           value={aluno.user?.email} />
                <InfoRow icon={Phone}    label="Telefone"        value={aluno.user?.telefone} />
                <InfoRow icon={Calendar} label="Data Nascimento" value={aluno.data_nascimento} />
                <InfoRow icon={MapPin}   label="Naturalidade"    value={aluno.naturalidade} />
                <InfoRow icon={MapPin}   label="Endereço"        value={aluno.endereco} />
              </div>
              {/* Família + Foto */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Família / Responsável</h3>
                  <InfoRow icon={Users} label="Nome do Pai"      value={aluno.nome_pai} />
                  <InfoRow icon={Users} label="Nome da Mãe"      value={aluno.nome_mae} />
                  <InfoRow icon={Phone} label="Tel. Responsável" value={aluno.telefone_responsavel} />
                  {!aluno.nome_pai && !aluno.nome_mae && !aluno.telefone_responsavel && (
                    <p className="text-sm text-slate-400">Sem dados de família registados.</p>
                  )}
                </div>
              </div>
              {/* Foto — coluna inteira em mobile, 2ª coluna em desktop */}
              <div className="md:col-span-2">
                <FotoCard alunoId={aluno.id} fotoInicial={aluno.foto} onUpdate={url => setHeroFoto(url)} />
              </div>
            </div>
          )}

          {/* ── ABA ACADÉMICO ── */}
          {tab === "academico" && (
            <div className="space-y-6">
              {aluno.matriculas?.length === 0 && (
                <p className="text-slate-400 text-sm">Sem matrículas registadas.</p>
              )}
              {aluno.matriculas?.map(m => (
                <div key={m.id} className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">{m.turma?.nome ?? "Turma"}</h3>
                    <Badge color={m.status === "activa" ? "emerald" : "amber"}>{m.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoRow icon={BookOpen} label="Curso"        value={m.turma?.classe?.curso?.nome} />
                    <InfoRow icon={BookOpen} label="Classe"       value={m.turma?.classe?.nome} />
                    <InfoRow icon={Calendar} label="Ano Lectivo"  value={m.ano_letivo} />
                    <InfoRow icon={Calendar} label="Data Matrícula" value={m.created_at?.slice(0,10)} />
                  </div>
                </div>
              ))}

              {aluno.notas?.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Notas</h3>
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Disciplina</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Período</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Ac.</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Exame</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Média</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {aluno.notas.map(n => (
                          <tr key={n.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{n.disciplina?.nome}</td>
                            <td className="px-4 py-2.5 text-center text-slate-500 capitalize">{n.periodo}</td>
                            <td className="px-4 py-2.5 text-center text-slate-600">{n.nota_continua ?? "—"}</td>
                            <td className="px-4 py-2.5 text-center text-slate-600">{n.nota_exame ?? "—"}</td>
                            <td className="px-4 py-2.5 text-center">
                              {n.media != null
                                ? <span className={`font-bold ${n.media >= 10 ? "text-emerald-600" : "text-red-600"}`}>{n.media}</span>
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ABA FINANCEIRO ── */}
          {tab === "financeiro" && (
            <div className="space-y-4">
              {/* Resumo */}
              {aluno.pagamentos?.length > 0 && (() => {
                const pags  = aluno.pagamentos;
                const pago  = pags.filter(p => p.status === "pago").reduce((s,p) => s + Number(p.valor), 0);
                const divida = pags.filter(p => p.status === "pendente" || p.status === "vencido").reduce((s,p) => s + Number(p.valor), 0);
                return (
                  <div className="grid grid-cols-3 gap-3 mb-2">
                    {[["Total Pago", pago, "text-emerald-600"], ["Em Dívida", divida, "text-red-600"], ["Nº Pag.", pags.length, "text-blue-600"]].map(([l,v,c], i) => (
                      <div key={l} className="bg-slate-50 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400 mb-1">{l}</p>
                        <p className={`text-lg font-bold ${c}`}>{i === 2 ? v : `${Number(v).toLocaleString("pt-AO")} Kz`}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Histórico de Pagamentos</h3>
                <Link to="/pagamentos" className="text-xs text-blue-600 hover:underline font-medium">Ver todos →</Link>
              </div>

              {aluno.pagamentos?.length === 0
                ? <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <CreditCard size={28} strokeWidth={1.4} className="text-slate-300"/>
                    <p className="text-sm">Sem pagamentos registados</p>
                  </div>
                : (
                  <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Vencimento</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {aluno.pagamentos.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 font-medium text-slate-700">
                              {p.descricao ?? p.plano?.nome ?? p.emolumento?.nome ?? "Pagamento"}
                            </td>
                            <td className="px-4 py-2.5 text-slate-500 hidden sm:table-cell">{p.data_vencimento ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                              {Number(p.valor).toLocaleString("pt-AO")} Kz
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PAG[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          )}

          {/* ── ABA ACESSO ── */}
          {tab === "acesso" && (
            <div className="max-w-sm">
              <SenhaCard alunoId={aluno.id} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
