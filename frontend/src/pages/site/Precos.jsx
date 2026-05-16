import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { centralApi } from "../../services/api";

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

const faqs = [
  {
    q: "Há custo de instalação ou setup?",
    a: "Não. A activação da escola é instantânea após inscrição. Para o plano Empresarial incluímos migração de dados sem custo adicional.",
  },
  {
    q: "Os SMS estão incluídos?",
    a: "O sistema integra-se com o seu gateway (TelcoSMS, Africa's Talking, Twilio…). O custo dos SMS é pago directamente ao operador escolhido — nós não cobramos margem.",
  },
  {
    q: "Posso mudar de plano depois?",
    a: "Sim. Pode subir ou descer de plano a qualquer momento e o valor é ajustado proporcionalmente no ciclo seguinte.",
  },
  {
    q: "Como funciona a certificação AGT?",
    a: "Uma única certificação cobre todas as escolas que usam o Educajá — isto está previsto no Decreto 74/17 da AGT. A escola não precisa de certificar nada por si.",
  },
  {
    q: "Os dados são meus ou da Educajá?",
    a: "100% seus. Pode exportar a base de dados completa em qualquer momento. Cumprimos a Lei n.º 22/11 sobre protecção de dados pessoais em Angola.",
  },
  {
    q: "Funciona offline?",
    a: "A plataforma é web e requer ligação à internet. Para escolas com ligação intermitente, a app desktop guarda dados localmente e sincroniza quando há rede.",
  },
];

export default function Precos() {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    centralApi.get("/planos")
      .then((r) => setPlanos(r.data))
      .catch(() => setErro("Não foi possível carregar os planos. Tente novamente em instantes."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-20 text-center">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Preços</div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Planos pensados para escolas angolanas.
          </h1>
          <p className="mt-5 text-slate-600 leading-relaxed text-lg max-w-2xl mx-auto">
            Sem surpresas, sem custos escondidos. Escolha o plano que se ajusta ao tamanho da sua escola
            e mude de plano sempre que precisar.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : erro ? (
          <p className="text-center text-red-600 text-sm py-12">{erro}</p>
        ) : planos.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-12">Sem planos disponíveis no momento.</p>
        ) : (
          <div className={`grid gap-6 ${planos.length === 1 ? "max-w-md mx-auto" : planos.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"}`}>
            {planos.map((p) => {
              const destaque = !!p.destaque;
              const ctaLabel = p.preco === 0 ? "Começar grátis" : "Inscrever escola";
              return (
                <div key={p.id} className={`bg-white rounded-2xl border p-7 flex flex-col relative
                  ${destaque ? "border-blue-500 ring-2 ring-blue-100" : "border-slate-200"}`}>
                  {destaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm shadow-blue-300">
                      <Sparkles size={12} /> Mais escolhido
                    </div>
                  )}
                  <h3 className="text-2xl font-extrabold text-slate-900">{p.nome}</h3>
                  {p.descricao && (
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.descricao}</p>
                  )}

                  <div className="mt-6 mb-2">
                    {p.preco === 0 ? (
                      <>
                        <div className="text-3xl font-extrabold text-emerald-600">Grátis</div>
                        <p className="text-xs text-slate-400 mt-1">Sem compromisso, sem prazo.</p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1">
                          <div className="text-3xl font-extrabold text-slate-900">{formatAOA(p.preco)}</div>
                          <span className="text-sm text-slate-500">/{p.periodo || "mês"}</span>
                        </div>
                        {p.preco_anual ? (
                          <p className="text-xs text-slate-500 mt-1">
                            ou <strong className="text-slate-700">{formatAOA(p.preco_anual)}</strong> /ano
                            {p.preco_anual < p.preco * 12 && (
                              <span className="ml-1 text-emerald-600 font-semibold">
                                (poupa {Math.round((1 - p.preco_anual / (p.preco * 12)) * 100)}%)
                              </span>
                            )}
                          </p>
                        ) : null}
                        {p.dias_trial > 0 && (
                          <p className="text-xs text-blue-600 font-semibold mt-1">{p.dias_trial} dias de teste grátis</p>
                        )}
                      </>
                    )}
                  </div>

                  <Link
                    to={`/cadastro?plano=${p.id}`}
                    className={`mt-5 inline-flex items-center justify-center gap-2 w-full font-semibold px-4 py-2.5 rounded-xl transition-colors
                      ${destaque
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}
                  >
                    {ctaLabel} <ArrowRight size={15} />
                  </Link>

                  <div className="mt-7 pt-7 border-t border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Inclui</div>
                    <ul className="space-y-2">
                      {(p.features || []).map((it) => (
                        <li key={it} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span><strong className="text-slate-700">{p.max_alunos === -1 ? "Ilimitados" : `Até ${p.max_alunos.toLocaleString("pt-PT")}`}</strong> alunos</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-sm text-slate-500">
          Precisa de mais alunos ou de uma solução à medida?{" "}
          <Link to="/contacto" className="text-blue-700 font-semibold hover:underline">Fale com a equipa →</Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 lg:px-8 pb-20">
        <div className="text-center mb-10">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">FAQ</div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Perguntas frequentes</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-colors">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="font-semibold text-slate-800">{f.q}</span>
                <span className="text-slate-400 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
