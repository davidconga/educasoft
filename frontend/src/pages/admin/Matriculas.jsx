import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, ClipboardList, CheckCircle, Printer,
  Search, ChevronDown, AlertCircle, X,
} from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { imprimirComprovativoMatricula } from "../../components/Recibo";

const ANO_REF = new Date().getFullYear();
const ANO_ATUAL = `${ANO_REF - 1}-${ANO_REF}`;

const STATUS_CFG = {
  pendente:    { label: "Pendente",    cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"   },
  activa:      { label: "Activa",      cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  confirmada:  { label: "Confirmada",  cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200"      },
  transferida: { label: "Transferida", cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-200"},
  concluida:   { label: "Concluída",   cls: "bg-slate-100 text-slate-600 ring-1 ring-slate-200"  },
  cancelada:   { label: "Cancelada",   cls: "bg-red-50 text-red-500 ring-1 ring-red-200"         },
};

function Badge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pendente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
}

/* ── Modal: Inscrição + Matrícula ──────────────────────���────── */
function ModalInscricao({ onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [alunoData, setAlunoData] = useState({
    nome:"", email:"", telefone:"", data_nascimento:"", genero:"",
    bi:"", naturalidade:"", nome_pai:"", nome_mae:"",
    telefone_responsavel:"", endereco:"",
  });
  const [matData, setMatData] = useState({
    curso_id:"", classe_id:"", turma_id:"",
    ano_letivo: `${ANO_REF}-${ANO_REF + 1}`,
    data_matricula: new Date().toISOString().split("T")[0],
  });
  const [cursos,  setCursos]  = useState([]);
  const [classes, setClasses] = useState([]);
  const [turmas,  setTurmas]  = useState([]);
  const [novoAluno, setNovoAluno] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState("");

  // Carregar cursos ao abrir
  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {});
  }, []);

  // Carregar classes quando curso muda
  useEffect(() => {
    setClasses([]); setTurmas([]);
    setMatData(s => ({...s, classe_id:"", turma_id:""}));
    if (!matData.curso_id) return;
    api.get(`/classes?curso_id=${matData.curso_id}`).then(r => setClasses(r.data)).catch(() => {});
  }, [matData.curso_id]);

  // Carregar turmas quando classe muda
  useEffect(() => {
    setTurmas([]);
    setMatData(s => ({...s, turma_id:""}));
    if (!matData.classe_id) return;
    api.get(`/turmas?classe_id=${matData.classe_id}`).then(r => setTurmas(r.data)).catch(() => {});
  }, [matData.classe_id]);

  const handleAluno = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const res = await api.post("/alunos", alunoData);
      setNovoAluno(res.data.aluno);
      setStep(2);
    } catch (err) { setError(err.response?.data?.message || "Erro ao criar aluno."); }
    finally { setSaving(false); }
  };

  const handleMatricula = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = {
        aluno_id:       novoAluno.id,
        turma_id:       matData.turma_id,
        ano_letivo:     matData.ano_letivo,
        data_matricula: matData.data_matricula,
      };
      const res = await api.post("/matriculas", payload);
      onSaved(res.data.matricula);
    } catch (err) { setError(err.response?.data?.message || "Erro ao criar matrícula."); }
    finally { setSaving(false); }
  };

  const sel = (label, key, options, placeholder, extra = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={matData[key]}
        onChange={e => setMatData(s => ({...s, [key]: e.target.value}))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50"
        {...extra}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </div>
  );

  const field = (label, key, props = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        value={alunoData[key]}
        onChange={e => setAlunoData(s => ({...s, [key]: e.target.value}))}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
        {...props}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">

        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Nova Inscrição</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
          </div>
          <div className="flex gap-2">
            {[{n:1,label:"Dados do Aluno"},{n:2,label:"Matrícula"}].map(s => (
              <div key={s.n} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                ${step===s.n?"bg-blue-600 text-white":step>s.n?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-400"}`}>
                {step>s.n ? <CheckCircle size={14}/> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{s.n}</span>}
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={14}/> {error}
          </div>
        )}

        {/* Step 1: dados do aluno */}
        {step === 1 && (
          <form onSubmit={handleAluno} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">{field("Nome Completo *","nome",{required:true})}</div>
              <div className="col-span-2">{field("Email *","email",{required:true,type:"email"})}</div>
              {field("Telefone","telefone")}
              {field("Data de Nascimento","data_nascimento",{type:"date"})}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Género</label>
                <select value={alunoData.genero} onChange={e=>setAlunoData(s=>({...s,genero:e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
                  <option value="">Seleccionar</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
              {field("Bilhete de Identidade","bi")}
              {field("Naturalidade","naturalidade")}
              {field("Nome do Pai","nome_pai")}
              {field("Nome da Mãe","nome_mae")}
              {field("Tel. Responsável","telefone_responsavel")}
              <div className="col-span-2">{field("Endereço","endereco")}</div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? "A guardar..." : "Seguinte →"}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: matrícula com seleção em cascata */}
        {step === 2 && novoAluno && (
          <form onSubmit={handleMatricula} className="p-6 space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle size={14}/>
              Aluno <strong>{novoAluno.user?.nome}</strong> criado com nº <strong>{novoAluno.numero_aluno}</strong>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ano Lectivo *</label>
                <input required value={matData.ano_letivo} onChange={e=>setMatData(s=>({...s,ano_letivo:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data de Matrícula *</label>
                <input required type="date" value={matData.data_matricula} onChange={e=>setMatData(s=>({...s,data_matricula:e.target.value}))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"/>
              </div>

              {/* Cascata: Curso → Classe → Turma */}
              <div className="col-span-2">
                {sel("Curso *","curso_id",cursos,"Seleccionar curso...",{required:true})}
              </div>
              <div className="col-span-2">
                {sel("Classe *","classe_id",classes,
                  matData.curso_id ? "Seleccionar classe..." : "← Seleccione primeiro o curso",
                  {required:true, disabled:!matData.curso_id})}
              </div>
              <div className="col-span-2">
                {sel("Turma *","turma_id",turmas,
                  matData.classe_id ? "Seleccionar turma..." : "← Seleccione primeiro a classe",
                  {required:true, disabled:!matData.classe_id})}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setStep(1)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">← Voltar</button>
              <button type="submit" disabled={saving || !matData.turma_id}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-60">
                {saving ? "A guardar..." : "Concluir Inscrição"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────── */
export default function Matriculas() {
  const { escola } = useAuthStore();
  const [tab, setTab]           = useState("lista");
  const [matriculas, setMatriculas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [anoLetivo, setAnoLetivo] = useState(ANO_ATUAL);
  const [selected, setSelected] = useState([]);
  const [showInscricao, setShowInscricao] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [toast, setToast]       = useState(null);
  const [pagina, setPagina]     = useState(1);
  const [meta, setMeta]         = useState(null);
  const PER_PAGE = 50;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async (pg = pagina) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: PER_PAGE, page: pg, ano_letivo: anoLetivo });
      if (filtroStatus !== "todos") params.append("status", filtroStatus);
      if (search) params.append("search", search);
      const res = await api.get(`/matriculas?${params}`);
      setMatriculas(res.data.data || res.data);
      setMeta(res.data.meta ?? null);
    } finally { setLoading(false); }
  }, [filtroStatus, anoLetivo, search, pagina]);

  useEffect(() => { setPagina(1); }, [filtroStatus, anoLetivo, search]);
  useEffect(() => { load(pagina); }, [pagina, filtroStatus, anoLetivo, search]);

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const pendentes = matriculas.filter(m => m.status === "pendente");
  const allSelected = pendentes.length > 0 && selected.length === pendentes.length;
  const toggleAll = () => setSelected(allSelected ? [] : pendentes.map(m => m.id));

  const selectedMats = matriculas.filter(m => selected.includes(m.id));

  const handleConfirmarUma = async (matricula) => {
    try {
      const res = await api.patch(`/matriculas/${matricula.id}/confirmar`);
      showToast("Matrícula confirmada com sucesso.");
      imprimirComprovativoMatricula(res.data.matricula, escola);
      load();
      setSelected(s => s.filter(id => id !== matricula.id));
    } catch (err) {
      showToast(err.response?.data?.message || "Erro ao confirmar.", "error");
    }
  };

  const handleConfirmarSelecionadas = async () => {
    if (!selected.length) return;
    setConfirmando(true);
    try {
      const res = await api.post("/matriculas/confirmar-multiplas", { ids: selected });
      showToast(res.data.message);
      if (res.data.matriculas?.length) {
        imprimirComprovativoMatricula(res.data.matriculas, escola);
      }
      setSelected([]);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Erro.", "error");
    } finally { setConfirmando(false); }
  };

  const handleEliminar = async (matricula) => {
    if (!confirm(`Eliminar matrícula de ${matricula.aluno?.user?.nome}?`)) return;
    try {
      await api.delete(`/matriculas/${matricula.id}`);
      showToast("Matrícula eliminada.");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Erro ao eliminar.", "error");
    }
  };

  const stats = {
    total:      matriculas.length,
    pendentes:  matriculas.filter(m => m.status === "pendente").length,
    activas:    matriculas.filter(m => m.status === "activa").length,
    outras:     matriculas.filter(m => !["pendente","activa"].includes(m.status)).length,
  };

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all
          ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inscrições & Matrículas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gerir inscrições, confirmar matrículas e emitir comprovativos</p>
        </div>
        <button
          onClick={() => setShowInscricao(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-200"
        >
          <UserPlus size={16}/> Nova Inscrição
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:"Total",     value: stats.total,     color:"bg-slate-50 text-slate-800"   },
          { label:"Pendentes", value: stats.pendentes,  color:"bg-amber-50 text-amber-800"   },
          { label:"Activas",   value: stats.activas,    color:"bg-emerald-50 text-emerald-800"},
          { label:"Outras",    value: stats.outras,     color:"bg-slate-50 text-slate-500"   },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl p-5 ${c.color} border border-white shadow-sm`}>
            <p className="text-xs font-medium opacity-60 uppercase tracking-wide">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros + toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar aluno..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="relative">
          <select
            value={anoLetivo}
            onChange={e => setAnoLetivo(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {[-2, -1, 0, 1].map(offset => {
                const s = ANO_REF + offset - 1;
                const ano = `${s}-${s + 1}`;
                return <option key={ano} value={ano}>{ano}</option>;
              })}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {["todos","pendente","activa","transferida","concluida","cancelada"].map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors
                ${filtroStatus === s ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {s === "todos" ? "Todos" : STATUS_CFG[s]?.label}
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => imprimirComprovativoMatricula(selectedMats, escola)}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Printer size={14}/> Imprimir {selected.length}
            </button>
            {selectedMats.every(m => m.status === "pendente") && (
              <button
                onClick={handleConfirmarSelecionadas}
                disabled={confirmando}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                <CheckCircle size={14}/> {confirmando ? "A confirmar..." : `Confirmar ${selected.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">A carregar...</div>
        ) : matriculas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <ClipboardList size={32} strokeWidth={1.4} className="text-slate-300"/>
            <p className="text-sm">Nenhuma matrícula encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-slate-300"/>
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Aluno</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Nº</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Turma</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Curso</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Data Mat.</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {matriculas.map(m => (
                <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(m.id) ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={selected.includes(m.id)}
                      onChange={() => toggleSelect(m.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {m.aluno?.user?.nome?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-800">{m.aluno?.user?.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{m.aluno?.numero_aluno}</td>
                  <td className="px-5 py-3.5 text-slate-700">{m.turma?.nome}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{m.turma?.classe?.curso?.nome || "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {m.data_matricula ? new Date(m.data_matricula).toLocaleDateString("pt-AO") : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <Badge status={m.status}/>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => imprimirComprovativoMatricula(m, escola)}
                        title="Imprimir comprovativo"
                        className="text-slate-300 hover:text-blue-600 transition-colors"
                      >
                        <Printer size={15}/>
                      </button>
                      {m.status === "pendente" && (
                        <button
                          onClick={() => handleConfirmarUma(m)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                        >
                          Confirmar
                        </button>
                      )}
                      {m.status !== "activa" && (
                        <button
                          onClick={() => handleEliminar(m)}
                          className="text-xs text-slate-300 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <X size={14}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-slate-400">
            A mostrar {((meta.current_page - 1) * PER_PAGE) + 1}–{Math.min(meta.current_page * PER_PAGE, meta.total)} de {meta.total} matrículas
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={pagina === 1}
              onClick={() => setPagina(p => p - 1)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >← Anterior</button>
            {Array.from({ length: meta.last_page }, (_, i) => i + 1)
              .filter(p => p === 1 || p === meta.last_page || Math.abs(p - pagina) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === "..." ? (
                <span key={`e${i}`} className="px-2 text-slate-400 text-sm">…</span>
              ) : (
                <button key={p} onClick={() => setPagina(p)}
                  className={`w-8 h-8 text-sm rounded-lg border transition-colors ${pagina === p ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                  {p}
                </button>
              ))}
            <button
              disabled={pagina === meta.last_page}
              onClick={() => setPagina(p => p + 1)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >Seguinte →</button>
          </div>
        </div>
      )}

      {showInscricao && (
        <ModalInscricao
          onClose={() => setShowInscricao(false)}
          onSaved={(matricula) => {
            setShowInscricao(false);
            showToast(`Inscrição de ${matricula.aluno?.user?.nome} concluída.`);
            imprimirComprovativoMatricula(matricula, escola);
            load();
          }}
        />
      )}
    </div>
  );
}
