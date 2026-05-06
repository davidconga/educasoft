import { useState, useEffect } from "react";
import { Save, Printer, CheckCircle, AlertCircle, FileText } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";

const FORMATOS = [
  {
    id: "a4",
    titulo: "A4",
    descricao: "Folha standard 210×297 mm. Recibo completo com todos os detalhes.",
    medidas: "210 × 297 mm",
    uso: "Impressoras laser/jato de tinta convencionais",
  },
  {
    id: "a5",
    titulo: "A5",
    descricao: "Meia folha 148×210 mm. Recibo compacto, ideal para arquivar em dossiers.",
    medidas: "148 × 210 mm",
    uso: "Impressoras com bandeja A5 ou corte manual de A4",
  },
  {
    id: "ticket",
    titulo: "POS / Térmica",
    descricao: "Tira contínua de 80 mm. Talão compacto rápido de imprimir.",
    medidas: "80 mm × auto",
    uso: "Impressoras térmicas (Epson TM-T20, etc.)",
  },
];

export default function ConfiguracaoImpressao() {
  const updateEscola = useAuthStore(s => s.updateEscola);
  const [formato, setFormato] = useState("a4");
  const [original, setOriginal] = useState("a4");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState(null);

  useEffect(() => {
    api.get("/configuracoes/impressao")
      .then(r => {
        const f = r.data?.formato_impressao || "a4";
        setFormato(f); setOriginal(f);
      })
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await api.put("/configuracoes/impressao", { formato_impressao: formato });
      const f = r.data?.formato_impressao || formato;
      setOriginal(f);
      updateEscola({ formato_impressao: f });
      showMsg("Formato de impressão actualizado.");
    } catch (err) {
      showMsg(err.response?.data?.message || "Erro ao guardar.", "error");
    } finally { setSaving(false); }
  };

  if (loading) return <p className="text-center text-slate-400 py-16">A carregar...</p>;

  const dirty = formato !== original;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Printer size={22} className="text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">Configuração de Impressão</h1>
      </div>
      <p className="text-sm text-slate-500">
        Escolhe o formato de impressão por defeito para os recibos e comprovativos. Os utilizadores podem
        sempre mudar pontualmente na janela de impressão.
      </p>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border
          ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.type === "success" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {FORMATOS.map(f => {
          const active = formato === f.id;
          return (
            <button key={f.id} type="button" onClick={() => setFormato(f.id)}
              className={`text-left p-5 rounded-2xl border-2 transition-all ${
                active
                  ? "border-blue-600 bg-blue-50/40 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}>
              <div className="flex items-start justify-between mb-3">
                <FileText size={20} className={active ? "text-blue-600" : "text-slate-400"} />
                {active && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    Activo
                  </span>
                )}
              </div>
              <h3 className={`font-bold text-base ${active ? "text-blue-700" : "text-slate-800"}`}>{f.titulo}</h3>
              <p className="text-xs text-slate-500 mt-1">{f.medidas}</p>
              <p className="text-sm text-slate-600 mt-3">{f.descricao}</p>
              <p className="text-xs text-slate-400 mt-2 italic">{f.uso}</p>
            </button>
          );
        })}
      </div>

      <div className="pt-2 flex items-center gap-3">
        <button onClick={handleSave} disabled={saving || !dirty}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
          <Save size={15} /> {saving ? "A guardar..." : "Guardar"}
        </button>
        {dirty && (
          <span className="text-xs text-amber-600">Alterações pendentes — clica Guardar.</span>
        )}
      </div>
    </div>
  );
}
