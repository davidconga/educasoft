import { useState, useEffect } from "react";
import { Printer, RefreshCw, AlertCircle } from "lucide-react";
import api from "../../services/api";

const sel = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50";

const MESES_CURTOS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function cellStyle(pag) {
  if (!pag) return { bg: "bg-slate-100", text: "text-slate-300", label: "—" };
  if (pag.status === "pago")     return { bg: "bg-emerald-100", text: "text-emerald-700", label: "✓" };
  if (pag.status === "vencido")  return { bg: "bg-red-100",     text: "text-red-700",     label: "✗" };
  return                                { bg: "bg-amber-50",    text: "text-amber-700",   label: "!" };
}

function printControlo({ turmaLabel, anoLetivo, meses, alunos, escolaNome, logoUrl }) {
  const ths = meses.map(m => `<th style="border:1px solid #475569;padding:4px;width:38px;font-size:10px;color:#bfdbfe">${m.nome}</th>`).join("");
  const rows = alunos.map(a => {
    const tds = meses.map(m => {
      const pag = a.meses[m.ref];
      const cor = !pag ? "#9ca3af" : pag.status === "pago" ? "#059669" : pag.status === "vencido" ? "#dc2626" : "#d97706";
      const lbl = !pag ? "—"       : pag.status === "pago" ? "✓"       : pag.status === "vencido" ? "✗"       : "!";
      return `<td style="border:1px solid #e2e8f0;padding:3px;text-align:center;color:${cor};font-weight:bold;font-size:11px">${lbl}</td>`;
    }).join("");
    return `<tr><td style="border:1px solid #ccc;padding:4px 8px;text-align:center">${a.ord}</td><td style="border:1px solid #ccc;padding:4px 8px">${a.nome ?? ""}</td>${tds}</tr>`;
  }).join("");
  const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px" onerror="this.style.display='none'">` : "";

  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Controlo de Propinas</title>
    <style>body{font-family:Arial,sans-serif;font-size:11px;margin:16px}table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style>
  </head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
      <div style="display:flex;align-items:center">
        ${logoHtml}
        <div>
          ${escolaNome ? `<p style="margin:0 0 2px;font-weight:bold;font-size:13px">${escolaNome}</p>` : ""}
          <h2 style="margin:0">Controlo de Propinas</h2>
          <p style="margin:4px 0;color:#555">Turma: <b>${turmaLabel}</b> &nbsp;|&nbsp; Ano Lectivo: <b>${anoLetivo}</b></p>
        </div>
      </div>
      <button onclick="window.print()" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer">Imprimir</button>
    </div>
    <table>
      <thead><tr style="background:#1e293b;color:#fff">
        <th style="border:1px solid #475569;padding:6px;width:40px">Nº</th>
        <th style="border:1px solid #475569;padding:6px;text-align:left;min-width:160px">Nome do Aluno</th>
        ${ths}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:10px;font-size:10px;color:#666">
      <span style="color:#059669">✓ Pago</span> &nbsp;|&nbsp;
      <span style="color:#d97706">! Pendente</span> &nbsp;|&nbsp;
      <span style="color:#dc2626">✗ Vencido</span> &nbsp;|&nbsp;
      <span style="color:#9ca3af">— Sem registo</span>
    </div>
  </body></html>`);
  w.document.close();
}

export default function ControloPropinas() {
  const [turmas,    setTurmas]    = useState([]);
  const [turmaId,   setTurmaId]   = useState("");
  const [anoLetivo, setAnoLetivo] = useState(String(new Date().getFullYear()));
  const [dados,     setDados]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState(null);
  const [escola,    setEscola]    = useState(null);

  useEffect(() => {
    api.get("/turmas").then(r => setTurmas(r.data));
    api.get("/configuracoes/escola").then(r => setEscola(r.data)).catch(() => {});
  }, []);

  const load = async () => {
    if (!turmaId) return;
    setLoading(true); setMsg(null); setDados(null);
    try {
      const { data } = await api.get("/pagamentos/controlo-propinas", { params: { turma_id: turmaId, ano_letivo: anoLetivo } });
      setDados(data);
    } catch { setMsg({ type: "error", text: "Erro ao carregar dados." }); }
    finally  { setLoading(false); }
  };

  const turmaLabel = turmas.find(t => String(t.id) === String(turmaId))?.nome ?? "";

  /* estatísticas */
  const stats = dados ? (() => {
    let pago = 0, pendente = 0, vencido = 0, semRegistro = 0;
    dados.alunos.forEach(a => {
      dados.meses.forEach(m => {
        const pag = a.meses[m.ref];
        if (!pag) semRegistro++;
        else if (pag.status === "pago")    pago++;
        else if (pag.status === "vencido") vencido++;
        else pendente++;
      });
    });
    return { pago, pendente, vencido, semRegistro };
  })() : null;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-800">Controlo de Propinas</h1>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Turma *</label>
            <select value={turmaId} onChange={e => setTurmaId(e.target.value)} className={sel}>
              <option value="">Seleccionar...</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ano de Pagamento</label>
            <input value={anoLetivo} onChange={e => setAnoLetivo(e.target.value)} className={sel} placeholder="2026" />
          </div>
          <div className="flex items-end">
            <button onClick={load} disabled={!turmaId || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
              {loading ? "A carregar..." : "Carregar"}
            </button>
          </div>
          {dados && (
            <div className="flex items-end">
              <button onClick={() => printControlo({ turmaLabel, anoLetivo, meses: dados.meses, alunos: dados.alunos, escolaNome: escola?.nome, logoUrl: escola?.logo ? `/storage/${escola.logo}` : null })}
                className="w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <Printer size={14} /> Imprimir
              </button>
            </div>
          )}
        </div>
      </div>

      {msg && (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl border bg-red-50 text-red-700 border-red-200">
          <AlertCircle size={15} /> {msg.text}
        </div>
      )}

      {!turmaId && !dados && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          Seleccione uma turma para ver o controlo de propinas.
        </div>
      )}

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Pagos",         value: stats.pago,       cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "Pendentes",     value: stats.pendente,   cls: "bg-amber-50 text-amber-700 border-amber-100" },
            { label: "Vencidos",      value: stats.vencido,    cls: "bg-red-50 text-red-700 border-red-100" },
            { label: "Sem Registo",   value: stats.semRegistro,cls: "bg-slate-50 text-slate-500 border-slate-100" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.cls}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela Matriz */}
      {dados && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">{dados.alunos.length} alunos · {anoLetivo}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="border border-slate-600 px-2 py-2 text-center w-10">Nº</th>
                  <th className="border border-slate-600 px-3 py-2 text-left min-w-[160px]">Nome do Aluno</th>
                  {dados.meses.map(m => (
                    <th key={m.ref} className="border border-slate-600 px-1 py-2 text-center w-10 text-[10px] text-blue-200">
                      {MESES_CURTOS[m.num - 1]}
                    </th>
                  ))}
                  <th className="border border-slate-600 px-2 py-2 text-center w-16 text-[10px] text-emerald-300">Pagos</th>
                </tr>
              </thead>
              <tbody>
                {dados.alunos.map((a, idx) => {
                  const nPago = dados.meses.filter(m => a.meses[m.ref]?.status === "pago").length;
                  return (
                    <tr key={a.aluno_id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="border border-slate-100 px-2 py-1 text-center text-slate-400 font-mono">{a.ord}</td>
                      <td className="border border-slate-100 px-3 py-1 font-medium text-slate-800 whitespace-nowrap">{a.nome}</td>
                      {dados.meses.map(m => {
                        const pag = a.meses[m.ref];
                        const { bg, text, label } = cellStyle(pag);
                        return (
                          <td key={m.ref} className={`border border-slate-100 px-1 py-1 text-center font-bold ${bg} ${text}`} title={pag ? `${m.nome}: ${pag.status}` : `${m.nome}: sem registo`}>
                            {label}
                          </td>
                        );
                      })}
                      <td className={`border border-slate-100 px-2 py-1 text-center font-bold text-xs ${nPago === 12 ? "text-emerald-600" : nPago >= 6 ? "text-blue-600" : "text-red-600"}`}>
                        {nPago}/12
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="text-emerald-600 font-medium">✓ Pago</span>
            <span className="text-amber-600 font-medium">! Pendente</span>
            <span className="text-red-600 font-medium">✗ Vencido</span>
            <span>— Sem registo</span>
          </div>
        </div>
      )}
    </div>
  );
}
