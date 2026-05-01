import { useState, useEffect, useCallback } from "react";
import { FileText, Printer, TrendingUp, Banknote, CreditCard, RefreshCw } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const fmt = (v) => Number(v || 0).toLocaleString("pt-AO") + " Kz";

const TIPO_LABEL  = { mensalidade:"Propina", emolumento:"Emolumento", matricula:"Matrícula", outro:"Outro" };
const METODO_LABEL= { dinheiro:"Dinheiro", transferencia:"Transferência", multicaixa:"Multicaixa" };

const METODO_COLOR = {
  dinheiro:      "bg-emerald-50 border-emerald-200 text-emerald-800",
  transferencia: "bg-blue-50    border-blue-200    text-blue-800",
  multicaixa:    "bg-violet-50  border-violet-200  text-violet-800",
};
const TIPO_COLOR = {
  mensalidade: "bg-amber-50   border-amber-200   text-amber-800",
  emolumento:  "bg-cyan-50    border-cyan-200    text-cyan-800",
  matricula:   "bg-rose-50    border-rose-200    text-rose-800",
  outro:       "bg-slate-50   border-slate-200   text-slate-800",
};

function imprimirRelatorio(relatorio, escola) {
  const hoje = new Date(relatorio.data).toLocaleDateString("pt-AO", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  const baseUrl = window.location.origin;
  const logoUrl = escola?.logo ? `${baseUrl}/storage/${escola.logo}` : null;
  const escolaNome = escola?.nome || "Educajá";

  const linhas = relatorio.pagamentos.map(p => `
    <tr>
      <td>${p.aluno?.user?.nome || "—"}</td>
      <td>${p.aluno?.numero_aluno || "—"}</td>
      <td>${p.aluno?.matriculas?.[0]?.turma?.nome || "—"}</td>
      <td>${TIPO_LABEL[p.tipo] || p.tipo}</td>
      <td>${p.mes_referencia || "—"}</td>
      <td>${METODO_LABEL[p.metodo] || p.metodo || "—"}</td>
      <td class="right">${Number(p.valor).toLocaleString("pt-AO")} Kz</td>
    </tr>`).join("");

  const porMetodo = Object.entries(relatorio.por_metodo || {}).map(([m, v]) =>
    `<div class="tag">${METODO_LABEL[m]||m}: <strong>${Number(v.total).toLocaleString("pt-AO")} Kz</strong> (${v.count})</div>`
  ).join("");

  const porTipo = Object.entries(relatorio.por_tipo || {}).map(([t, v]) =>
    `<div class="tag">${TIPO_LABEL[t]||t}: <strong>${Number(v.total).toLocaleString("pt-AO")} Kz</strong> (${v.count})</div>`
  ).join("");

  const html = `<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"/>
<title>Relatório Diário — ${relatorio.data}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1e293b;}
.header{display:flex;align-items:center;gap:16px;padding:20px 28px 16px;background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff;border-radius:10px 10px 0 0;}
.logo-box{width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;}
.escola-nome{font-size:16px;font-weight:700;}
.escola-sub{font-size:10px;opacity:.7;margin-top:2px;}
.doc-type{margin-left:auto;text-align:right;}
.doc-label{font-size:13px;font-weight:700;letter-spacing:.04em;}
.doc-date{font-size:11px;opacity:.8;margin-top:3px;}
.body{padding:20px 28px;}
.meta{display:flex;gap:12px;margin-bottom:16px;}
.meta-card{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;background:#f8fafc;}
.meta-card .label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}
.meta-card .value{font-size:18px;font-weight:800;color:#1d4ed8;margin-top:4px;}
.meta-card .sub{font-size:10px;color:#64748b;margin-top:2px;}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin:14px 0 8px;}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.tag{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 10px;font-size:11px;color:#334155;}
table{width:100%;border-collapse:collapse;}
thead th{background:#1d4ed8;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;}
tbody td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;vertical-align:middle;}
tbody tr:last-child td{border-bottom:none;}
tbody tr:hover{background:#f8fafc;}
.right{text-align:right;font-weight:600;}
tfoot td{border-top:2px solid #e2e8f0;padding:10px;font-weight:700;}
.tf-label{text-align:right;color:#334155;}
.tf-value{text-align:right;font-size:15px;color:#1d4ed8;}
.rodape{text-align:center;font-size:10px;color:#94a3b8;padding:12px 0;border-top:1px solid #f1f5f9;margin-top:16px;}
.assinaturas{display:flex;gap:40px;padding:20px 0 10px;}
.ass-bloco{flex:1;}
.ass-linha{height:1px;background:#94a3b8;margin-bottom:6px;margin-top:36px;}
.ass-label{font-size:10px;color:#64748b;text-align:center;}
@media print{body{background:#fff;}button{display:none;}}
</style></head><body>
<div class="header">
  ${logoUrl ? `<img src="${logoUrl}" style="width:48px;height:48px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,.15);" onerror="this.outerHTML='<div class=logo-box>${escolaNome[0]}</div>'"/>` : `<div class="logo-box">${escolaNome[0]}</div>`}
  <div>
    <div class="escola-nome">${escolaNome}</div>
    <div class="escola-sub">Sistema de Gestão Escolar</div>
  </div>
  <div class="doc-type">
    <div class="doc-label">RELATÓRIO DIÁRIO DE CAIXA</div>
    <div class="doc-date">${hoje}</div>
  </div>
</div>
<div class="body">
  <div class="meta">
    <div class="meta-card">
      <div class="label">Total Recebido</div>
      <div class="value">${Number(relatorio.total).toLocaleString("pt-AO")} Kz</div>
      <div class="sub">${relatorio.count} recibo(s) emitido(s)</div>
    </div>
  </div>

  <div class="section-title">Por Método de Pagamento</div>
  <div class="tags">${porMetodo || "<span style='color:#94a3b8;font-size:11px;'>Sem dados</span>"}</div>

  <div class="section-title">Por Tipo de Cobrança</div>
  <div class="tags">${porTipo || "<span style='color:#94a3b8;font-size:11px;'>Sem dados</span>"}</div>

  <div class="section-title">Detalhe dos Recebimentos</div>
  <table>
    <thead><tr>
      <th>Aluno</th><th>Nº</th><th>Turma</th><th>Tipo</th><th>Mês/Ref.</th><th>Método</th><th>Valor</th>
    </tr></thead>
    <tbody>${linhas || `<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:16px;">Nenhum pagamento registado nesta data.</td></tr>`}</tbody>
    <tfoot><tr>
      <td colspan="6" class="tf-label">TOTAL GERAL</td>
      <td class="tf-value">${Number(relatorio.total).toLocaleString("pt-AO")} Kz</td>
    </tr></tfoot>
  </table>

  <div class="assinaturas">
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Tesoureiro(a)</div></div>
    <div class="ass-bloco"><div class="ass-linha"></div><div class="ass-label">Director(a) / Supervisão</div></div>
  </div>
  <div class="rodape">Documento emitido electronicamente · ${new Date().toLocaleDateString("pt-AO")}</div>
</div>
<script>window.print();</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export default function RelatorioDiario() {
  const { escola } = useAuthStore();
  const hoje = new Date().toISOString().split("T")[0];
  const [data,      setData]      = useState(hoje);
  const [relatorio, setRelatorio] = useState(null);
  const [loading,   setLoading]   = useState(false);

  const carregar = useCallback(async (d) => {
    setLoading(true);
    try {
      const r = await api.get("/pagamentos/relatorio-diario", { params: { data: d } });
      setRelatorio(r.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(data); }, [data, carregar]);

  const total     = relatorio?.total     ?? 0;
  const count     = relatorio?.count     ?? 0;
  const porMetodo = relatorio?.por_metodo ?? {};
  const porTipo   = relatorio?.por_tipo   ?? {};
  const pags      = relatorio?.pagamentos ?? [];

  return (
    <div>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText size={20} className="text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatório Diário de Caixa</h1>
            <p className="text-sm text-gray-500">Resumo dos recebimentos por data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={data}
            max={hoje}
            onChange={e => setData(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => carregar(data)} title="Actualizar"
            className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <RefreshCw size={15} />
          </button>
          {relatorio && (
            <button onClick={() => imprimirRelatorio(relatorio, escola)}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Printer size={15} /> Imprimir
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">A carregar...</div>
      )}

      {!loading && relatorio && (<>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={20} className="text-blue-600" />
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total do Dia</p>
            </div>
            <p className="text-3xl font-bold text-blue-700">{fmt(total)}</p>
            <p className="text-xs text-blue-500 mt-1">{count} recibo{count !== 1 ? "s" : ""} emitido{count !== 1 ? "s" : ""}</p>
          </div>

          {/* Por método */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Banknote size={16} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Por Método</p>
            </div>
            <div className="space-y-2">
              {Object.keys(porMetodo).length === 0
                ? <p className="text-xs text-gray-400">Sem dados</p>
                : Object.entries(porMetodo).map(([m, v]) => (
                  <div key={m} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-medium ${METODO_COLOR[m] || "bg-gray-50 border-gray-200 text-gray-700"}`}>
                    <span>{METODO_LABEL[m] || m}</span>
                    <span>{fmt(v.total)} <span className="opacity-60">({v.count})</span></span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Por tipo */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} className="text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Por Tipo</p>
            </div>
            <div className="space-y-2">
              {Object.keys(porTipo).length === 0
                ? <p className="text-xs text-gray-400">Sem dados</p>
                : Object.entries(porTipo).map(([t, v]) => (
                  <div key={t} className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs font-medium ${TIPO_COLOR[t] || "bg-gray-50 border-gray-200 text-gray-700"}`}>
                    <span>{TIPO_LABEL[t] || t}</span>
                    <span>{fmt(v.total)} <span className="opacity-60">({v.count})</span></span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Tabela de pagamentos */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              Recebimentos de {new Date(data + "T12:00:00").toLocaleDateString("pt-AO", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            </span>
            <span className="text-xs text-gray-400">{count} registo{count !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Aluno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Turma</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mês/Ref.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Método</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referência</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pags.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.aluno?.user?.nome || "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.aluno?.matriculas?.[0]?.turma?.nome || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${TIPO_COLOR[p.tipo] || "bg-gray-50 border-gray-200 text-gray-600"}`}>
                      {TIPO_LABEL[p.tipo] || p.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.mes_referencia || "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 capitalize">{METODO_LABEL[p.metodo] || p.metodo || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.referencia}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(p.valor)}</td>
                </tr>
              ))}
              {pags.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-sm">
                    Nenhum pagamento registado para esta data.
                  </td>
                </tr>
              )}
            </tbody>
            {pags.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{fmt(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </>)}

      {!loading && !relatorio && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecione uma data para ver o relatório</p>
        </div>
      )}
    </div>
  );
}
