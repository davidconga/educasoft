import { useState } from "react";
import { Mail, Phone, MapPin, MessageSquare, CheckCircle2, Send, AlertCircle } from "lucide-react";
import { centralApi } from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 transition";

const FORM_VAZIO = { nome: "", email: "", escola: "", telefone: "", mensagem: "", website: "" };

export default function Contacto() {
  const [form, setForm]       = useState(FORM_VAZIO);
  const [enviando, setEnv]    = useState(false);
  const [enviado, setOk]      = useState(false);
  const [erro, setErro]       = useState("");

  const submeter = async (e) => {
    e.preventDefault();
    setEnv(true); setErro("");
    try {
      const r = await centralApi.post("/contacto", form);
      setOk(true);
      setForm(FORM_VAZIO);
    } catch (err) {
      setErro(err.response?.data?.message || "Não foi possível enviar agora. Tente novamente.");
    } finally { setEnv(false); }
  };

  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Contacto</div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Vamos falar sobre a sua escola.
            </h1>
            <p className="mt-5 text-slate-600 leading-relaxed text-lg">
              Marque uma demonstração, peça uma proposta ou tire dúvidas técnicas.
              Respondemos no mesmo dia útil.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-2">
            {enviado ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28}/>
                </div>
                <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Mensagem enviada</h2>
                <p className="mt-2 text-slate-600 max-w-md mx-auto">
                  Obrigado pelo seu contacto. A nossa equipa responde-lhe directamente
                  no email indicado, normalmente em algumas horas.
                </p>
                <button onClick={() => setOk(false)}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  Enviar nova mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={submeter} className="bg-white border border-slate-100 rounded-2xl p-6 lg:p-8 space-y-4 shadow-sm">
                {erro && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                    <span>{erro}</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nome completo *</label>
                    <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp}/>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">Escola</label>
                    <input value={form.escola} onChange={e => setForm(f => ({ ...f, escola: e.target.value }))} className={inp}/>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1.5 block">Telefone</label>
                    <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={inp} placeholder="+244 ..."/>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1.5 block">Mensagem *</label>
                  <textarea required rows={6} value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                    className={`${inp} resize-y`}
                    placeholder="Conte-nos sobre a sua escola — número de alunos, sistema actual (se houver) e o que procura."/>
                </div>

                {/* Honeypot — invisível para humanos, bots vão preencher */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off"
                  value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                  className="hidden" aria-hidden="true"/>

                <button type="submit" disabled={enviando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
                  {enviando ? "A enviar…" : (<>Enviar mensagem <Send size={15}/></>)}
                </button>
                <p className="text-xs text-slate-400">
                  Ao submeter, aceita ser contactado pela equipa Educajá. Os seus dados não
                  são partilhados com terceiros.
                </p>
              </form>
            )}
          </div>

          {/* Info lateral */}
          <aside className="space-y-5">
            <div className="bg-white border border-slate-100 rounded-2xl p-6">
              <h3 className="font-bold text-slate-900 mb-4">Outras formas de nos chegar</h3>
              <ul className="space-y-3.5">
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Mail size={16}/>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-medium">Email</div>
                    <a href="mailto:contact@educaja.ao" className="text-sm font-semibold text-slate-800 hover:text-blue-700 break-all">contact@educaja.ao</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <MessageSquare size={16}/>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-medium">WhatsApp</div>
                    <div className="text-sm font-semibold text-slate-800">Disponível em breve</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <MapPin size={16}/>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-medium">Localização</div>
                    <div className="text-sm font-semibold text-slate-800">Benguela, Angola</div>
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-6">
              <h3 className="font-bold">Resposta rápida</h3>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                Mensagens enviadas em dias úteis recebem resposta no mesmo dia.
                Para escolas com inscrição já iniciada, a resposta é imediata.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
