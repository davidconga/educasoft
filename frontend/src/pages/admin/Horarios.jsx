import { useState, useEffect, useMemo } from "react";
import { Printer } from "lucide-react";
import api from "../../services/api";
import { imprimirHorarioTurma } from "../../components/ImprimirHorario";
import { useAuthStore } from "../../store/auth";

const DIAS = ["segunda","terca","quarta","quinta","sexta","sabado"];
const DIAS_LABEL = { segunda:"Seg",terca:"Ter",quarta:"Qua",quinta:"Qui",sexta:"Sex",sabado:"Sáb" };
const sel = "border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50";

export default function Horarios() {
  const { escola } = useAuthStore();

  // listas base
  const [cursos,      setCursos]      = useState([]);
  const [turnos,      setTurnos]      = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [professores, setProfessores] = useState([]);

  // cascata de filtros
  const [cursoSel,  setCursoSel]  = useState("");
  const [classeSel, setClasseSel] = useState("");
  const [turnoSel,  setTurnoSel]  = useState("");
  const [turmaSel,  setTurmaSel]  = useState("");

  // dados dependentes da cascata
  const [classes, setClasses] = useState([]);
  const [turmas,  setTurmas]  = useState([]);
  const [horarios, setHorarios] = useState([]);

  // form modal (mantém a sua própria cascata)
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ curso_id:"", classe_id:"", turno_id:"", turma_id:"", disciplina_id:"", professor_id:"", dia_semana:"segunda", hora_inicio:"08:00", hora_fim:"09:30", sala:"" });
  const [formClasses, setFormClasses] = useState([]);
  const [formTurmas,  setFormTurmas]  = useState([]);
  const [formDisciplinas, setFormDisciplinas] = useState([]); // disciplinas do plano curricular da classe
  const [error, setError] = useState("");

  // Carga inicial
  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {});
    api.get("/turnos").then(r => setTurnos(r.data.data || r.data)).catch(() => {});
    api.get("/disciplinas").then(r => setDisciplinas(r.data.data || r.data)).catch(() => {});
    api.get("/professores").then(r => setProfessores(r.data.data || r.data)).catch(() => {});
  }, []);

  /* ── Cascata FILTRO (visualização) ── */
  // Quando muda curso → carrega classes
  useEffect(() => {
    setClasseSel(""); setTurmaSel(""); setClasses([]); setTurmas([]); setHorarios([]);
    if (!cursoSel) return;
    api.get(`/classes?curso_id=${cursoSel}`).then(r => setClasses(r.data)).catch(() => {});
  }, [cursoSel]);

  // Quando muda classe ou turno → carrega turmas filtradas
  useEffect(() => {
    setTurmaSel(""); setHorarios([]);
    if (!classeSel) { setTurmas([]); return; }
    const params = new URLSearchParams({ classe_id: classeSel });
    if (turnoSel) params.append("turno_id", turnoSel);
    api.get(`/turmas?${params}`).then(r => setTurmas(r.data)).catch(() => {});
  }, [classeSel, turnoSel]);

  // Quando muda turma → carrega horários
  useEffect(() => {
    if (!turmaSel) { setHorarios([]); return; }
    api.get(`/horarios?turma_id=${turmaSel}`).then(r => setHorarios(r.data));
  }, [turmaSel]);

  /* ── Cascata FORM (criação) ── */
  useEffect(() => {
    setForm(f => ({...f, classe_id:"", turma_id:""}));
    setFormClasses([]); setFormTurmas([]);
    if (!form.curso_id) return;
    api.get(`/classes?curso_id=${form.curso_id}`).then(r => setFormClasses(r.data)).catch(() => {});
  }, [form.curso_id]);

  useEffect(() => {
    setForm(f => ({...f, turma_id:""}));
    if (!form.classe_id) { setFormTurmas([]); return; }
    const params = new URLSearchParams({ classe_id: form.classe_id });
    if (form.turno_id) params.append("turno_id", form.turno_id);
    api.get(`/turmas?${params}`).then(r => setFormTurmas(r.data)).catch(() => {});
  }, [form.classe_id, form.turno_id]);

  // Disciplinas do plano curricular da classe selecionada (em vez do catálogo global)
  useEffect(() => {
    setForm(f => ({...f, disciplina_id:""}));
    if (!form.classe_id) { setFormDisciplinas([]); return; }
    api.get(`/classes/${form.classe_id}/disciplinas`).then(r => setFormDisciplinas(r.data || [])).catch(() => setFormDisciplinas([]));
  }, [form.classe_id]);

  // Quando abrir o form, pré-popular com a turma selecionada se houver
  const openForm = () => {
    if (turmaSel && cursoSel && classeSel) {
      const t = turmas.find(x => String(x.id) === String(turmaSel));
      setForm(f => ({
        ...f,
        curso_id: cursoSel,
        classe_id: classeSel,
        turno_id: turnoSel || t?.turno_id || "",
        turma_id: turmaSel,
      }));
    }
    setShowForm(true);
  };

  const reload = () => { if (turmaSel) api.get(`/horarios?turma_id=${turmaSel}`).then(r => setHorarios(r.data)); };

  const handleSave = async (e) => {
    e.preventDefault(); setError("");
    try {
      const payload = (({ curso_id, classe_id, turno_id, ...rest }) => rest)(form); // remove campos só-de-cascata
      await api.post("/horarios", payload);
      setShowForm(false);
      reload();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
  };

  const turmaSelObj = useMemo(() => turmas.find(t => String(t.id) === String(turmaSel)), [turmas, turmaSel]);

  const getHorarioPorDia = (dia) => horarios.filter(h => h.dia_semana === dia);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🕐 Horários</h1>
        <div className="flex items-center gap-2">
          {turmaSel && (
            <button
              onClick={() => imprimirHorarioTurma(turmaSelObj, horarios, escola)}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Printer size={15}/> Imprimir
            </button>
          )}
          <button onClick={openForm} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Adicionar Aula</button>
        </div>
      </div>

      {/* Cascata de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
          <select value={cursoSel} onChange={e => setCursoSel(e.target.value)} className={sel}>
            <option value="">Seleccionar...</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
          <select value={classeSel} onChange={e => setClasseSel(e.target.value)} disabled={!cursoSel} className={sel}>
            <option value="">{cursoSel ? "Seleccionar..." : "← Curso primeiro"}</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Turno (opcional)</label>
          <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)} disabled={!classeSel} className={sel}>
            <option value="">Todos os turnos</option>
            {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Turma</label>
          <select value={turmaSel} onChange={e => setTurmaSel(e.target.value)} disabled={!classeSel} className={sel}>
            <option value="">{classeSel ? (turmas.length ? "Seleccionar..." : "Sem turmas") : "← Classe primeiro"}</option>
            {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}{t.turnoObj ? ` · ${t.turnoObj.nome}` : ""}</option>)}
          </select>
        </div>
      </div>

      {turmaSel ? (
        <div className="grid grid-cols-6 gap-3">
          {DIAS.map(dia => (
            <div key={dia} className="bg-white rounded-xl p-3 shadow-sm">
              <h3 className="font-semibold text-gray-700 text-sm mb-3 text-center border-b pb-2">{DIAS_LABEL[dia]}</h3>
              <div className="space-y-2">
                {getHorarioPorDia(dia).map(h => (
                  <div key={h.id} className="bg-blue-50 rounded-lg p-2 text-xs">
                    <p className="font-semibold text-blue-800">{h.hora_inicio}–{h.hora_fim}</p>
                    <p className="text-gray-700 mt-0.5">{h.disciplina?.nome}</p>
                    <p className="text-gray-500">{h.professor?.user?.nome}</p>
                    {h.sala && <p className="text-gray-400">Sala: {h.sala}</p>}
                    <button onClick={() => api.delete(`/horarios/${h.id}`).then(reload)} className="text-red-400 hover:text-red-600 mt-1">✕ remover</button>
                  </div>
                ))}
                {getHorarioPorDia(dia).length === 0 && <p className="text-xs text-gray-300 text-center py-2">Livre</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">
          Seleccione Curso → Classe → (Turno) → Turma para ver o horário.
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Nova Aula</h2>
                <p className="text-xs text-slate-400 mt-0.5">Adicionar entrada no horário da turma</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm">{error}</div>
            )}

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Localização: cascata Curso → Classe → Turno → Turma */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Localização</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Curso *</label>
                    <select required value={form.curso_id} onChange={e => setForm({...form, curso_id: e.target.value})} className={sel}>
                      <option value="">Seleccionar...</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Classe *</label>
                    <select required value={form.classe_id} onChange={e => setForm({...form, classe_id: e.target.value})} disabled={!form.curso_id} className={sel}>
                      <option value="">{form.curso_id ? "Seleccionar..." : "← Curso primeiro"}</option>
                      {formClasses.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Turno</label>
                    <select value={form.turno_id} onChange={e => setForm({...form, turno_id: e.target.value})} disabled={!form.classe_id} className={sel}>
                      <option value="">Todos</option>
                      {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Turma *</label>
                    <select required value={form.turma_id} onChange={e => setForm({...form, turma_id: e.target.value})} disabled={!form.classe_id} className={sel}>
                      <option value="">{form.classe_id ? "Seleccionar..." : "← Classe primeiro"}</option>
                      {formTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}{t.turnoObj ? ` · ${t.turnoObj.nome}` : ""}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Aula: disciplina + professor */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Aula</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina *</label>
                    <select required value={form.disciplina_id} onChange={e => setForm({...form, disciplina_id: e.target.value})} disabled={!form.classe_id} className={sel}>
                      <option value="">{form.classe_id ? (formDisciplinas.length ? "Seleccionar..." : "Sem disciplinas no plano") : "← Classe primeiro"}</option>
                      {formDisciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}{d.codigo ? ` (${d.codigo})` : ""}</option>)}
                    </select>
                    {form.classe_id && formDisciplinas.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">⚠ Adicione disciplinas em Cursos → Plano Curricular</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Professor *</label>
                    <select required value={form.professor_id} onChange={e => setForm({...form, professor_id: e.target.value})} className={sel}>
                      <option value="">Seleccionar...</option>
                      {professores.map(p => <option key={p.id} value={p.id}>{p.user?.nome}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Horário: dia + horas + sala */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Horário</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Dia *</label>
                    <select required value={form.dia_semana} onChange={e => setForm({...form, dia_semana: e.target.value})} className={sel}>
                      {DIAS.map(d => <option key={d} value={d}>{DIAS_LABEL[d]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Início *</label>
                    <input type="time" required value={form.hora_inicio} onChange={e => setForm({...form, hora_inicio: e.target.value})} className={sel}/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fim *</label>
                    <input type="time" required value={form.hora_fim} onChange={e => setForm({...form, hora_fim: e.target.value})} className={sel}/>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Sala</label>
                    <input value={form.sala} onChange={e => setForm({...form, sala: e.target.value})} className={sel} placeholder="Ex: Sala 5 · Lab. Informática"/>
                  </div>
                </div>
              </section>
            </form>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
