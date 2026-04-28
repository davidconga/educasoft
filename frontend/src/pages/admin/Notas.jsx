import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Save, Printer, AlertCircle, CheckCircle, RefreshCw, LayoutGrid, List } from "lucide-react";
import api from "../../services/api";

const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";
const numInp = "w-full text-center border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-400 rounded px-1 py-1";

const PERIODOS = [
  { value: "1", label: "Iº Trimestre" },
  { value: "2", label: "IIº Trimestre" },
  { value: "3", label: "IIIº Trimestre" },
];

/** Calcula MT a partir de MAC, NPP, NPT (ignora vazios). */
function calcMT(mac, npp, npt) {
  const vals = [mac, npp, npt].filter(v => v !== "" && v != null && !isNaN(Number(v)));
  if (!vals.length) return null;
  return (vals.reduce((s, v) => s + Number(v), 0) / vals.length).toFixed(2);
}

function NumCell({ value, onChange, max = 20, bold, color }) {
  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === "") { onChange(""); return; }
    const num = parseFloat(raw);
    if (isNaN(num) || num < 0) { onChange("0"); return; }
    if (num > max) { onChange(String(max)); return; }
    onChange(raw);
  };
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
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`${numInp} ${bold ? "font-bold" : ""} ${color ?? ""}`}
    />
  );
}

function MsgBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl border
      ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
      {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
      {msg.text}
    </div>
  );
}

function Filtros({ filtro, setFiltro, turmas, extraSlot }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className={`grid grid-cols-1 gap-4 ${extraSlot ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Turma</label>
          <select value={filtro.turma_id} onChange={e => setFiltro(f => ({ ...f, turma_id: e.target.value }))} className={sel}>
            <option value="">Seleccionar turma...</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        {extraSlot}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Trimestre</label>
          <select value={filtro.periodo} onChange={e => setFiltro(f => ({ ...f, periodo: e.target.value }))} className={sel}>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Ano Lectivo</label>
          <input value={filtro.ano_letivo} onChange={e => setFiltro(f => ({ ...f, ano_letivo: e.target.value }))} className={sel} placeholder="2025-2026" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   TAB A: Por Disciplina — MAC / NPP / NPT → MT auto
───────────────────────────────────────────────────── */
function PorDisciplina({ filtro, setFiltro, turmas }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [discId,      setDiscId]      = useState("");
  const [alunos,      setAlunos]      = useState([]);
  const [draft,       setDraft]       = useState({});
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState(null);

  useEffect(() => {
    api.get("/disciplinas").then(r => setDisciplinas(r.data?.data ?? r.data ?? []));
  }, []);

  const loadAlunos = useCallback(async () => {
    if (!filtro.turma_id || !discId) { setAlunos([]); setDraft({}); return; }
    setLoading(true); setMsg(null);
    try {
      const { data } = await api.get("/notas/por-disciplina", {
        params: { turma_id: filtro.turma_id, disciplina_id: discId, periodo: filtro.periodo, ano_letivo: filtro.ano_letivo },
      });
      setAlunos(data.alunos ?? []);
      const d = {};
      (data.alunos ?? []).forEach(a => {
        d[a.id] = {
          fj:  a.falta_justificada   != null && a.falta_justificada   !== "" ? a.falta_justificada   : "",
          fi:  a.falta_injustificada != null && a.falta_injustificada !== "" ? a.falta_injustificada : "",
          mac: a.mac != null ? a.mac : "",
          npp: a.npp != null ? a.npp : "",
          npt: a.npt != null ? a.npt : "",
        };
      });
      setDraft(d);
    } catch {
      setMsg({ type: "error", text: "Erro ao carregar alunos." });
    } finally { setLoading(false); }
  }, [filtro.turma_id, discId, filtro.periodo, filtro.ano_letivo]);

  useEffect(() => { loadAlunos(); }, [loadAlunos]);

  const setCell = (alunoId, field, val) =>
    setDraft(prev => ({ ...prev, [alunoId]: { ...prev[alunoId], [field]: val } }));

  const handleSave = async () => {
    if (!filtro.turma_id || !discId || !alunos.length) return;
    setSaving(true); setMsg(null);
    const notas = alunos.map(a => {
      const c = draft[a.id] ?? {};
      return {
        aluno_id:            a.id,
        disciplina_id:       Number(discId),
        turma_id:            Number(filtro.turma_id),
        periodo:             filtro.periodo,
        ano_letivo:          filtro.ano_letivo,
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
      loadAlunos();
    } catch {
      setMsg({ type: "error", text: "Erro ao guardar notas." });
    } finally { setSaving(false); }
  };

  const discSlot = (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">Disciplina</label>
      <select value={discId} onChange={e => setDiscId(e.target.value)} disabled={!filtro.turma_id} className={`${sel} disabled:opacity-50`}>
        <option value="">Seleccionar disciplina...</option>
        {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-4">
      <Filtros filtro={filtro} setFiltro={setFiltro} turmas={turmas} extraSlot={discSlot} />
      <MsgBanner msg={msg} />

      {(!filtro.turma_id || !discId) && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Seleccione uma turma e uma disciplina para lançar notas.
        </div>
      )}
      {loading && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A carregar...</div>}
      {!loading && filtro.turma_id && discId && alunos.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem alunos matriculados nesta turma.</div>
      )}

      {!loading && alunos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">{alunos.length} alunos</p>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? "A guardar..." : "Guardar Notas"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-600 px-2 py-2 text-center w-8" rowSpan={2}>Nº</th>
                  <th className="border border-slate-600 px-3 py-2 text-left min-w-[180px]" rowSpan={2}>Nome do Aluno</th>
                  <th className="border border-slate-600 px-1 py-2 text-center text-[10px]" colSpan={2}>Faltas</th>
                  <th className="border border-slate-600 px-1 py-2 text-center text-[10px]" colSpan={3}>Componentes</th>
                  <th className="border border-slate-600 px-2 py-2 text-center text-[10px] text-amber-300 font-bold" rowSpan={2}>MT</th>
                  <th className="border border-slate-600 px-2 py-2 text-center text-[10px]" rowSpan={2}>Resultado</th>
                </tr>
                <tr className="bg-slate-700 text-white">
                  <th className="border border-slate-600 px-1 py-1 text-center w-12 text-[10px]">Just.</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-12 text-[10px]">Injust.</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-16 text-[10px] text-sky-300">MAC</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-16 text-[10px] text-sky-300">NPP</th>
                  <th className="border border-slate-600 px-1 py-1 text-center w-16 text-[10px] text-sky-300">NPT</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, idx) => {
                  const c  = draft[aluno.id] ?? { fj: "", fi: "", mac: "", npp: "", npt: "" };
                  const mt = calcMT(c.mac, c.npp, c.npt);
                  const mtNum = mt != null ? Number(mt) : null;
                  return (
                    <tr key={aluno.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="border border-slate-100 px-2 py-0.5 text-center text-slate-500 font-mono">{aluno.ord}</td>
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
                      {/* MT calculado automaticamente */}
                      <td className={`border border-slate-100 px-2 py-0.5 text-center font-bold w-14
                        ${mtNum != null ? (mtNum >= 10 ? "text-blue-700" : "text-red-600") : "text-slate-300"}`}>
                        {mt ?? "—"}
                      </td>
                      <td className="border border-slate-100 px-2 py-0.5 text-center">
                        {mtNum != null
                          ? <span className={`text-xs font-semibold ${mtNum >= 10 ? "text-emerald-600" : "text-red-500"}`}>
                              {mtNum >= 10 ? "Aprovado" : "Reprovado"}
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
            <span><strong className="text-amber-600">MT</strong> = Média Trimestral (calculada automaticamente)</span>
            <span className="text-blue-600">● ≥ 10 Aprovado</span>
            <span className="text-red-500">● &lt; 10 Reprovado</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   TAB B: Pauta Completa — mostra MT por disciplina
───────────────────────────────────────────────────── */
function PautaCompleta({ filtro, setFiltro, turmas }) {
  const [pautaData, setPautaData] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState(null);

  const loadPauta = useCallback(async () => {
    if (!filtro.turma_id) return;
    setLoading(true); setMsg(null); setPautaData(null);
    try {
      const { data } = await api.get("/notas/pauta", { params: filtro });
      setPautaData(data);
    } catch {
      setMsg({ type: "error", text: "Erro ao carregar pauta." });
    } finally { setLoading(false); }
  }, [filtro]);

  useEffect(() => { loadPauta(); }, [filtro.turma_id, filtro.periodo, filtro.ano_letivo]);

  return (
    <div className="space-y-4">
      <Filtros filtro={filtro} setFiltro={setFiltro} turmas={turmas} extraSlot={null} />
      <MsgBanner msg={msg} />

      {!filtro.turma_id && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Seleccione uma turma para ver a pauta.
        </div>
      )}
      {loading && <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">A carregar...</div>}

      {pautaData && !loading && pautaData.disciplinas.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800 text-sm">
          <p className="font-semibold">Esta turma não tem disciplinas atribuídas na Pauta Completa.</p>
          <p className="mt-1">Use o separador <strong>Por Disciplina</strong> para lançar notas individualmente.</p>
        </div>
      )}

      {pautaData && !loading && pautaData.disciplinas.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{pautaData.alunos.length} alunos · {pautaData.disciplinas.length} disciplinas</p>
            <Link
              to={`/notas/pauta?turma_id=${filtro.turma_id}&periodo=${filtro.periodo}&ano_letivo=${encodeURIComponent(filtro.ano_letivo)}`}
              target="_blank"
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
              <Printer size={15} /> Pauta Trimestral
            </Link>
            <Link
              to={`/notas/pauta?turma_id=${filtro.turma_id}&ano_letivo=${encodeURIComponent(filtro.ano_letivo)}&anual=1`}
              target="_blank"
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
              <Printer size={15} /> Pauta Anual
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-600 px-2 py-2 text-center w-8" rowSpan={2}>Nº</th>
                  <th className="border border-slate-600 px-3 py-2 text-left min-w-[180px]" rowSpan={2}>Nome do Aluno</th>
                  {pautaData.disciplinas.map(d => (
                    <th key={d.id} className="border border-slate-600 px-1 py-1.5 text-center font-semibold text-[9px]" colSpan={5}>
                      {d.nome}
                    </th>
                  ))}
                  <th className="border border-slate-600 px-2 py-1.5 text-center font-semibold text-emerald-300 text-[10px]" rowSpan={2}>MG</th>
                </tr>
                <tr className="bg-slate-700 text-white">
                  {pautaData.disciplinas.flatMap(d => [
                    <th key={`${d.id}-fj`}  className="border border-slate-600 px-0.5 py-1 text-center w-8 text-[9px]">FJ</th>,
                    <th key={`${d.id}-fi`}  className="border border-slate-600 px-0.5 py-1 text-center w-8 text-[9px]">FI</th>,
                    <th key={`${d.id}-mac`} className="border border-slate-600 px-0.5 py-1 text-center w-10 text-[9px] text-sky-300">MAC</th>,
                    <th key={`${d.id}-npp`} className="border border-slate-600 px-0.5 py-1 text-center w-10 text-[9px] text-sky-300">NPP</th>,
                    <th key={`${d.id}-mt`}  className="border border-slate-600 px-0.5 py-1 text-center w-12 text-[9px] text-amber-300 font-bold">MT</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {pautaData.alunos.map((aluno, idx) => {
                  const mts = pautaData.disciplinas
                    .map(d => aluno.notas[d.id]?.mt)
                    .filter(v => v != null);
                  const mg    = mts.length ? (mts.reduce((s, v) => s + Number(v), 0) / mts.length).toFixed(1) : null;
                  const mgNum = mg != null ? Number(mg) : null;
                  return (
                    <tr key={aluno.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="border border-slate-100 px-2 py-1 text-center text-slate-500 font-mono">{aluno.ord}</td>
                      <td className="border border-slate-100 px-3 py-1 font-medium text-slate-800 whitespace-nowrap">{aluno.nome}</td>
                      {pautaData.disciplinas.flatMap(d => {
                        const n   = aluno.notas[d.id];
                        const mt  = n?.mt != null ? Number(n.mt) : null;
                        return [
                          <td key={`${aluno.id}_${d.id}_fj`}  className="border border-slate-100 px-1 py-1 text-center text-slate-500">{n?.falta_justificada   > 0 ? n.falta_justificada   : ""}</td>,
                          <td key={`${aluno.id}_${d.id}_fi`}  className="border border-slate-100 px-1 py-1 text-center text-slate-500">{n?.falta_injustificada > 0 ? n.falta_injustificada : ""}</td>,
                          <td key={`${aluno.id}_${d.id}_mac`} className="border border-slate-100 px-1 py-1 text-center text-slate-600">{n?.mac != null ? Number(n.mac).toFixed(1) : ""}</td>,
                          <td key={`${aluno.id}_${d.id}_npp`} className="border border-slate-100 px-1 py-1 text-center text-slate-600">{n?.npp != null ? Number(n.npp).toFixed(1) : ""}</td>,
                          <td key={`${aluno.id}_${d.id}_mt`}  className={`border border-slate-100 px-1 py-1 text-center font-bold ${mt != null ? (mt >= 10 ? "text-blue-700" : "text-red-600") : "text-slate-300"}`}>
                            {mt != null ? mt.toFixed(1) : "—"}
                          </td>,
                        ];
                      })}
                      <td className={`border border-slate-100 px-2 py-1 text-center font-bold ${mgNum != null ? (mgNum >= 10 ? "text-emerald-600" : "text-red-500") : "text-slate-300"}`}>
                        {mg ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
              <span><strong>FJ/FI</strong> = Faltas Just./Injust.</span>
              <span><strong className="text-sky-600">MAC</strong> = Av. Contínua</span>
              <span><strong className="text-sky-600">NPP</strong> = Prova Prática</span>
              <span><strong className="text-amber-600">MT</strong> = Média Trimestral</span>
              <span><strong className="text-emerald-600">MG</strong> = Média Geral</span>
              <span className="text-blue-600">● ≥ 10 Aprovado</span>
              <span className="text-red-500">● &lt; 10 Reprovado</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   PÁGINA PRINCIPAL
───────────────────────────────────────────────────── */
export default function Notas() {
  const [tab,    setTab]    = useState("disciplina");
  const [turmas, setTurmas] = useState([]);
  const [filtro, setFiltro] = useState({ turma_id: "", periodo: "1", ano_letivo: "2025-2026" });

  useEffect(() => { api.get("/turmas").then(r => setTurmas(r.data)); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Notas &amp; Avaliações</h1>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-medium">
          <button onClick={() => setTab("disciplina")}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${tab === "disciplina" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <List size={14} /> Por Disciplina
          </button>
          <button onClick={() => setTab("pauta")}
            className={`flex items-center gap-1.5 px-4 py-2 transition-colors ${tab === "pauta" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
            <LayoutGrid size={14} /> Pauta Completa
          </button>
        </div>
      </div>

      {tab === "disciplina"
        ? <PorDisciplina filtro={filtro} setFiltro={setFiltro} turmas={turmas} />
        : <PautaCompleta filtro={filtro} setFiltro={setFiltro} turmas={turmas} />
      }
    </div>
  );
}
