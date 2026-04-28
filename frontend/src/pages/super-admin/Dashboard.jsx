import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";

const PLANO_COLOR = {
  basico:   "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-700",
  premium:  "bg-purple-100 text-purple-700",
};

export default function SuperAdminDashboard() {
  const { token } = useCentralAuth();
  const [data, setData] = useState(null);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = axios.create({ baseURL: "/api/v1", headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    Promise.all([api.get("/dashboard"), api.get("/escolas?per_page=100")])
      .then(([dRes, eRes]) => {
        setData(dRes.data);
        setEscolas(eRes.data.data || eRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const pendentes  = escolas.filter(e => !e.ativo);
  const ativas     = escolas.filter(e =>  e.ativo);
  const premium    = escolas.filter(e => e.plano === "premium");
  const recentes   = [...escolas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

  const stats = [
    { label: "Total de Escolas",     value: escolas.length, color: "bg-blue-600",   icon: "🏫" },
    { label: "Escolas Activas",      value: ativas.length,  color: "bg-green-600",  icon: "✅" },
    { label: "Cadastros Pendentes",  value: pendentes.length, color: "bg-yellow-500", icon: "⏳" },
    { label: "Plano Premium",        value: premium.length, color: "bg-purple-600", icon: "⭐" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Visão geral da plataforma EduSoft</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-20">A carregar...</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
                <div className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-xl flex-shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Recentes */}
            <div className="col-span-2 bg-white rounded-xl shadow-sm border">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Escolas Recentes</h2>
                <Link to="/super-admin/escolas" className="text-sm text-blue-600 hover:underline">Ver todas →</Link>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Escola</th>
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                    <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentes.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-800">{e.nome}</p>
                        <p className="text-xs text-gray-400 font-mono">{e.codigo}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLANO_COLOR[e.plano] ?? "bg-gray-100 text-gray-600"}`}>
                          {e.plano}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${e.ativo ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {e.ativo ? "Activa" : "Pendente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {recentes.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-10 text-gray-400 text-sm">Nenhuma escola registada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              {/* Planos */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="font-semibold text-gray-800 mb-4">Distribuição por Plano</h2>
                {["basico", "standard", "premium"].map(plano => {
                  const count = escolas.filter(e => e.plano === plano).length;
                  const pct   = escolas.length ? Math.round((count / escolas.length) * 100) : 0;
                  return (
                    <div key={plano} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-medium text-gray-700">{plano}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${plano === "premium" ? "bg-purple-500" : plano === "standard" ? "bg-blue-500" : "bg-gray-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pendentes alert */}
              {pendentes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="font-semibold text-yellow-800 text-sm mb-1">⏳ {pendentes.length} cadastro{pendentes.length !== 1 ? "s" : ""} pendente{pendentes.length !== 1 ? "s" : ""}</p>
                  <p className="text-xs text-yellow-700 mb-3">Aguarda activação para aceder ao sistema.</p>
                  <Link to="/super-admin/escolas?tab=pendentes" className="text-xs font-semibold text-yellow-800 hover:underline">
                    Activar agora →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
