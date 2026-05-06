import { Link } from "react-router-dom";
import {
  Users, FileText, CalendarCheck, CreditCard, GraduationCap, Bell, ScrollText,
  Wallet, BookOpen, MessageSquare, ShieldCheck, ClipboardList, BarChart3, Tag,
  Building2, ArrowRight,
} from "lucide-react";

const modulos = [
  {
    icon: Users, cor: "bg-blue-50 text-blue-600",
    title: "Alunos & Encarregados",
    desc: "Cadastro completo do aluno com dados pessoais, foto, BI, naturalidade e contactos do encarregado de educação (telefone e email separados).",
    bullets: [
      "Número de aluno automático",
      "Documentos digitalizados por aluno (BI, atestado, etc.)",
      "Reset de senha pela secretaria",
      "Cartão de estudante imprimível com foto e QR",
    ],
  },
  {
    icon: ClipboardList, cor: "bg-violet-50 text-violet-600",
    title: "Matrículas & Renovação",
    desc: "Inscrição inicial e renovação anual em massa para toda a turma. Transferências entre turmas com histórico preservado.",
    bullets: [
      "Confirmação em lote por turma",
      "Renovação para o ano lectivo seguinte com preview",
      "Transferência entre turmas/cursos",
      "Cancelamento e reactivação com motivo",
    ],
  },
  {
    icon: FileText, cor: "bg-emerald-50 text-emerald-600",
    title: "Notas & Aproveitamento",
    desc: "Lançamento de notas por disciplina, com pauta anual e regras de aproveitamento configuráveis por curso.",
    bullets: [
      "Pauta por trimestre + pauta anual",
      "Regras de aprovação por curso (média, máx. negativas)",
      "Boletim individual por aluno",
      "Pauta imprimível em PDF",
    ],
  },
  {
    icon: CalendarCheck, cor: "bg-cyan-50 text-cyan-600",
    title: "Presenças",
    desc: "Folha diária de presenças por turma para alunos e professores, com relatórios de assiduidade.",
    bullets: [
      "Marcação em lote por dia/turma",
      "Justificação de faltas",
      "Relatório de assiduidade do aluno",
      "Controlo de faltas dos professores",
    ],
  },
  {
    icon: BookOpen, cor: "bg-orange-50 text-orange-600",
    title: "Horários & Salas",
    desc: "Construção de horários por turma com sala, disciplina, professor e turno. Sem conflitos.",
    bullets: [
      "Validação automática de conflitos",
      "Atribuição de professor por disciplina",
      "Gestão de salas e turnos",
      "Exportação para impressão",
    ],
  },
  {
    icon: CreditCard, cor: "bg-amber-50 text-amber-600",
    title: "Tesouraria & Recibos",
    desc: "Gestão de propinas, emolumentos e multas. Pagamento individual ou em lote, com cálculo de troco e crédito.",
    bullets: [
      "Geração automática de propinas mensais",
      "Pagamentos em lote (família com vários filhos)",
      "Multas por atraso configuráveis",
      "Estorno com histórico preservado",
    ],
  },
  {
    icon: ShieldCheck, cor: "bg-rose-50 text-rose-600",
    title: "SAFT-AO & Certificação AGT",
    desc: "Cada factura é assinada digitalmente. Exportação SAFT pronta para submissão à Administração Geral Tributária.",
    bullets: [
      "Hash encadeado por ordem cronológica",
      "Chave RSA registada na AGT",
      "QR code de verificação pública por factura",
      "Exportação SAFT-AO mensal ou anual",
    ],
  },
  {
    icon: GraduationCap, cor: "bg-indigo-50 text-indigo-600",
    title: "Bolsas de Estudo",
    desc: "Bolsas internas (a escola assume) ou de financiadores externos (governo, empresa, fundação) com recibos automáticos.",
    bullets: [
      "Percentagem ou valor fixo",
      "Cobre propinas, emolumentos e/ou matrícula",
      "Recibo de bolsa não-fiscal por período",
      "Cancelamento com motivo registado",
    ],
  },
  {
    icon: Bell, cor: "bg-pink-50 text-pink-600",
    title: "Lembretes Automáticos",
    desc: "Email e SMS para o encarregado antes e depois do vencimento, configurável por escola.",
    bullets: [
      "Email via SMTP da escola",
      "SMS via gateway HTTP genérico (TelcoSMS, Africa's Talking, Twilio…)",
      "Templates personalizáveis com placeholders",
      "Histórico de envios com reenvio manual",
    ],
  },
  {
    icon: ScrollText, cor: "bg-teal-50 text-teal-600",
    title: "Folhas de Prova",
    desc: "Geração de provas com QR de verificação pública. Inviolável e conforme com a AGT.",
    bullets: [
      "QR para verificação por terceiros",
      "Cabeçalho com dados do aluno e disciplina",
      "Histórico de provas geradas",
      "Página pública de validação",
    ],
  },
  {
    icon: Wallet, cor: "bg-slate-50 text-slate-700",
    title: "Portal do Aluno",
    desc: "Cada aluno tem o seu acesso para ver notas, horário, finanças e receber notificações em tempo real.",
    bullets: [
      "Notas e boletim consultáveis",
      "Histórico de pagamentos e estado de propinas",
      "Aulas online e materiais",
      "Sino com badge de notificações não-lidas",
    ],
  },
  {
    icon: MessageSquare, cor: "bg-yellow-50 text-yellow-600",
    title: "Chat & Comunidade",
    desc: "Comunicação interna entre secretaria, professores e alunos. Espaço de comunidade da escola.",
    bullets: [
      "Conversas privadas e por turma",
      "Sondagem em tempo real para mensagens novas",
      "Mural de comunicados da escola",
      "Acessível também pelo portal do aluno",
    ],
  },
  {
    icon: Tag, cor: "bg-lime-50 text-lime-700",
    title: "Preçário Flexível",
    desc: "Preços por classe, curso e ano lectivo. Emolumentos obrigatórios e multas configuráveis.",
    bullets: [
      "Propinas por classe/curso/turno",
      "Emolumentos obrigatórios e opcionais",
      "Multas por atraso (% ou valor fixo)",
      "Histórico de versões do preçário",
    ],
  },
  {
    icon: BarChart3, cor: "bg-fuchsia-50 text-fuchsia-600",
    title: "Relatórios & Controlo",
    desc: "Dashboards e relatórios diários, mensais e anuais para a direcção da escola.",
    bullets: [
      "Relatório diário de tesouraria",
      "Relatório financeiro por mês/ano",
      "Controlo de propinas por turma",
      "Carteira do aluno (saldo e histórico)",
    ],
  },
  {
    icon: Building2, cor: "bg-stone-50 text-stone-700",
    title: "Multi-Escola",
    desc: "Cada escola tem a sua base de dados isolada, mas o produtor de software é único. Uma certificação cobre todas.",
    bullets: [
      "Isolamento total entre escolas",
      "Logo, dados fiscais e branding por escola",
      "Super-admin central para gestão da plataforma",
      "Provisionamento automático ao registo",
    ],
  },
];

export default function Funcionalidades() {
  return (
    <>
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Funcionalidades</div>
            <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Tudo o que a sua escola faz, em código.
            </h1>
            <p className="mt-5 text-slate-600 leading-relaxed text-lg">
              Cada módulo do Educajá foi desenhado a partir do dia-a-dia real de
              escolas em Angola — secretaria, tesouraria, direcção pedagógica e
              encarregados de educação.
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map(m => (
            <div key={m.title} className="bg-white border border-slate-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${m.cor}`}>
                <m.icon size={20}/>
              </div>
              <h3 className="mt-4 font-bold text-slate-900 text-lg">{m.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{m.desc}</p>
              <ul className="mt-4 space-y-1.5">
                {m.bullets.map(b => (
                  <li key={b} className="text-xs text-slate-500 flex items-start gap-2">
                    <span className="text-slate-300 mt-0.5">•</span><span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 lg:px-8 mb-20">
        <div className="rounded-3xl bg-slate-900 text-white p-10 lg:p-14 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
            Quer ver o sistema em funcionamento?
          </h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto">
            Marcamos uma demonstração de 30 minutos com a equipa, sem compromisso.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Link to="/contacto" className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 font-semibold px-6 py-3 rounded-xl">
              Marcar demonstração <ArrowRight size={16}/>
            </Link>
            <Link to="/precos" className="inline-flex items-center gap-2 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl border border-white/20">
              Ver preços
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
