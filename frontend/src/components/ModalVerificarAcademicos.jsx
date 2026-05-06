import { useState, useEffect, useMemo } from "react";
import api from "../services/api";

/**
 * Modal de verificação de dados académicos (curso, classe, turma, turno, ano lectivo).
 * Reposição de dados (Golfinho).
 */
export default function ModalVerificarAcademicos({ aluno, onClose, onSaved }) {
  const [cursos, setCursos]   = useState([]);
  const [classes, setClasses] = useState([]);
  const [turmas, setTurmas]   = useState([]);

  const matAtiva = useMemo(() => {
    const lista = aluno?.matriculas || [];
    if (!lista.length) return null;
    const score = (m) => {
      let s = 0;
      if (m?.status === "activa")     s += 100;
      if (m?.status === "confirmada") s += 80;
      const anos = String(m?.ano_letivo || "").match(/\d{4}/g);
      if (anos?.length) s += parseInt(anos[anos.length - 1], 10);
      s += (m?.id || 0) / 1e9;
      return s;
    };
    return [...lista].sort((a, b) => score(b) - score(a))[0];
  }, [aluno]);

  const [cursoId, setCursoId]   = useState(matAtiva?.turma?.classe?.curso?.id || "");
  const [classeId, setClasseId] = useState(matAtiva?.turma?.classe?.id || "");
  const [turmaId, setTurmaId]   = useState(matAtiva?.turma?.id || "");
  const [anoLetivo, setAnoLetivo] = useState("2025-2026");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data || [])).catch(() => {});
    api.get("/classes").then(r => setClasses(r.data || [])).catch(() => {});
    api.get("/turmas").then(r => setTurmas(r.data || [])).catch(() => {});
  }, []);

  const classesFiltradas = cursoId ? classes.filter(c => String(c.curso_id) === String(cursoId)) : classes;
  const turmasFiltradas  = classeId ? turmas.filter(t => String(t.classe_id) === String(classeId)) : turmas;
  const turmaSel = turmas.find(t => String(t.id) === String(turmaId));

  const salvar = async () => {
    if (!turmaId) { alert("Selecciona uma turma."); return; }
    setSaving(true);
    try {
      const r = await api.patch(`/alunos/${aluno.id}/verificar-dados-academicos`, {
        turma_id: turmaId, ano_letivo: anoLetivo,
      });
      onSaved(r.data.aluno);
    } catch (e) {
      alert(e.response?.data?.message || "Falha ao guardar.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="p-5 border-b">
          <h2 className="text-lg font-semibold">📋 Verificar dados académicos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Antes de confirmar pagamentos, valida o curso, classe, turma e turno do aluno
            <strong> {aluno?.user?.nome || aluno?.nome}</strong>.
          </p>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
            <select value={cursoId} onChange={e => { setCursoId(e.target.value); setClasseId(""); setTurmaId(""); }}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">— Selecciona —</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
            <select value={classeId} onChange={e => { setClasseId(e.target.value); setTurmaId(""); }}
              disabled={!cursoId} className="w-full border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
              <option value="">— Selecciona —</option>
              {classesFiltradas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Turma</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)}
              disabled={!classeId} className="w-full border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
              <option value="">— Selecciona —</option>
              {turmasFiltradas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Turno (auto)</label>
            <input value={turmaSel?.turnoObj?.nome || turmaSel?.turno || "—"} readOnly
              className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-600" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ano lectivo</label>
            <div className="flex flex-wrap gap-2">
              {["2023-2024", "2024-2025", "2025-2026", "2026-2027"].map(a => {
                const ativo = a === "2025-2026";
                const sel   = anoLetivo === a;
                return (
                  <button key={a} type="button" onClick={() => setAnoLetivo(a)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                      ${sel
                        ? (ativo ? "bg-emerald-600 text-white border-emerald-600" : "bg-blue-600 text-white border-blue-600")
                        : (ativo ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 ring-1 ring-emerald-200" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")
                      }`}>
                    {a}{ativo && <span className="ml-1.5 text-[10px] opacity-80">★ activo</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-5 border-t flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            Mais tarde
          </button>
          <button onClick={salvar} disabled={saving || !turmaId}
            className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
            {saving ? "A guardar..." : "✓ Confirmar e prosseguir"}
          </button>
        </div>
      </div>
    </div>
  );
}
