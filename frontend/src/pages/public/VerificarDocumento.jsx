import { useEffect, useState } from "react";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, XCircle, Loader2, Receipt, FileText, Wallet, Building2, ShieldCheck, Calendar, User, Tag } from "lucide-react";

const fmt = (v) => Number(v || 0).toLocaleString("pt-PT") + " Kz";
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("pt-AO") : "—";

/**
 * Página pública de verificação de documentos fiscais via QR.
 * Suporta 5 tipos de URL:
 *   /verificar-recibo/:escola/:ref            → tenant pagamento
 *   /verificar-recibo-bolsa/:escola/:ref      → tenant bolsa
 *   /verificar-fecho-caixa/:escola/:codigo    → tenant fecho caixa
 *   /verificar-factura/:numero                → central factura
 *   /verificar-recibo-central/:numero         → central comprovativo
 */
export default function VerificarDocumento() {
  const { escola, ref, codigo, numero } = useParams();
  const [search] = useSearchParams();
  const location = useLocation();
  const path = location.pathname;

  const [data, setData]     = useState(null);
  const [erro, setErro]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = search.get("h") || "";
    const params = hash ? `?h=${encodeURIComponent(hash)}` : "";

    let url;
    if (path.startsWith("/verificar-recibo-bolsa/")) {
      url = `/api/tenant/public/recibo-bolsa/${encodeURIComponent(ref)}?tenant=${escola}${hash ? `&h=${encodeURIComponent(hash)}` : ""}`;
    } else if (path.startsWith("/verificar-recibo-central/")) {
      url = `/api/v1/public/comprovativo/${encodeURIComponent(numero)}${params}`;
    } else if (path.startsWith("/verificar-recibo/")) {
      url = `/api/tenant/public/recibo/${encodeURIComponent(ref)}?tenant=${escola}${hash ? `&h=${encodeURIComponent(hash)}` : ""}`;
    } else if (path.startsWith("/verificar-fecho-caixa/")) {
      url = `/api/tenant/public/fecho-caixa/${encodeURIComponent(codigo)}?tenant=${escola}`;
    } else if (path.startsWith("/verificar-factura/")) {
      url = `/api/v1/public/factura/${encodeURIComponent(numero)}${params}`;
    } else {
      setErro("Tipo de documento desconhecido."); setLoading(false); return;
    }

    axios.get(url)
      .then(r => setData(r.data))
      .catch(e => setErro(e?.response?.data?.erro || e?.response?.data?.message || "Documento não encontrado."))
      .finally(() => setLoading(false));
  }, [path, escola, ref, codigo, numero, search]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={28} className="text-blue-600 animate-spin"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-slate-700">
            <ShieldCheck size={20} className="text-blue-600"/>
            <h1 className="text-xl font-bold">Verificação de Documento</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">Educajá — Sistema de Gestão Escolar</p>
        </div>

        {erro || !data ? (
          <div className="bg-white border border-red-200 rounded-2xl p-8 text-center shadow-sm">
            <XCircle size={48} className="mx-auto text-red-500 mb-3"/>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Documento não encontrado</h2>
            <p className="text-sm text-slate-500">{erro || "Verifica o QR ou o URL."}</p>
          </div>
        ) : (
          <div className={`bg-white border-2 rounded-2xl shadow-sm overflow-hidden ${data.valido ? "border-emerald-300" : "border-amber-300"}`}>
            <div className={`px-6 py-4 ${data.valido ? "bg-emerald-50" : "bg-amber-50"}`}>
              <div className="flex items-center gap-3">
                {data.valido ? <CheckCircle2 size={32} className="text-emerald-600"/> : <XCircle size={32} className="text-amber-600"/>}
                <div>
                  <h2 className={`text-lg font-bold ${data.valido ? "text-emerald-800" : "text-amber-800"}`}>
                    {data.valido ? "Documento autêntico" : "Documento inválido ou anulado"}
                  </h2>
                  <p className={`text-xs ${data.valido ? "text-emerald-700" : "text-amber-700"}`}>
                    {tipoLabel(data.tipo)}
                    {data.hash_match === false && " · Hash não corresponde"}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {/* Escola/Cliente */}
              {(data.escola || data.cliente) && (
                <Row icon={Building2} label={data.escola ? "Escola emitente" : "Cliente"}>
                  <div className="flex items-center gap-2">
                    {(data.escola?.logo || data.cliente?.logo) && (
                      <img src={`/storage/${data.escola?.logo || data.cliente?.logo}`} alt=""
                        className="w-7 h-7 rounded object-contain border border-slate-200"
                        onError={(e) => e.target.style.display = "none"}/>
                    )}
                    <span className="font-semibold text-slate-800">{data.escola?.nome || data.cliente?.nome}</span>
                  </div>
                </Row>
              )}

              {/* Aluno */}
              {data.aluno && (
                <Row icon={User} label="Aluno">
                  <span className="font-medium text-slate-700">{data.aluno.nome}</span>
                  {data.aluno.numero_aluno && <span className="text-xs text-slate-500 ml-2">Nº {data.aluno.numero_aluno}</span>}
                </Row>
              )}

              {/* Operador (fecho de caixa) */}
              {data.operador && <Row icon={User} label="Operador">{data.operador}</Row>}

              {/* Referência / nº */}
              <Row icon={Tag} label={data.tipo === "fecho_caixa" ? "Código sessão" : data.numero ? "Número" : "Referência"}>
                <span className="font-mono text-slate-800 font-semibold">{data.referencia || data.numero || data.codigo}</span>
              </Row>

              {/* Datas */}
              {data.data_emissao && (
                <Row icon={Calendar} label="Data de emissão">{fmtDate(data.data_emissao)}</Row>
              )}
              {data.data_pagamento && (
                <Row icon={Calendar} label="Data de pagamento">{fmtDate(data.data_pagamento)}</Row>
              )}
              {data.abriu_em && <Row icon={Calendar} label="Aberta em">{fmtDate(data.abriu_em)}</Row>}
              {data.fechou_em && <Row icon={Calendar} label="Fechada em">{fmtDate(data.fechou_em)}</Row>}

              {/* Plano (factura) */}
              {data.plano && <Row icon={Tag} label="Plano">{data.plano}</Row>}

              {/* Descrição */}
              {data.descricao && (
                <Row icon={FileText} label="Descrição">
                  {data.descricao}
                  {data.mes_referencia && <span className="text-xs text-slate-500 ml-2">({data.mes_referencia})</span>}
                </Row>
              )}

              {/* Financiador */}
              {data.financiador && <Row icon={Building2} label="Financiador">{data.financiador}</Row>}

              {/* Método */}
              {data.metodo && (
                <Row icon={Receipt} label="Método de pagamento">
                  <span className="capitalize">{String(data.metodo).replace(/_/g, " ")}</span>
                  {data.transacao_ref && <span className="text-xs text-slate-500 ml-2 font-mono">· {data.transacao_ref}</span>}
                </Row>
              )}

              {/* Valores */}
              {(data.valor !== undefined || data.total !== undefined) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  {data.valor !== undefined && (
                    <Linha label={data.tipo === "fecho_caixa" ? "Valor" : "Valor base"} valor={fmt(data.valor)}/>
                  )}
                  {data.multa > 0 && <Linha label="Multa" valor={fmt(data.multa)} cor="text-amber-600"/>}
                  {data.bolsa > 0 && <Linha label="Bolsa" valor={`−${fmt(data.bolsa)}`} cor="text-emerald-600"/>}
                  {data.subtotal !== undefined && <Linha label="Subtotal" valor={fmt(data.subtotal)}/>}
                  {data.iva_valor !== undefined && data.iva_valor > 0 && (
                    <Linha label={`IVA (${data.iva_taxa}%)`} valor={fmt(data.iva_valor)}/>
                  )}
                  {(data.total_pago !== undefined || data.total !== undefined) && (
                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold">
                      <span>Total</span>
                      <span className="text-lg text-slate-800">{fmt(data.total_pago ?? data.total)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fecho caixa: detalhes */}
              {data.tipo === "fecho_caixa" && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5">
                  <Linha label="Fundo inicial" valor={fmt(data.fundo_inicial)}/>
                  <Linha label="Total esperado" valor={fmt(data.total_esperado)}/>
                  {data.total_contado !== null && (
                    <Linha label="Total contado" valor={fmt(data.total_contado)}/>
                  )}
                  {data.diferenca !== null && (
                    <Linha label="Diferença" valor={fmt(data.diferenca)}
                      cor={data.diferenca === 0 ? "text-slate-600" : data.diferenca > 0 ? "text-emerald-600" : "text-red-600"}/>
                  )}
                  <Linha label="Estado" valor={data.estado}/>
                </div>
              )}

              {/* Hash */}
              {data.hash && (
                <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <ShieldCheck size={12}/>
                  <span>Hash: <span className="font-mono text-slate-600">{data.hash}</span></span>
                  {data.hash_match === true && <CheckCircle2 size={12} className="text-emerald-500"/>}
                  {data.hash_match === false && <XCircle size={12} className="text-red-500"/>}
                </div>
              )}

              {data.vendus_numero && (
                <div className="text-xs text-slate-400">
                  Documento Vendus: <span className="font-mono text-slate-600">{data.vendus_numero}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-4">
          Verificado em {new Date().toLocaleString("pt-PT")}
        </p>
      </div>
    </div>
  );
}

function tipoLabel(t) {
  return ({
    recibo:               "Recibo de pagamento",
    recibo_bolsa:         "Recibo de bolsa",
    fecho_caixa:          "Fecho de caixa",
    factura_central:      "Factura (subscrição)",
    comprovativo_central: "Recibo (subscrição)",
  })[t] || "Documento";
}

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <Icon size={14} className="text-slate-400 mt-0.5 shrink-0"/>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">{label}</p>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  );
}

function Linha({ label, valor, cor = "" }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${cor || "text-slate-800"}`}>{valor}</span>
    </div>
  );
}
