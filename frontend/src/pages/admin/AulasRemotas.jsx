import { useState, useEffect } from "react";
import api from "../../services/api";

export default function AulasRemotas() {
  const [aulas, setAulas] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ turma_id:"", disciplina_id:"", professor_id:"", titulo:"", descricao:"", data_inicio:"", data_fim:"" });

  const load = async () => { setLoading(true); const {data} = await api.get("/aulas-remotas"); setAulas(data.data||data); setLoading(false); };
  useEffect(() => {
    load();
    api.get("/turmas").then(r=>setTurmas(r.data));
    api.get("/disciplinas").then(r=>setDisciplinas(r.data));
    api.get("/professores").then(r=>setProfessores(r.data.data||r.data));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await api.post("/aulas-remotas", form);
    setShowForm(false); load();
  };

  const statusColor = { agendada:"bg-blue-100 text-blue-700", em_curso:"bg-green-100 text-green-700", concluida:"bg-gray-100 text-gray-600", cancelada:"bg-red-100 text-red-600" };
  const statusLabel = { agendada:"📅 Agendada", em_curso:"🟢 Em Curso", concluida:"✅ Concluída", cancelada:"❌ Cancelada" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📡 Aulas Remotas</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Agendar Aula</button>
      </div>
      {loading ? <p className="text-center text-gray-500 py-12">A carregar...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aulas.map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[a.status]}`}>{statusLabel[a.status]}</span>
                <span className="text-xs text-gray-400">{new Date(a.data_inicio).toLocaleDateString("pt-AO")}</span>
              </div>
              <h3 className="font-semibold text-gray-800 mt-2">{a.titulo}</h3>
              <p className="text-sm text-gray-500 mt-1">{a.turma?.nome} · {a.disciplina?.nome}</p>
              <p className="text-sm text-gray-500">👩‍🏫 {a.professor?.user?.nome}</p>
              {a.status === "agendada" && (
                <a href={a.link_jitsi} target="_blank" rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm w-full">
                  🎥 Entrar na Sala Jitsi
                </a>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                <button onClick={() => api.put(`/aulas-remotas/${a.id}`, {...a, status:"em_curso"}).then(load)} className="text-xs text-green-600 hover:underline">▶ Iniciar</button>
                <button onClick={() => api.put(`/aulas-remotas/${a.id}`, {...a, status:"concluida"}).then(load)} className="text-xs text-gray-500 hover:underline">✓ Concluir</button>
              </div>
            </div>
          ))}
          {aulas.length === 0 && <div className="col-span-3 bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm">Nenhuma aula remota agendada.</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b flex items-center justify-between"><h2 className="text-lg font-semibold">Agendar Aula Remota</h2><button onClick={()=>setShowForm(false)} className="text-gray-400">✕</button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label><input required value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Turma *</label><select required value={form.turma_id} onChange={e=>setForm({...form,turma_id:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar...</option>{turmas.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Disciplina *</label><select required value={form.disciplina_id} onChange={e=>setForm({...form,disciplina_id:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar...</option>{disciplinas.map(d=><option key={d.id} value={d.id}>{d.nome}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Professor *</label><select required value={form.professor_id} onChange={e=>setForm({...form,professor_id:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="">Seleccionar...</option>{professores.map((p)=><option key={p.id} value={p.id}>{p.user?.nome}</option>)}</select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora Início *</label><input type="datetime-local" required value={form.data_inicio} onChange={e=>setForm({...form,data_inicio:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label><textarea value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">💡 O link Jitsi Meet será gerado automaticamente após agendar.</div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-800 text-white py-2 rounded-lg">Agendar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
