import { Link } from "react-router-dom";
import {
  Users, CreditCard, FileText, CalendarCheck, Bell, ScrollText,
  Wallet, GraduationCap, ShieldCheck, ArrowRight, CheckCircle2, Sparkles,
} from "lucide-react";

const features = [
  { icon: Users,       title: "Alunos & Matrículas",  desc: "Cadastro completo com encarregado, foto, documentos e renovação anual em massa." },
  { icon: FileText,    title: "Notas & Boletins",     desc: "Lançamento de notas com regras de aproveitamento por curso e impressão de pautas." },
  { icon: CalendarCheck, title: "Presenças",          desc: "Folhas diárias por turma com relatórios de assiduidade para alunos e professores." },
  { icon: CreditCard,  title: "Tesouraria & SAFT-AO", desc: "Recibos certificados, controlo de propinas/emolumentos e exportação SAFT para a AGT." },
  { icon: GraduationCap, title: "Bolsas de Estudo",   desc: "Bolsas internas ou de financiadores externos, com recibos automáticos por período." },
  { icon: Bell,        title: "Lembretes Automáticos",desc: "Email e SMS para encarregados de educação antes e depois do vencimento das propinas." },
  { icon: ScrollText,  title: "Folhas de Prova",      desc: "Geração de provas com QR de verificação pública — inviolável, conforme com a AGT." },
  { icon: Wallet,      title: "Portal do Aluno",      desc: "Notas, horário, finanças e notificações acessíveis em qualquer dispositivo." },
];

const stats = [
  { v: "5+",        l: "Escolas activas" },
  { v: "100%",      l: "Conforme AGT" },
  { v: "Email/SMS", l: "Comunicação directa" },
  { v: "24/7",      l: "Acesso à plataforma" },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 -z-10"/>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.10),transparent_50%)] -z-10"/>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 ring-1 ring-blue-100">
              <Sparkles size={13}/> Feito para escolas em Angola
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.05]">
              A gestão da sua escola,<br/>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                em um só lugar.
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl">
              Educajá é a plataforma que junta alunos, propinas, notas, presenças e
              comunicação com encarregados — com facturação fiscal certificada e
              exportação SAFT directa para a AGT.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/cadastro" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-blue-200 transition-all hover:shadow-lg hover:-translate-y-0.5">
                Inscrever a minha escola <ArrowRight size={16}/>
              </Link>
              <Link to="/funcionalidades" className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900 font-semibold px-4 py-3">
                Explorar funcionalidades
              </Link>
            </div>

            {/* Stats */}
            <dl className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-3xl">
              {stats.map(s => (
                <div key={s.l}>
                  <dt className="text-2xl lg:text-3xl font-extrabold text-slate-900">{s.v}</dt>
                  <dd className="text-xs text-slate-500 font-medium mt-1">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="max-w-2xl">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Tudo numa plataforma</div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Os módulos que a sua escola precisa, integrados.
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Da matrícula ao boletim final, do recibo fiscal ao SMS para o encarregado —
            o Educajá cobre o ciclo lectivo inteiro sem ter de comprar 5 sistemas diferentes.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(f => (
            <div key={f.title} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-blue-200 hover:shadow-md transition-all">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <f.icon size={20}/>
              </div>
              <h3 className="font-bold text-slate-900 text-base">{f.title}</h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AGT compliance highlight */}
      <section className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 ring-1 ring-emerald-100">
              <ShieldCheck size={13}/> Conforme com a AGT
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Facturação fiscal certificada,<br/>SAFT-AO incluído.
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed text-lg">
              Cada recibo é assinado digitalmente com a chave registada na AGT.
              A exportação SAFT-AO sai pronta para submissão — sem tabelas Excel,
              sem reconciliações manuais, sem stress.
            </p>
            <ul className="mt-6 space-y-2.5">
              {[
                "Hash de assinatura único por factura, encadeado por ordem cronológica",
                "Multas por atraso, troco e estornos tratados pelo sistema",
                "QR code de verificação pública em cada recibo",
                "SAFT exportável a qualquer momento, por mês ou por ano lectivo",
              ].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-slate-700">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5"/>
                  <span className="text-sm">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 lg:p-8">
            <div className="text-xs font-mono text-slate-400 mb-4">RECIBO • 2026/00142</div>
            <div className="space-y-2.5">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Aluno</span><span className="font-medium text-slate-800">João Pedro</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Mensalidade</span><span className="text-slate-700">Fevereiro 2026</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Valor</span><span className="font-semibold text-slate-900">35.000,00 AOA</span></div>
            </div>
            <div className="mt-5 pt-5 border-t border-dashed border-slate-200">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Assinatura digital</div>
              <div className="text-xs font-mono text-slate-500 break-all bg-slate-50 p-3 rounded-lg">
                aF3kP9xQrL2nY8mE7tH4vB6cN1zR5dW3jK0sX9pU
              </div>
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={14}/> Validado AGT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Em 3 passos</div>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Da inscrição ao primeiro recibo, sem fricção.
          </h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Inscreve a sua escola", d: "Submete os dados básicos da escola e cria a conta de administrador. A vossa base de dados é provisionada automaticamente." },
            { n: "02", t: "Configura o seu ano",   d: "Define cursos, classes, turmas, preçário e regras de aproveitamento. Importa alunos por lote se vier de outro sistema." },
            { n: "03", t: "Comece a operar",       d: "Lance notas, recolha presenças, receba propinas, envie lembretes — tudo já com SAFT a ser gerado em background." },
          ].map(s => (
            <div key={s.n}>
              <div className="text-5xl font-extrabold text-blue-100 leading-none mb-3">{s.n}</div>
              <h3 className="font-bold text-slate-900 text-lg">{s.t}</h3>
              <p className="mt-2 text-slate-600 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 mb-20">
        <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-10 lg:p-14 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/5 rounded-full blur-3xl"/>
          <div className="relative">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight max-w-2xl">
              Pronto para mudar a forma como gere a sua escola?
            </h2>
            <p className="mt-4 text-blue-100 max-w-xl text-lg">
              Inscreva a sua escola hoje. Falamos consigo, ajudamos na migração de dados
              e configuramos os primeiros utilizadores.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/cadastro" className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl shadow-md transition-all hover:shadow-lg">
                Inscrever escola <ArrowRight size={16}/>
              </Link>
              <Link to="/contacto" className="inline-flex items-center gap-2 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl border border-white/20">
                Falar com a equipa
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
