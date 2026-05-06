import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { School, CheckCircle2, Clock, Star, MessageCircle, Inbox, TrendingUp, Receipt, AlertCircle } from "lucide-react";

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

const PLANO_COLOR = {
  basico:   "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-700",
  premium:  "bg-purple-100 text-purple-700",
};

export default function SuperAdminDashboard() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);
  const [data, setData] = useState(null);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get("/dashboard"), api.get("/escolas?per_page=100")])
      .then(([dRes, eRes]) => {
        setData(dRes.data);
        setEscolas(eRes.data.data || eRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const recentes = [...escolas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
  const pendentes = escolas.filter(e => !e.ativo);
  const planoEntries = data?.por_plano ? Object.entries(data.por_plano) : [];
  const totalEscolas = data?.total_escolas ?? escolas.length;

  const stats = [
    { label: "Total de Escolas",   value: totalEscolas,                 color: "bg-blue-600",   Icon: School },
    { label: "Escolas Activas",    value: data?.escolas_ativas ?? 0,    color: "bg-green-600",  Icon: CheckCircle2 },
    { label: "Cadastros Pendentes", value: data?.escolas_pendentes ?? 0, color: "bg-yellow-500", Icon: Clock },
    { label: "Adesões (7 dias)",   value: data?.adesoes_7d ?? 0,        color: "bg-indigo-600", Icon: TrendingUp },
  ];

  const alertas = [
    data?.escolas_pendentes > 0 && { tipo: "warning", icon: Clock, txt: `${data.escolas_pendentes} cadastro${data.escolas_pendentes !== 1 ? "s" : ""} pendente${data.escolas_pendentes !== 1 ? "s" : ""}`, to: "/super-admin/escolas" },
    data?.facturas_vencidas > 0 && { tipo: "warning", icon: AlertCircle, txt: `${data.facturas_vencidas} factura${data.facturas_vencidas !== 1 ? "s" : ""} vencida${data.facturas_vencidas !== 1 ? "s" : ""}`, to: "/super-admin/facturas?estado=pendente" },
    data?.chats_nao_lidos > 0   && { tipo: "info",    icon: MessageCircle, txt: `${data.chats_nao_lidos} mensagens não lidas no chat`, to: "/super-admin/chat" },
    data?.contactos_novos > 0   && { tipo: "info",    icon: Inbox, txt: `${data.contactos_novos} contacto${data.contactos_novos !== 1 ? "s" : ""} novo${data.contactos_novos !== 1 ? "s" : ""}`, to: "/super-admin/contactos" },
  ].filter(Boolean);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Visão geral da plataforma Educajá</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-20">A carregar...</p>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map(({ label, value, color, Icon }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm border p-5 flex items-center gap-4">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Alertas */}
          {alertas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {alertas.map((a, i) => {
                const Icon = a.icon;
                const cls = a.tipo === "warning"
                  ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                  : "bg-blue-50 border-blue-200 text-blue-800";
                return (
                  <Link to={a.to} key={i}
                    className={`flex items-center gap-3 p-4 border rounded-xl hover:shadow-sm transition-shadow ${cls}`}>
                    <Icon size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{a.txt}</p>
                    </div>
                    <span className="text-xs">→</span>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recentes */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border">
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

            {/* Resumo lateral */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="font-semibold text-gray-800 mb-4">Distribuição por Plano</h2>
                {["basico", "standard", "premium"].map(plano => {
                  const count = Number(data?.por_plano?.[plano] ?? planoEntries.find(([p]) => p === plano)?.[1] ?? 0);
                  const pct   = totalEscolas ? Math.round((count / totalEscolas) * 100) : 0;
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

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Receipt size={16} className="text-green-600" /> Facturação
                </h2>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex justify-between text-gray-700">
                    <span>Pago este mês</span>
                    <span className="font-semibold text-green-700">{formatAOA(data?.valor_pago_mes ?? 0)}</span>
                  </li>
                  <li className="flex justify-between text-gray-700">
                    <span>Pendente total</span>
                    <span className="font-semibold text-orange-600">{formatAOA(data?.valor_pendente ?? 0)}</span>
                  </li>
                  <li className="flex justify-between text-gray-700">
                    <span>Facturas pendentes</span>
                    <span className="font-semibold">{data?.facturas_pendentes ?? 0}</span>
                  </li>
                </ul>
                <Link to="/super-admin/facturas" className="block text-xs text-blue-600 hover:underline mt-3 text-right">Ver facturação →</Link>
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h2 className="font-semibold text-gray-800 mb-3">Atividade</h2>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex justify-between text-gray-700">
                    <span>Adesões (30 dias)</span>
                    <span className="font-semibold">{data?.adesoes_30d ?? 0}</span>
                  </li>
                  <li className="flex justify-between text-gray-700">
                    <span>Chats abertos</span>
                    <span className="font-semibold">{data?.chats_abertos ?? 0}</span>
                  </li>
                  <li className="flex justify-between text-gray-700">
                    <span>Contactos no total</span>
                    <span className="font-semibold">{data?.contactos_total ?? 0}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
