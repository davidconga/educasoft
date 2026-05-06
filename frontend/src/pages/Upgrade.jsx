import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight, Star, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { centralApi } from "../services/api";
import { usePlano } from "../hooks/usePlano";
import Layout from "../components/layout/Layout";

const FEATURE_NOMES = {
  aulas_remotas:        "Aulas Remotas",
  tesouraria:           "Tesouraria e Finanças",
  bolsas:               "Bolsas e Financiadores",
  lembretes_email_sms:  "Lembretes Email + SMS",
  folha_prova_qr:       "Folha de Prova com QR",
  relatorios_avancados: "Relatórios Avançados",
  multi_turno:          "Multi-turno",
  api_integracao:       "API e Integrações",
  suporte_prioritario:  "Suporte Prioritário 24/7",
};

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

export default function Upgrade() {
  const [params] = useSearchParams();
  const featureBloqueada = params.get("feature");
  const { plano } = usePlano();
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    centralApi.get("/planos").then(r => setPlanos(r.data)).finally(() => setLoading(false));
  }, []);

  const planosSuperiores = planos.filter(p => {
    if (!plano) return p.preco > 0;
    return Number(p.preco) > Number(plano.preco_mensal);
  });

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center mb-8">
          {featureBloqueada && (
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <Lock size={14} />
              <span>{FEATURE_NOMES[featureBloqueada] ?? featureBloqueada} não está incluída no seu plano</span>
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Faça upgrade para desbloquear mais funcionalidades
          </h1>
          {plano && (
            <p className="mt-3 text-sm text-slate-500">
              Plano actual: <span className="font-semibold text-slate-700 capitalize">{plano.nome}</span>
              {plano.preco_mensal > 0 && <> · {formatAOA(plano.preco_mensal)}/mês</>}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : planosSuperiores.length === 0 ? (
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-10 text-center">
            <Crown className="mx-auto text-purple-600 mb-3" size={40} />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Já estás no plano mais alto!</h2>
            <p className="text-sm text-slate-600 mb-5">
              Para aceder a esta funcionalidade, contacta a equipa Educajá — temos soluções à medida.
            </p>
            <a href="https://educaja.com/contacto" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
              Falar com a equipa <ArrowRight size={14} />
            </a>
          </div>
        ) : (
          <div className={`grid gap-5 ${planosSuperiores.length === 1 ? "max-w-md mx-auto" : "md:grid-cols-2"}`}>
            {planosSuperiores.map(p => {
              const incluiBloqueada = featureBloqueada && (p.feature_keys || []).includes(featureBloqueada);
              return (
                <div key={p.id} className={`bg-white rounded-2xl border p-6 relative
                  ${p.destaque ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
                  {p.destaque && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <Star size={12} /> Recomendado
                    </span>
                  )}
                  <h3 className="text-2xl font-extrabold text-slate-900">{p.nome}</h3>
                  {p.descricao && <p className="text-sm text-slate-500 mt-1">{p.descricao}</p>}
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">{formatAOA(p.preco)}</span>
                    <span className="text-sm text-slate-500">/mês</span>
                  </div>

                  {incluiBloqueada && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Inclui {FEATURE_NOMES[featureBloqueada] ?? featureBloqueada}
                    </div>
                  )}

                  <ul className="mt-5 space-y-2">
                    {(p.features || []).map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <a href="https://educaja.com/contacto" target="_blank" rel="noreferrer"
                    className={`mt-6 inline-flex items-center justify-center gap-2 w-full font-semibold px-4 py-2.5 rounded-xl
                      ${p.destaque ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}>
                    Falar com a equipa para upgrade <ArrowRight size={14} />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-8">
          A mudança de plano é processada pela equipa Educajá após confirmação. <Link to="/dashboard" className="text-blue-600 hover:underline">Voltar ao dashboard</Link>
        </p>
      </div>
    </Layout>
  );
}
