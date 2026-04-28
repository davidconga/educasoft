import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Mail, Phone, BookOpen, Calendar, GraduationCap,
  AlertCircle, KeyRound, Eye, EyeOff, CheckCircle, RotateCcw, Users,
} from "lucide-react";
import api from "../../services/api";

const DIAS = ["segunda","terca","quarta","quinta","sexta","sabado"];
const DIAS_LABEL = { segunda:"Segunda", terca:"Terça", quarta:"Quarta", quinta:"Quinta", sexta:"Sexta", sabado:"Sábado" };
const normDia = d =>
  (d ?? "").toLowerCase()
    .replace(/ç/g,"c").replace(/ã/g,"a").replace(/ê/g,"e").replace(/é/g,"e").replace(/á/g,"a").replace(/\s/g,"");

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

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

function SenhaCard({ professorId }) {
  const [form,      setForm]      = useState({ password:"", password_confirmation:"" });
  const [show,      setShow]      = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg,       setMsg]       = useState(null);

  const handleDefinir = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      setMsg({ type:"error", text:"As senhas não coincidem." }); return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await api.patch(`/professores/${professorId}/definir-senha`, form);
      setMsg({ type:"success", text: res.data.message });
      setForm({ password:"", password_confirmation:"" });
    } catch (err) {
      setMsg({ type:"error", text: err.response?.data?.message || "Erro ao definir senha." });
    } finally { setSaving(false); }
  };

  const handleReset = async () => {
    if (!window.confirm("Repor senha para \"educasoft123\"?")) return;
    setResetting(true); setMsg(null);
    try {
      const res = await api.patch(`/professores/${professorId}/reset-senha`);
      setMsg({ type:"success", text: res.data.message });
    } catch {
      setMsg({ type:"error", text:"Erro ao repor senha." });
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
            className="flex items-center gap-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm px-3 py-2.5 rounded-xl disabled:opacity-60 transition-colors">
            <RotateCcw size={14} />
            {resetting ? "..." : "Repor"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ProfessorDetalhe() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [prof,     setProf]    = useState(null);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);

  useEffect(() => {
    api.get(`/professores/${id}`)
      .then(r => setProf(r.data))
      .catch(() => setError("Professor não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="animate-pulse space-y-6 max-w-4xl">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="bg-white rounded-2xl h-36 shadow-sm" />
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl h-48 shadow-sm" />
        <div className="bg-white rounded-2xl h-48 shadow-sm" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <AlertCircle size={40} className="text-rose-400" strokeWidth={1.4} />
      <p className="text-slate-600 font-medium">{error}</p>
      <button onClick={() => navigate("/professores")} className="text-sm text-blue-600 hover:underline">
        Voltar à lista
      </button>
    </div>
  );

  const nome     = prof.user?.nome ?? "—";
  const initials = nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "P";

  const byDia = {};
  (prof.horarios ?? []).forEach(h => {
    const d = normDia(h.dia_semana);
    if (!byDia[d]) byDia[d] = [];
    byDia[d].push(h);
  });
  const diasComAulas = DIAS.filter(d => byDia[d]?.length);

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/professores")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          Professores
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-700 font-medium">{nome}</span>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-md shadow-emerald-200 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-800">{nome}</h1>
            {prof.especialidade && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                {prof.especialidade}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1 font-mono">{prof.numero_professor}</p>
          {prof.habilitacoes && <p className="text-sm text-slate-500 mt-0.5">{prof.habilitacoes}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Dados pessoais */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <h2 className="text-sm font-semibold text-slate-700">Dados Pessoais</h2>
          </div>
          <InfoRow icon={Mail}         label="Email"         value={prof.user?.email} />
          <InfoRow icon={Phone}        label="Telefone"      value={prof.user?.telefone} />
          <InfoRow icon={GraduationCap} label="Especialidade" value={prof.especialidade} />
          <InfoRow icon={BookOpen}     label="Habilitações"  value={prof.habilitacoes} />
          <InfoRow icon={Calendar}     label="Data Admissão" value={prof.data_admissao} />
        </div>

        {/* Disciplinas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <h2 className="text-sm font-semibold text-slate-700">Disciplinas</h2>
          </div>
          {(prof.disciplinas ?? []).length === 0
            ? <p className="text-sm text-slate-400">Sem disciplinas atribuídas.</p>
            : (
              <div className="flex flex-wrap gap-2">
                {prof.disciplinas.map(d => (
                  <span key={d.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-medium bg-violet-50 text-violet-700">
                    {d.nome}
                  </span>
                ))}
              </div>
            )
          }
        </div>

        {/* Turmas */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <h2 className="text-sm font-semibold text-slate-700">Turmas</h2>
          </div>
          {(prof.turmas ?? []).length === 0
            ? <p className="text-sm text-slate-400">Sem turmas atribuídas.</p>
            : (
              <div className="space-y-2">
                {prof.turmas.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {t.nome?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{t.nome}</p>
                      <p className="text-xs text-slate-400">{t.classe?.curso?.nome} · {t.ano_letivo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Senha */}
        <SenhaCard professorId={prof.id} />

        {/* Horário */}
        {diasComAulas.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold text-slate-700">Horário Semanal</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {diasComAulas.map(dia => (
                <div key={dia} className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-800 px-3 py-1.5">
                    <p className="text-xs font-semibold text-white">{DIAS_LABEL[dia]}</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {byDia[dia].sort((a,b) => a.hora_inicio?.localeCompare(b.hora_inicio)).map(h => (
                      <div key={h.id} className="px-3 py-2">
                        <p className="text-xs font-mono text-slate-400">{h.hora_inicio} – {h.hora_fim}</p>
                        <p className="text-sm font-medium text-slate-800 mt-0.5">{h.disciplina?.nome ?? "—"}</p>
                        <p className="text-xs text-slate-400">{h.turma?.nome}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
