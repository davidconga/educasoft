import { useState } from "react";
import { Download } from "lucide-react";
import api from "../services/api";

const ANO_REF = new Date().getFullYear();
const ANOS = Array.from({ length: 4 }, (_, i) => ANO_REF - 2 + i);
const MESES = [
  { v: "",   l: "Ano inteiro" },
  { v: "1",  l: "Janeiro" }, { v: "2",  l: "Fevereiro" }, { v: "3",  l: "Março" },
  { v: "4",  l: "Abril" },   { v: "5",  l: "Maio" },      { v: "6",  l: "Junho" },
  { v: "7",  l: "Julho" },   { v: "8",  l: "Agosto" },    { v: "9",  l: "Setembro" },
  { v: "10", l: "Outubro" }, { v: "11", l: "Novembro" },  { v: "12", l: "Dezembro" },
];

/**
 * Botão "Exportar SAFT-AO". Abre um dropdown com selectores de ano/mês.
 * Variant: "primary" (default) | "outline" | "icon"
 */
export default function SaftButton({ variant = "primary", className = "" }) {
  const [open, setOpen]       = useState(false);
  const [ano, setAno]         = useState(ANO_REF);
  const [mes, setMes]         = useState("");
  const [loading, setLoading] = useState(false);

  const baixar = async () => {
    setLoading(true);
    try {
      const params = { ano };
      if (mes) params.mes = mes;
      const r = await api.get("/saft", { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/xml" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `SAFT-AO_${ano}${mes ? `-${String(mes).padStart(2,"0")}` : ""}.xml`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao exportar SAFT.");
    } finally { setLoading(false); }
  };

  const cls = variant === "outline"
    ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
    : variant === "icon"
    ? "text-slate-400 hover:text-blue-600"
    : "bg-emerald-600 hover:bg-emerald-700 text-white";

  return (
    <div className={`relative inline-block ${className}`}>
      <button onClick={() => setOpen(o => !o)} title="Exportar SAFT-AO"
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${cls}`}>
        <Download size={14}/> {variant === "icon" ? "" : "SAFT-AO"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
          <div className="absolute right-0 mt-2 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-4 w-72 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-700">Exportar SAFT-AO</p>
              <p className="text-xs text-slate-400 mt-0.5">XML para a AGT (declaração fiscal)</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ano</label>
                <select value={ano} onChange={e => setAno(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-slate-50">
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Mês</label>
                <select value={mes} onChange={e => setMes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-slate-50">
                  {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
              </div>
            </div>
            <button onClick={baixar} disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2 rounded-lg text-sm font-medium">
              {loading ? "A gerar..." : "Baixar XML"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
