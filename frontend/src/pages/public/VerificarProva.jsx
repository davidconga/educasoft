import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ShieldCheck, ShieldX, Loader } from "lucide-react";
import axios from "axios";

export default function VerificarProva() {
  const { codigo }         = useParams();
  const [params]           = useSearchParams();
  const tenant             = params.get("tenant");
  const [data,    setData] = useState(null);
  const [loading, setLoad] = useState(true);
  const [erro,    setErro] = useState(false);

  useEffect(() => {
    axios.get(`/api/tenant/public/prova/${codigo}`, { params: { tenant } })
      .then(r => setData(r.data))
      .catch(() => setErro(true))
      .finally(() => setLoad(false));
  }, [codigo, tenant]);

  const baseUrl = window.location.origin;
  const logoUrl = data?.escola?.logo ? `${baseUrl}/storage/${data.escola.logo}` : null;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader size={32} className="animate-spin text-blue-500" />
    </div>
  );

  if (erro || !data?.valido) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX size={32} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Documento Não Verificado</h1>
        <p className="text-gray-500 text-sm mb-4">
          O código <span className="font-mono font-bold text-gray-700">{codigo}</span> não foi encontrado no sistema.
          Este documento pode ser falso ou inválido.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          ⚠️ Não aceite este documento sem confirmação adicional junto da escola.
        </div>
      </div>
    </div>
  );

  const dataPretty = data.data_prova
    ? new Date(data.data_prova + "T12:00:00").toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric" })
    : "—";

  const emitidoPretty = data.emitido_em
    ? new Date(data.emitido_em).toLocaleDateString("pt-AO", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md overflow-hidden">

        {/* Cabeçalho escola */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-6 text-white flex items-center gap-4">
          {logoUrl
            ? <img src={logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white/20 p-1"
                onError={e => { e.target.style.display = "none"; }} />
            : <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {data.escola?.nome?.[0] || "E"}
              </div>
          }
          <div>
            <p className="text-sm font-medium opacity-75">Documento Emitido por</p>
            <p className="text-lg font-bold">{data.escola?.nome || "Escola"}</p>
            {data.escola?.endereco && <p className="text-xs opacity-70 mt-0.5">{data.escola.endereco}</p>}
          </div>
        </div>

        {/* Badge verificado */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800">Documento Oficial Verificado</p>
              <p className="text-xs text-green-600">Este documento é autêntico e foi emitido pelo sistema.</p>
            </div>
          </div>
        </div>

        {/* Detalhes */}
        <div className="px-6 pb-6 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detalhes da Prova</h2>

          {[
            { label: "Disciplina",  value: data.disciplina },
            { label: "Período",     value: data.periodo },
            { label: "Data da Prova", value: dataPretty },
            { label: "Classe",      value: data.classe },
            { label: "Turma",       value: data.turma },
            { label: "Professor(a)", value: data.professor },
            { label: "Ano Lectivo", value: data.ano_letivo },
          ].filter(r => r.value).map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-semibold text-gray-800">{value}</span>
            </div>
          ))}

          {/* Código */}
          <div className="bg-slate-50 rounded-xl p-4 mt-2">
            <p className="text-xs text-gray-400 mb-1">Código de Autenticidade</p>
            <p className="font-mono font-bold text-gray-800 tracking-widest text-lg">{data.codigo}</p>
            <p className="text-xs text-gray-400 mt-2">Emitido em: {emitidoPretty}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
