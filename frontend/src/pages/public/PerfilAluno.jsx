import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function mesAbrev(ref) {
  if (!ref) return "—";
  // "Setembro 2025" → "Set"
  const partes = ref.split(" ");
  if (partes.length === 2) {
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const idx = meses.findIndex(m => ref.startsWith(m));
    return idx >= 0 ? MESES[idx] : partes[0].slice(0,3);
  }
  // "2025-09"
  const parts = ref.split("-");
  if (parts.length >= 2) return MESES[parseInt(parts[parts.length-1]) - 1] ?? ref;
  return ref;
}

export default function PerfilAluno() {
  const { escola, numero } = useParams();
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState("");

  useEffect(() => {
    axios.get(`/api/tenant/public/aluno/${numero}?tenant=${escola}`)
      .then(r => setDados(r.data))
      .catch(() => setErro("Aluno não encontrado ou escola inválida."))
      .finally(() => setLoading(false));
  }, [escola, numero]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-400 text-sm">A carregar...</div>
    </div>
  );

  if (erro) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm w-full">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-gray-600 text-sm">{erro}</p>
      </div>
    </div>
  );

  const { escola: esc, aluno, matricula, pagamentos, notas } = dados;
  const logoUrl = esc?.logo ? `/storage/${esc.logo}` : null;
  const fotoUrl = aluno?.foto ? `/storage/${aluno.foto}` : null;
  const mediaGeral = notas?.media_geral;

  const corMedia = (m) => {
    if (m === null || m === undefined) return "text-gray-400";
    if (m >= 14) return "text-green-600";
    if (m >= 10) return "text-blue-600";
    return "text-red-500";
  };

  // Agrupa notas por disciplina
  const notasPorDisc = {};
  (notas?.lista ?? []).forEach(n => {
    if (!notasPorDisc[n.disciplina]) notasPorDisc[n.disciplina] = [];
    notasPorDisc[n.disciplina].push(n);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 pb-10">
      {/* Header escola */}
      <div className="text-center pt-8 pb-4 px-4">
        {logoUrl
          ? <img src={logoUrl} alt="logo" className="w-20 h-20 rounded-full object-cover border-2 border-white/40 mx-auto mb-2" />
          : <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-2">{esc?.nome?.charAt(0)}</div>
        }
        <h1 className="text-white font-bold text-lg leading-tight">{esc?.nome}</h1>
        <p className="text-blue-200 text-xs mt-0.5">Perfil de Estudante</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4">
        {/* Card do aluno */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-4 p-5">
            {fotoUrl
              ? <img src={fotoUrl} alt="foto" className="w-20 h-24 object-cover object-top rounded-xl border border-gray-200 flex-shrink-0" />
              : <div className="w-20 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-4xl flex-shrink-0">👤</div>
            }
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{aluno?.nome}</h2>
              <p className="text-blue-700 font-mono text-sm mt-0.5">Nº {aluno?.numero_aluno}</p>
              {matricula && (
                <div className="mt-2 space-y-0.5">
                  {matricula.curso  && <p className="text-xs text-gray-500"><span className="font-semibold">Curso:</span> {matricula.curso}</p>}
                  {matricula.classe && <p className="text-xs text-gray-500"><span className="font-semibold">Classe:</span> {matricula.classe}</p>}
                  {matricula.turma  && <p className="text-xs text-gray-500"><span className="font-semibold">Turma:</span> {matricula.turma}</p>}
                  {matricula.ano_letivo && <p className="text-xs text-gray-400">Ano: {matricula.ano_letivo}</p>}
                </div>
              )}
            </div>
          </div>
          {mediaGeral !== null && mediaGeral !== undefined && (
            <div className={`border-t px-5 py-2 flex items-center justify-between`}>
              <span className="text-xs text-gray-500">Média Geral</span>
              <span className={`text-lg font-bold ${corMedia(mediaGeral)}`}>{mediaGeral} valores</span>
            </div>
          )}
        </div>

        {/* Propinas */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            💰 Propinas
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{pagamentos?.total_pago}</div>
              <div className="text-xs text-green-600 mt-0.5">Pagas</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{pagamentos?.total_pendente}</div>
              <div className="text-xs text-yellow-600 mt-0.5">Pendentes</div>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <div className="text-sm font-bold text-red-600">{Number(pagamentos?.valor_em_divida ?? 0).toLocaleString("pt-AO")} Kz</div>
              <div className="text-xs text-red-500 mt-0.5">Em dívida</div>
            </div>
          </div>
          {/* Calendário de propinas */}
          <div className="flex flex-wrap gap-1.5">
            {(pagamentos?.lista ?? []).map((p, i) => (
              <div key={i} className={`flex flex-col items-center rounded-lg px-2 py-1 text-center min-w-10
                ${p.status === "pago" ? "bg-green-100 text-green-700" :
                  p.status === "vencido" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"}`}>
                <span className="text-xs font-semibold">{mesAbrev(p.mes_referencia)}</span>
                <span className="text-xs">{p.status === "pago" ? "✓" : "✗"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notas */}
        {Object.keys(notasPorDisc).length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <h3 className="font-bold text-gray-800 mb-3">📚 Aproveitamento</h3>
            <div className="space-y-2">
              {Object.entries(notasPorDisc).map(([disc, rows]) => (
                <div key={disc} className="border border-gray-100 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-800 mb-1.5">{disc}</p>
                  <div className="flex flex-wrap gap-2">
                    {rows.map((n, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xs text-gray-400">{n.periodo?.replace(/\d+o\s*/,"T")}</div>
                        <div className={`text-sm font-bold ${corMedia(n.media)}`}>
                          {n.media !== null ? n.media : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé */}
        {(esc?.email || esc?.telefone) && (
          <div className="text-center text-blue-200 text-xs pt-2">
            {esc.email && <div>{esc.email}</div>}
            {esc.telefone && <div>{esc.telefone}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
