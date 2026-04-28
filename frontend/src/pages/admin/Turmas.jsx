import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome:"", nivel:"", turno:"manha", ano_letivo: new Date().getFullYear().toString(), capacidade:"40" });
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); const {data} = await api.get("/turmas"); setTurmas(data); setLoading(false); };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post("/turmas", form); setShowForm(false); load(); }
    catch {} finally { setSaving(false); }
  };

  const turnoLabel = { manha:"🌅 Manhã", tarde:"🌇 Tarde", noite:"🌙 Noite" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏫 Turmas</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Nova Turma</button>
      </div>
      {loading ? <p className="text-center text-gray-500 py-12">A carregar...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turmas.map(t => (
            <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-blue-800">{t.nome}</span>
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">{t.nivel}</span>
              </div>
              <p className="text-sm text-gray-600">{turnoLabel[t.turno]} · {t.ano_letivo}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">👤 {t.matriculas_count || 0} / {t.capacidade} alunos</span>
                <Link to={`/turmas/${t.id}`} className="text-blue-600 hover:underline text-sm">Ver →</Link>
              </div>
            </div>
          ))}
          {turmas.length === 0 && <p className="col-span-3 text-center text-gray-400 py-12">Nenhuma turma criada.</p>}
        </div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between"><h2 className="text-lg font-semibold">Nova Turma</h2><button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button></div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label><input required value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Ex: 12ª A" className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nível *</label><input required value={form.nivel} onChange={e=>setForm({...form,nivel:e.target.value})} placeholder="Ex: 12ª Classe" className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Turno</label><select value={form.turno} onChange={e=>setForm({...form,turno:e.target.value})} className="w-full border rounded-lg px-3 py-2"><option value="manha">Manhã</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Ano Lectivo *</label><input required value={form.ano_letivo} onChange={e=>setForm({...form,ano_letivo:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label><input type="number" value={form.capacidade} onChange={e=>setForm({...form,capacidade:e.target.value})} className="w-full border rounded-lg px-3 py-2" /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-800 text-white py-2 rounded-lg disabled:opacity-60">{saving ? "A guardar..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
