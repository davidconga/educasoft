import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import api from "../../services/api";

const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50";
const numInp = "w-full text-center border-0 bg-transparent text-sm focus:outline-none focus:bg-indigo-50 focus:ring-1 focus:ring-indigo-400 rounded px-1 py-1";

function NumCell({ value, onChange, max = 20, bold, color }) {
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const table = e.currentTarget.closest("table");
    if (!table) return;
    const inputs = Array.from(table.querySelectorAll("input"));
    const idx = inputs.indexOf(e.currentTarget);
    if (idx < inputs.length - 1) { inputs[idx + 1].focus(); inputs[idx + 1].select(); }
  };
  return (
    <input
      type="number" min="0" max={max} step="0.1"
      value={value ?? ""}
      onChange={e => onChange(e.target.value === "" ? "" : e.target.value)}
      onKeyDown={handleKeyDown}
      className={`${numInp} ${bold ? "font-bold" : ""} ${color ?? ""}`}
    />
  );
}

function calcMT(mac, npp, npt) {
  const vals = [mac, npp, npt].filter(v => v !== "" && v != null && !isNaN(Number(v)));
  if (!vals.length) return null;
  return (vals.reduce((s, v) => s + Number(v), 0) / vals.length).toFixed(2);
}

const PERIODOS = [
  { value: "1", label: "Iº Trimestre" },
  { value: "2", label: "IIº Trimestre" },
  { value: "3", label: "IIIº Trimestre" },
];

export default function ProfessorNotas() {
  const [prof,      setProf]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [turmaId,   setTurmaId]   = useState("");
  const [discId,    setDiscId]    = useState("");
  const [periodo,   setPeriodo]   = useState("1");
  const [anoLetivo, setAnoLetivo] = useState("2025-2026");
  const [alunos,    setAlunos]    = useState([]);
  const [draft,     setDraft]     = useState({});
  const [loadingD,  setLoadingD]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  useEffect(() => {
    api.get("/portal/professor/me")
      .then(r => setProf(r.data))
      .finally(() => setLoading(false));
  }, []);

  const discsDaTurma = (() => {
    if (!turmaId || !prof) return [];
    const turma = (prof.turmas ?? []).find(t => String(t.id) === String(turmaId));
    return turma?.disciplinas ?? [];
  })();

  const loadNotas = useCallback(async () => {
    if (!turmaId || !discId) { setAlunos([]); setDraft({}); return; }
    setLoadingD(true); setMsg(null);
    try {
      const { data } = await api.get("/notas/por-disciplina", {
        params: { turma_id: turmaId, disciplina_id: discId, periodo, ano_letivo: anoLetivo },
      });
      const lista = data.alunos ?? [];
      setAlunos(lista);
      const d = {};
      lista.forEach(a => {
        d[a.id] = {
          fj:  a.falta_justificada   != null ? a.falta_justificada   : "",
          fi:  a.falta_injustificada != null ? a.falta_injustificada : "",
          mac: a.mac != null ? a.mac : "",
          npp: a.npp != null ? a.npp : "",
          npt: a.npt != null ? a.npt : "",
        };
      });
      setDraft(d);
    } finally { setLoadingD(false); }
  }, [turmaId, discId, periodo, anoLetivo]);

  useEffect(() => { loadNotas(); }, [loadNotas]);

  const setCell = (alunoId, field, val) =>
    setDraft(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [field]: val } }));

  const handleSave = async () => {
    if (!turmaId || !discId || !alunos.length) return;
    setSaving(true); setMsg(null);
    const notas = alunos.map(a => {
      const c = draft[a.id] ?? {};
      return {
        aluno_id:            a.id,
        disciplina_id:       Number(discId),
        turma_id:            Number(turmaId),
        periodo,
        ano_letivo:          anoLetivo,
        mac:                 c.mac !== "" ? Number(c.mac) : null,
        npp:                 c.npp !== "" ? Number(c.npp) : null,
        npt:                 c.npt !== "" ? Number(c.npt) : null,
        falta_justificada:   Number(c.fj)  || 0,
        falta_injustificada: Number(c.fi)  || 0,
      };
    });
    try {
      const res = await api.post("/notas/bulk", { notas });
      setMsg({ type: "success", text: res.data.message });
      loadNotas();
    } catch {
      setMsg({ type: "error", text: "Erro ao guardar notas." });
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Lançamento de Notas</h1>
        {alunos.length > 0 && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "A guardar..." : "Guardar Notas"}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Turma</label>
            <select value={turmaId} onChange={e => { setTurmaId(e.target.value); setDiscId(""); }} className={sel}>
              <option value="">Seleccionar...</option>
              {(prof?.turmas ?? []).map(t => {
                const label = [t.classe?.curso?.nome, t.classe?.nome, t.turnoObj?.nome ?? t.turno, t.nome].filter(Boolean).join(" · ");
                return <option key={t.id} value={t.id}>{label}</option>;
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Disciplina</label>
            <select value={discId} onChange={e => setDiscId(e.target.value)} disabled={!turmaId} className={`${sel} disabled:opacity-50`}>
              <option value="">Seleccionar...</option>
              {discsDaTurma.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Trimestre</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} className={sel}>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Ano Lectivo</label>
            <input value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)} className={sel} placeholder="2025-2026" />
          </div>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {(!turmaId || !discId) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Seleccione uma turma e disciplina para lançar notas.
        </div>
      )}
      {loadingD && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A carregar...</div>}
      {!loadingD && turmaId && discId && alunos.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem alunos nesta turma.</div>
      )}

      {!loadingD && alunos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-600 px-2 py-2 text-center w-8" rowSpan={2}>Nº</th>
                  <th className="border border-slate-600 px-3 py-2 text-left min-w-[180px]" rowSpan={2}>Nome do Aluno</th>
                  <th className="border border-slate-600 px-1 py-1.5 text-center text-[10px]" colSpan={2}>Faltas</th>
                  <th className="border border-slate-600 px-1 py-1.5 text-center text-[10px]" colSpan={3}>Avaliação</th>
                  <th className="border border-slate-600 px-2 py-1.5 text-center text-[10px] text-amber-300 font-bold" rowSpan={2}>MT</th>
                  <th className="border border-slate-600 px-2 py-1.5 text-center text-[10px]" rowSpan={2}>Resultado</th>
                </tr>
                <tr className="bg-slate-700 text-white">
                  <th className="border border-slate-600 px-1 py-1 text-center w-12 text-[9px]">Just.</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-12 text-[9px]">Injust.</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-16 text-[9px] text-sky-300">MAC</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-16 text-[9px] text-sky-300">NPP</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-16 text-[9px] text-sky-300">NPT</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, idx) => {
                  const c   = draft[aluno.id] ?? { fj: "", fi: "", mac: "", npp: "", npt: "" };
                  const mt  = calcMT(c.mac, c.npp, c.npt);
                  const mtN = mt != null ? Number(mt) : null;
                  return (
                    <tr key={aluno.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="border border-slate-100 px-2 py-0.5 text-center text-slate-400 font-mono">{aluno.ord}</td>
                      <td className="border border-slate-100 px-3 py-0.5 font-medium text-slate-800 whitespace-nowrap">{aluno.nome}</td>
                      <td className="border border-slate-100 p-0 w-12">
                        <NumCell value={c.fj}  onChange={v => setCell(aluno.id, "fj",  v)} max={999} />
                      </td>
                      <td className="border border-slate-100 p-0 w-12">
                        <NumCell value={c.fi}  onChange={v => setCell(aluno.id, "fi",  v)} max={999} />
                      </td>
                      <td className="border border-slate-100 p-0 w-16">
                        <NumCell value={c.mac} onChange={v => setCell(aluno.id, "mac", v)} />
                      </td>
                      <td className="border border-slate-100 p-0 w-16">
                        <NumCell value={c.npp} onChange={v => setCell(aluno.id, "npp", v)} />
                      </td>
                      <td className="border border-slate-100 p-0 w-16">
                        <NumCell value={c.npt} onChange={v => setCell(aluno.id, "npt", v)} />
                      </td>
                      <td className={`border border-slate-100 px-2 py-0.5 text-center font-bold w-14
                        ${mtN != null ? (mtN >= 10 ? "text-blue-700" : "text-red-600") : "text-slate-300"}`}>
                        {mt ?? "—"}
                      </td>
                      <td className="border border-slate-100 px-2 py-0.5 text-center">
                        {mtN != null
                          ? <span className={`text-xs font-semibold ${mtN >= 10 ? "text-emerald-600" : "text-red-500"}`}>
                              {mtN >= 10 ? "Aprovado" : "Reprovado"}
                            </span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
            <span><strong className="text-sky-600">MAC</strong> = Média de Avaliação Contínua</span>
            <span><strong className="text-sky-600">NPP</strong> = Nota da Prova Prática</span>
            <span><strong className="text-sky-600">NPT</strong> = Nota da Prova Teórica</span>
            <span><strong className="text-amber-600">MT</strong> = (MAC + NPP + NPT) / 3</span>
            <span className="text-blue-600">● ≥ 10 Aprovado</span>
            <span className="text-red-500">● &lt; 10 Reprovado</span>
          </div>
        </div>
      )}
    </div>
  );
}
