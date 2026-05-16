import { useState, useEffect } from "react";
import api from "../../services/api";

const STATUS_COLOR = {
  pago:     "bg-emerald-50 text-emerald-700",
  pendente: "bg-amber-50 text-amber-700",
  vencido:  "bg-red-50 text-red-700",
  cancelado:"bg-slate-100 text-slate-500",
};
const STATUS_LABEL = { pago:"Pago", pendente:"Pendente", vencido:"Vencido", cancelado:"Cancelado" };

export default function PortalFinancas() {
  const [aluno, setAluno]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portal/me").then(r => setAluno(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  const pagamentos = aluno?.pagamentos ?? [];
  const pendentes  = pagamentos.filter(p => p.status === "pendente" || p.status === "vencido");
  const total      = pagamentos.reduce((s, p) => s + (p.status === "pago" ? Number(p.valor) : 0), 0);
  const divida     = pendentes.reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Finanças</h1>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Pago",    value: total,  color: "text-emerald-600" },
          { label: "Em Dívida",     value: divida, color: "text-red-600" },
          { label: "Nº Pagamentos", value: pagamentos.length, color: "text-blue-600", raw: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>
              {s.raw ? s.value : `${Number(s.value).toLocaleString("pt-PT")} Kz`}
            </p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {pagamentos.length === 0
          ? <p className="text-center text-slate-400 py-12">Sem pagamentos registados.</p>
          : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pagamentos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {p.descricao ?? p.plano?.nome ?? p.emolumento?.nome ?? "Pagamento"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.data_vencimento ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">
                      {Number(p.valor).toLocaleString("pt-PT")} Kz
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
