import { useState, useEffect } from "react";
import api from "../../services/api";

const RESULTADO_COLOR = {
  aprovado:  "bg-emerald-50 text-emerald-700",
  reprovado: "bg-red-50 text-red-700",
};

export default function PortalNotas() {
  const [aluno, setAluno]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/portal/me").then(r => setAluno(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  // Agrupar por disciplina + período
  const grouped = {};
  (aluno?.notas ?? []).forEach(n => {
    const disc = n.disciplina?.nome ?? "Sem disciplina";
    if (!grouped[disc]) grouped[disc] = {};
    const per = n.periodo ?? "—";
    if (!grouped[disc][per]) grouped[disc][per] = [];
    grouped[disc][per].push(n);
  });

  const mediaGeral = (() => {
    const notas = aluno?.notas ?? [];
    const comMedia = notas.filter(n => n.media != null);
    if (!comMedia.length) return null;
    return (comMedia.reduce((s, n) => s + Number(n.media), 0) / comMedia.length).toFixed(1);
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Notas</h1>
        {mediaGeral != null && (
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-5 py-3 text-center">
            <p className="text-xs text-slate-400">Média Geral</p>
            <p className={`text-2xl font-bold ${Number(mediaGeral) >= 10 ? "text-emerald-600" : "text-red-600"}`}>
              {mediaGeral}
            </p>
          </div>
        )}
      </div>

      {Object.keys(grouped).length === 0
        ? <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">Sem notas registadas.</div>
        : Object.entries(grouped).map(([disc, periodos]) => (
          <div key={disc} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-800 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-white">{disc}</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Período</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Avaliação Contínua</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Exame</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Média</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(periodos).map(([per, notas]) =>
                  notas.map(n => {
                    const med = n.media ?? (n.nota_continua != null ? Number(n.nota_continua).toFixed(1) : null);
                    const resultado = n.resultado ?? (med != null && Number(med) >= 10 ? "aprovado" : med != null ? "reprovado" : null);
                    return (
                      <tr key={n.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-700 capitalize">{per}</td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {n.nota_continua != null ? Number(n.nota_continua).toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {n.nota_exame != null ? Number(n.nota_exame).toFixed(1) : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-base font-bold ${Number(med) >= 10 ? "text-emerald-600" : "text-red-600"}`}>
                            {med ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {resultado ? (
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${RESULTADO_COLOR[resultado] ?? "bg-slate-100 text-slate-500"}`}>
                              {resultado === "aprovado" ? "Aprovado" : "Reprovado"}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ))
      }
    </div>
  );
}
