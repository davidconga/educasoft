import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Calendar, CheckCircle, Clock, Wallet, GraduationCap } from "lucide-react";
import api from "../../../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("pt-PT");
const meses = ["", "Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const ESTADO_FOLHA = {
  rascunho:  { cls: "bg-slate-100 text-slate-600",     l: "Rascunho" },
  processada:{ cls: "bg-blue-100 text-blue-700",       l: "Processada" },
  paga:      { cls: "bg-emerald-100 text-emerald-700", l: "Paga" },
  anulada:   { cls: "bg-red-100 text-red-600",         l: "Anulada" },
};

export default function FuncionarioDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [f, setF]             = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/funcionarios/${id}`)
      .then(r => setF(r.data))
      .catch(() => setF(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-slate-400 py-12 text-center">A carregar...</p>;
  if (!f) return (
    <div className="text-center py-16">
      <p className="text-slate-500">Funcionário não encontrado.</p>
      <Link to="/rh/funcionarios" className="text-blue-600 hover:underline text-sm mt-3 inline-block">← Voltar</Link>
    </div>
  );

  const initials = f.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-5">
      <Link to="/rh/funcionarios" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14}/> Voltar
      </Link>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold flex items-center justify-center">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">{f.nome}</h1>
            <p className="text-sm text-slate-600">{f.cargo}{f.departamento && ` · ${f.departamento}`}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>{f.estado}</Badge>
              <Badge cor="blue">{f.tipo_contrato}</Badge>
              {f.data_admissao && <Badge cor="slate">Admissão: {new Date(f.data_admissao).toLocaleDateString("pt-AO")}</Badge>}
              {f.professor_id && (
                <Link to={`/professores/${f.professor_id}`}
                  className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 inline-flex items-center gap-1">
                  <GraduationCap size={11}/> Professor #{f.professor?.numero_professor || f.professor_id}
                </Link>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase font-medium">Salário base</p>
            <p className="text-2xl font-bold text-slate-800">{fmt(f.salario_base)} Kz</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card titulo="Identificação">
          <Row label="BI" v={f.bi} />
          <Row label="NIF" v={f.nif} />
          <Row label="Género" v={f.genero ? f.genero.charAt(0).toUpperCase() + f.genero.slice(1) : "—"} />
          <Row label="Data nascimento" v={f.data_nascimento ? new Date(f.data_nascimento).toLocaleDateString("pt-AO") : "—"} />
          <Row label="Naturalidade" v={f.naturalidade} />
          <Row label="Estado civil" v={f.estado_civil} />
        </Card>

        <Card titulo="Contacto">
          <Row label="Telefone" v={f.telefone} />
          <Row label="Email" v={f.email} />
          <Row label="Morada" v={f.morada} />
        </Card>

        <Card titulo="Contrato">
          <Row label="Cargo" v={f.cargo} />
          <Row label="Departamento" v={f.departamento} />
          <Row label="Tipo" v={f.tipo_contrato} />
          <Row label="Admissão" v={f.data_admissao ? new Date(f.data_admissao).toLocaleDateString("pt-AO") : "—"} />
          <Row label="Fim contrato" v={f.data_fim ? new Date(f.data_fim).toLocaleDateString("pt-AO") : "—"} />
          {f.estado === "demitido" && (
            <>
              <Row label="Data demissão" v={f.data_demissao ? new Date(f.data_demissao).toLocaleDateString("pt-AO") : "—"} />
              <Row label="Motivo" v={f.motivo_demissao} />
            </>
          )}
        </Card>

        <Card titulo="Conta bancária">
          <Row label="IBAN" v={f.iban} mono />
          <Row label="Banco" v={f.banco} />
        </Card>
      </div>

      {f.observacao && (
        <Card titulo="Observações">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.observacao}</p>
        </Card>
      )}

      {/* Folhas de pagamento do funcionário */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
            <Wallet size={16} className="text-blue-600"/> Folhas de pagamento
          </h2>
          <span className="text-xs text-slate-500">{f.folhas?.length || 0} registo(s)</span>
        </div>
        {(f.folhas || []).length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sem folhas geradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Período</th>
                <th className="text-left px-3 py-2">Referência</th>
                <th className="text-right px-3 py-2">Salário</th>
                <th className="text-right px-3 py-2">Subsídios</th>
                <th className="text-right px-3 py-2">Descontos</th>
                <th className="text-right px-3 py-2">Líquido</th>
                <th className="text-center px-3 py-2">Estado</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {f.folhas.sort((a,b) => (b.ano - a.ano) || (b.mes - a.mes)).map(fl => (
                <tr key={fl.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2">{meses[fl.mes]} {fl.ano}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{fl.referencia}</td>
                  <td className="px-3 py-2 text-right">{fmt(fl.salario_base)}</td>
                  <td className="px-3 py-2 text-right text-emerald-600">+{fmt(fl.total_subsidios)}</td>
                  <td className="px-3 py-2 text-right text-red-500">−{fmt(fl.total_descontos)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmt(fl.liquido)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_FOLHA[fl.estado]?.cls}`}>
                      {ESTADO_FOLHA[fl.estado]?.l || fl.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/rh/folhas/${fl.id}`} className="text-xs text-blue-600 hover:underline">Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ titulo, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">{titulo}</h2>
      {children}
    </div>
  );
}
function Row({ label, v, mono }) {
  return (
    <div className="flex py-1.5 border-b border-slate-50 last:border-0">
      <span className="w-32 text-xs text-slate-500">{label}</span>
      <span className={`flex-1 text-sm text-slate-800 font-medium ${mono ? "font-mono text-xs" : ""}`}>{v || "—"}</span>
    </div>
  );
}
function Badge({ children, cor }) {
  const cls = cor === "blue" ? "bg-blue-50 text-blue-700"
            : cor === "slate" ? "bg-slate-100 text-slate-600"
            : "bg-emerald-50 text-emerald-700";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>{children}</span>;
}
