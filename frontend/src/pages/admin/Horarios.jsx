import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import api from "../../services/api";
import { imprimirHorarioTurma } from "../../components/ImprimirHorario";
import { useAuthStore } from "../../store/auth";

const DIAS = ["segunda","terca","quarta","quinta","sexta","sabado"];
const DIAS_LABEL = { segunda:"Seg",terca:"Ter",quarta:"Qua",quinta:"Qui",sexta:"Sex",sabado:"Sáb" };

export default function Horarios() {
  const { escola } = useAuthStore();
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [turmaSel, setTurmaSel] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ turma_id:"", disciplina_id:"", professor_id:"", dia_semana:"segunda", hora_inicio:"08:00", hora_fim:"09:30", sala:"" });
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/turmas").then(r=>setTurmas(r.data));
    api.get("/disciplinas").then(r=>setDisciplinas(r.data));
    api.get("/professores").then(r=>setProfessores(r.data.data||r.data));
  }, []);

  useEffect(() => {
    if (!turmaSel) return;
    api.get(`/horarios?turma_id=${turmaSel}`).then(r=>setHorarios(r.data));
    setForm(f=>({...f,turma_id:turmaSel}));
  }, [turmaSel]);

  const handleSave = async (e) => {
    e.preventDefault(); setError("");
    try { await api.post("/horarios", form); setShowForm(false); if(turmaSel) api.get(`/horarios?turma_id=${turmaSel}`).then(r=>setHorarios(r.data)); }
    catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
  };

  const getHorarioPorDia = (dia) => horarios.filter(h=>h.dia_semana===dia);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🕐 Horários</h1>
        <div className="flex items-center gap-2">
          {turmaSel && (
            <button
              onClick={() => imprimirHorarioTurma(turmas.find(t=>String(t.id)===String(turmaSel)), horarios, escola)}
              className="flex items-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Printer size={15}/> Imprimir
            </button>
          )}
          <button onClick={() => setShowForm(true)} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Adicionar Aula</button>
        </div>
      </div>
      <div className="mb-6">
        <select value={turmaSel} onChange={e=>setTurmaSel(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Seleccionar Turma...</option>{turmas.map(t=><option key={t.id} value={t.id}>{t.nome} — {t.nivel}</option>)}
        </select>
      </div>
      {turmaSel && (
        <div className="grid grid-cols-6 gap-3">
          {DIAS.map(dia=>(
            <div key={dia} className="bg-white rounded-xl p-3 shadow-sm">
              <h3 className="font-semibold text-gray-700 text-sm mb-3 text-center border-b pb-2">{DIAS_LABEL[dia]}</h3>
              <div className="space-y-2">
                {getHorarioPorDia(dia).map(h=>(
                  <div key={h.id} className="bg-blue-50 rounded-lg p-2 text-xs">
                    <p className="font-semibold text-blue-800">{h.hora_inicio}–{h.hora_fim}</p>
                    <p className="text-gray-700 mt-0.5">{h.disciplina?.nome}</p>
                    <p className="text-gray-500">{h.professor?.user?.nome}</p>
                    {h.sala && <p className="text-gray-400">Sala: {h.sala}</p>}
                    <button onClick={()=>api.delete(`/horarios/${h.id}`).then(()=>api.get(`/horarios?turma_id=${turmaSel}`).then(r=>setHorarios(r.data)))} className="text-red-400 hover:text-red-600 mt-1">✕ remover</button>
                  </div>
                ))}
                {getHorarioPorDia(dia).length===0 && <p className="text-xs text-gray-300 text-center py-2">Livre</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!turmaSel && <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">Seleccione uma turma para ver o horário.</div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between"><h2 className="text-lg font-semibold">Nova Aula</h2><button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button></div>
            {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded text-sm">{error}</div>}
            <form onSubmit={handleSave} className="p-6 space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Turma *</label><select required value={form.turma_id} onChange={e=>setForm({...form,turma_id:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar...</option>{turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Disciplina *</label><select required value={form.disciplina_id} onChange={e=>setForm({...form,disciplina_id:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar...</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Professor *</label><select required value={form.professor_id} onChange={e=>setForm({...form,professor_id:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar...</option>{professores.map((p)=><option key={p.id} value={p.id}>{p.user?.nome}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Dia *</label><select required value={form.dia_semana} onChange={e=>setForm({...form,dia_semana:e.target.value})} className="w-full border rounded-lg px-3 py-2">{DIAS.map(d=><option key={d} value={d}>{DIAS_LABEL[d]}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Início *</label><input type="time" required value={form.hora_inicio} onChange={e=>setForm({...form,hora_inicio:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Fim *</label><input type="time" required value={form.hora_fim} onChange={e=>setForm({...form,hora_fim:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sala</label><input value={form.sala} onChange={e=>setForm({...form,sala:e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="Ex: Sala 5" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-800 text-white py-2 rounded-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
