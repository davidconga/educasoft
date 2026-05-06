import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Mail, Phone, Search, Trash2, Inbox } from "lucide-react";

const ESTADO_BADGE = {
  novo:       "bg-blue-100 text-blue-700",
  em_curso:   "bg-yellow-100 text-yellow-700",
  resolvido:  "bg-green-100 text-green-700",
  arquivado:  "bg-gray-100 text-gray-500",
};
const ESTADO_LABEL = { novo: "Novo", em_curso: "Em curso", resolvido: "Resolvido", arquivado: "Arquivado" };

export default function SuperAdminContactos() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("");
  const [activo, setActivo] = useState(null);
  const [nota, setNota] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const params = {};
      if (busca) params.q = busca;
      if (estado) params.estado = estado;
      const { data } = await api.get("/contactos", { params });
      setList(data.data || data);
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, [busca, estado]);

  async function actualizarEstado(c, novo) {
    await api.patch(`/contactos/${c.id}`, { estado: novo });
    carregar();
    if (activo?.id === c.id) setActivo({ ...c, estado: novo });
  }

  async function guardarNota() {
    if (!activo) return;
    await api.patch(`/contactos/${activo.id}`, { nota_admin: nota });
    setActivo({ ...activo, nota_admin: nota });
    carregar();
  }

  async function eliminar(c) {
    if (!confirm(`Eliminar contacto de ${c.nome}?`)) return;
    await api.delete(`/contactos/${c.id}`);
    if (activo?.id === c.id) setActivo(null);
    carregar();
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mensagens recebidas pelo formulário do site.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar..."
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200">
            <option value="">Todos os estados</option>
            {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 min-h-[500px]">
          {/* Lista */}
          <div className="border-r">
            {loading ? (
              <p className="text-center text-gray-400 text-sm py-10">A carregar...</p>
            ) : list.length === 0 ? (
              <div className="text-center text-gray-400 py-16">
                <Inbox size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sem mensagens.</p>
              </div>
            ) : list.map((c) => (
              <button key={c.id} onClick={() => { setActivo(c); setNota(c.nota_admin || ""); }}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${activo?.id === c.id ? "bg-blue-50" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-gray-800 truncate flex-1">{c.nome}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_BADGE[c.estado] ?? ESTADO_BADGE.novo}`}>
                    {ESTADO_LABEL[c.estado] ?? c.estado}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                {c.escola && <p className="text-xs text-gray-600 truncate">🏫 {c.escola}</p>}
                <p className="text-xs text-gray-700 line-clamp-2 mt-1">{c.mensagem}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(c.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>

          {/* Detalhe */}
          <div className="md:col-span-2 p-5">
            {!activo ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p className="text-sm">Selecciona uma mensagem.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-800">{activo.nome}</h2>
                    <p className="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
                      <a href={`mailto:${activo.email}`} className="flex items-center gap-1 hover:text-blue-600"><Mail size={12} /> {activo.email}</a>
                      {activo.telefone && <a href={`tel:${activo.telefone}`} className="flex items-center gap-1 hover:text-blue-600"><Phone size={12} /> {activo.telefone}</a>}
                      {activo.escola && <span>🏫 {activo.escola}</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">Recebido em {new Date(activo.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <select value={activo.estado} onChange={(e) => actualizarEstado(activo, e.target.value)}
                      className="text-xs border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-300">
                      {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button onClick={() => eliminar(activo)}
                      className="text-xs text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <Trash2 size={12} /> Eliminar
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap mb-4">
                  {activo.mensagem}
                </div>

                <label className="block text-xs font-semibold text-gray-600 mb-1">Nota interna</label>
                <textarea rows={4} value={nota} onChange={(e) => setNota(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                <div className="flex justify-end mt-2">
                  <button onClick={guardarNota}
                    className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md">
                    Guardar nota
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
