import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { centralApi } from "../../services/api";
import MarkdownLite from "../../components/MarkdownLite";

export default function Termos() {
  const [termos, setTermos] = useState(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    centralApi.get("/termos/atual")
      .then((r) => setTermos(r.data))
      .catch(() => setErro("Não foi possível carregar os termos. Tente novamente em instantes."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">
            <ShieldCheck size={14} /> Documento legal
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Termos e Condições
          </h1>
          {termos && (
            <p className="mt-3 text-sm text-slate-500">
              Versão <strong className="text-slate-700">{termos.versao}</strong>
              {termos.publicado_em && (
                <> · em vigor desde {new Date(termos.publicado_em).toLocaleDateString("pt-AO", { day: "numeric", month: "long", year: "numeric" })}</>
              )}
            </p>
          )}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 lg:px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : erro ? (
          <p className="text-center text-red-600 text-sm py-12">{erro}</p>
        ) : termos ? (
          <article className="prose prose-slate max-w-none">
            <MarkdownLite source={termos.conteudo} />
          </article>
        ) : (
          <p className="text-center text-slate-400 text-sm py-12">Sem termos publicados.</p>
        )}
      </section>
    </>
  );
}
