import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, BookOpen, Clock, User, MapPin, Calendar, UserPlus, Search, X, CheckCircle, AlertCircle, MessageSquare, Sparkles } from "lucide-react";
import api from "../../services/api";
import { chatService } from "../../services/chatService";
import Comunidade from "../comunidade/Comunidade";

const TURNOS = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };
const ANO_ATUAL = new Date().getFullYear().toString();

function Badge({ children, color = "blue" }) {
  const c = {
    blue:   "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
    green:  "bg-emerald-50 text-emerald-700",
    amber:  "bg-amber-50 text-amber-700",
    slate:  "bg-slate-100 text-slate-600",
  }[color] ?? "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c}`}>{children}</span>;
}

function Avatar({ nome, foto }) {
  const fotoUrl = foto ? `/storage/${foto}` : null;
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden bg-blue-100 text-blue-700">
      {fotoUrl ? <img src={fotoUrl} alt="" className="w-full h-full object-cover" /> : (nome?.[0] ?? "?").toUpperCase()}
    </div>
  );
}

/* ── Modal matricular aluno existente ─────────────────────── */
function ModalMatricular({ turma, onClose, onSaved }) {
  const [search, setSearch]       = useState("");
  const [results, setResults]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [anoLetivo, setAnoLetivo] = useState(turma.ano_letivo ?? ANO_ATUAL);
  const [dataMatricula, setDataMatricula] = useState(new Date().toISOString().slice(0, 10));
  const [searching, setSearching] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const buscar = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await api.get(`/alunos?search=${encodeURIComponent(q)}&per_page=20`);
      setResults(res.data.data || res.data);
    } finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(search), 350);
    return () => clearTimeout(t);
  }, [search, buscar]);

  const handleMatricular = async () => {
    if (!selected) return;
    setSaving(true); setError("");
    try {
      const res = await api.post("/matriculas", {
        aluno_id:       selected.id,
        turma_id:       turma.id,
        ano_letivo:     anoLetivo,
        data_matricula: dataMatricula,
      });
      onSaved(res.data.matricula);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors
        ? Object.values(err.response.data.errors ?? {}).flat().join(" ")
        : "Erro ao matricular aluno.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Matricular Aluno</h2>
            <p className="text-xs text-slate-400 mt-0.5">Turma: <span className="font-medium text-slate-600">{turma.nome}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={16}/>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={14}/> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Pesquisar aluno</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); }}
                placeholder="Nome ou email do aluno..."
                className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                autoFocus
              />
            </div>
          </div>

          {search.trim() && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {searching && (
                <div className="px-4 py-3 text-sm text-slate-400">A pesquisar...</div>
              )}
              {!searching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-400">Nenhum aluno encontrado.</div>
              )}
              {!searching && results.map(a => {
                const isSelected = selected?.id === a.id;
                return (
                  <button key={a.id} onClick={() => setSelected(a)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0
                      ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                    <Avatar nome={a.user?.nome} foto={a.foto} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 text-sm truncate">{a.user?.nome}</div>
                      <div className="text-xs text-slate-400 truncate">{a.numero_aluno} · {a.user?.email}</div>
                    </div>
                    {isSelected && <CheckCircle size={16} className="text-blue-600 flex-shrink-0"/>}
                  </button>
                );
              })}
            </div>
          )}

          {selected && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Avatar nome={selected.user?.nome} foto={selected.foto} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-blue-800 text-sm">{selected.user?.nome}</div>
                <div className="text-xs text-blue-500">{selected.numero_aluno}</div>
              </div>
              <button onClick={() => { setSelected(null); }} className="text-blue-400 hover:text-blue-600">
                <X size={14}/>
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Ano Lectivo</label>
              <input value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data de Matrícula</label>
              <input type="date" value={dataMatricula} onChange={e => setDataMatricula(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium">
            Cancelar
          </button>
          <button onClick={handleMatricular} disabled={!selected || saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {saving ? "A matricular..." : "Matricular"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ─────────────────────────────────────── */
export default function TurmaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [turma, setTurma]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState("alunos");
  const [showMatricular, setShowMatricular] = useState(false);
  const [toast, setToast]               = useState(null);

  const load = useCallback(() => {
    api.get(`/turmas/${id}`)
      .then(r => setTurma(r.data))
      .catch(() => navigate("/turmas"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const abrirChatTurma = async () => {
    try {
      const r = await chatService.iniciarTurma(id);
      navigate(`/chat?conversa=${r.id}`);
    } catch (e) {
      showToast(e?.response?.data?.message || "Não foi possível abrir o chat.", "error");
    }
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;
  if (!turma)  return null;

  const turno   = turma.turnoObj?.nome ?? TURNOS[turma.turno] ?? turma.turno;
  const ocupacao = turma.alunos?.length ?? 0;

  const tabs = [
    { key: "alunos",      label: "Alunos",      icon: Users,    count: turma.alunos?.length },
    { key: "disciplinas", label: "Disciplinas",  icon: BookOpen, count: turma.disciplinas?.length },
    { key: "horarios",    label: "Horários",     icon: Clock,    count: turma.horarios?.length },
    { key: "forum",       label: "Fórum",        icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "success" ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
          {toast.msg}
        </div>
      )}

      {/* Back + header */}
      <div>
        <button onClick={() => navigate("/turmas")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15}/> Turmas
        </button>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{turma.nome}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {turma.classe?.curso?.nome && <Badge color="indigo">{turma.classe.curso.nome}</Badge>}
                {turma.classe?.nome        && <Badge color="blue">{turma.classe.nome}</Badge>}
                {turno                     && <Badge color="amber">{turno}</Badge>}
                <Badge color="slate">{turma.ano_letivo}</Badge>
              </div>
            </div>
            <div className="flex items-start gap-3 flex-shrink-0">
              <button
                onClick={abrirChatTurma}
                title="Abrir chat da turma"
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <MessageSquare size={15}/> Chat da turma
              </button>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{ocupacao}</div>
                <div className="text-xs text-slate-400">de {turma.capacidade} alunos</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar size={15} className="text-slate-400"/><span>{turma.ano_letivo}</span>
            </div>
            {turma.sala && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin size={15} className="text-slate-400"/><span>{turma.sala.nome}</span>
              </div>
            )}
            {turma.diretorTurma && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User size={15} className="text-slate-400"/>
                <span>{turma.diretorTurma.user?.nome}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Users size={15} className="text-slate-400"/>
              <span>{ocupacao}/{turma.capacidade} alunos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + acção */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t.key ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <t.icon size={14}/>
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "alunos" && (
          <button onClick={() => setShowMatricular(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
            <UserPlus size={15}/> Matricular Aluno
          </button>
        )}
      </div>

      {/* Tab: Alunos */}
      {tab === "alunos" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {turma.alunos?.length === 0
            ? (
              <div className="text-center py-16">
                <Users size={32} className="mx-auto text-slate-300 mb-3"/>
                <p className="text-slate-400 text-sm">Nenhum aluno matriculado.</p>
                <button onClick={() => setShowMatricular(true)}
                  className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium">
                  <UserPlus size={14}/> Matricular primeiro aluno
                </button>
              </div>
            )
            : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Aluno</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nº</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {turma.alunos.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nome={a.user?.nome} foto={a.foto} />
                          <span className="font-medium text-slate-800">{a.user?.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-400 text-xs">{a.numero_aluno}</td>
                      <td className="px-4 py-3 text-slate-500">{a.user?.email}</td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/alunos/${a.id}`} className="text-blue-600 hover:underline text-sm">Ver</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* Tab: Disciplinas */}
      {tab === "disciplinas" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {turma.disciplinas?.length === 0
            ? <p className="text-center text-slate-400 py-12 text-sm">Nenhuma disciplina atribuída. Crie horários para associar disciplinas e professores à turma.</p>
            : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Disciplina</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Professor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {turma.disciplinas.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">{d.nome}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {d.professores?.[0]?.user?.nome ?? <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* Tab: Horários */}
      {tab === "horarios" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {turma.horarios?.length === 0
            ? <p className="text-center text-slate-400 py-12">Nenhum horário definido.</p>
            : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dia</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Hora</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Disciplina</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Professor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {turma.horarios.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-700 capitalize">{h.dia_semana}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{h.hora_inicio} – {h.hora_fim}</td>
                      <td className="px-4 py-3 text-slate-700">{h.disciplina?.nome ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{h.professor?.user?.nome ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* Tab: Fórum */}
      {tab === "forum" && (
        <Comunidade turmaId={Number(id)} modoForum />
      )}

      {/* Modal matricular */}
      {showMatricular && (
        <ModalMatricular
          turma={turma}
          onClose={() => setShowMatricular(false)}
          onSaved={(matricula) => {
            setShowMatricular(false);
            showToast(`${matricula.aluno?.user?.nome ?? "Aluno"} matriculado com sucesso.`);
            load();
          }}
        />
      )}
    </div>
  );
}
