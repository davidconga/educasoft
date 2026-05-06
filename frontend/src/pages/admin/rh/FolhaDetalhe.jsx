import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Download, CheckCircle, XCircle, Save } from "lucide-react";
import api from "../../../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("pt-AO");
const meses = ["", "Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ESTADO = {
  rascunho:  { cls: "bg-slate-100 text-slate-600",     l: "Rascunho" },
  processada:{ cls: "bg-blue-100 text-blue-700",       l: "Processada" },
  paga:      { cls: "bg-emerald-100 text-emerald-700", l: "Paga" },
  anulada:   { cls: "bg-red-100 text-red-600",         l: "Anulada" },
};

export default function FolhaDetalhe() {
  const { id } = useParams();
  const [folha, setFolha]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // Edição local
  const [salarioBase, setSalarioBase] = useState(0);
  const [subs, setSubs]               = useState([]);
  const [descs, setDescs]             = useState([]);
  const [obs, setObs]                 = useState("");

  // Pagar
  const [showPagar, setShowPagar] = useState(false);
  const [pagamentoForm, setPagamentoForm] = useState({
    metodo: "transferencia",
    data_pagamento: new Date().toISOString().slice(0, 10),
    referencia_externa: "",
  });

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/folhas-pagamento/${id}`);
      setFolha(r.data);
      setSalarioBase(Number(r.data.salario_base));
      setSubs(r.data.subsidios || []);
      setDescs(r.data.descontos || []);
      setObs(r.data.observacao || "");
    } finally { setLoading(false); }
  };
  useEffect(() => { carregar(); }, [id]);

  const totSub = subs.reduce((s, x) => s + Number(x.valor || 0), 0);
  const totDes = descs.reduce((s, x) => s + Number(x.valor || 0), 0);
  const liquido = Number(salarioBase) + totSub - totDes;
  const editavel = folha?.estado !== "paga" && folha?.estado !== "anulada";

  const salvar = async () => {
    setSaving(true);
    try {
      await api.put(`/folhas-pagamento/${id}`, {
        salario_base: salarioBase,
        subsidios: subs.filter(x => x.nome && x.valor),
        descontos: descs.filter(x => x.nome && x.valor),
        observacao: obs,
      });
      carregar();
    } catch (e) { alert(e.response?.data?.message || "Erro a guardar."); }
    finally { setSaving(false); }
  };

  const processar = async () => {
    if (!confirm("Marcar como processada? Já não se pode editar antes de pagar.")) return;
    await api.patch(`/folhas-pagamento/${id}/processar`);
    carregar();
  };

  const pagar = async () => {
    setSaving(true);
    try {
      await api.patch(`/folhas-pagamento/${id}/pagar`, pagamentoForm);
      setShowPagar(false);
      carregar();
    } catch (e) { alert(e.response?.data?.message || "Erro a pagar."); }
    finally { setSaving(false); }
  };

  const anular = async () => {
    const motivo = prompt("Motivo da anulação?");
    if (!motivo) return;
    await api.patch(`/folhas-pagamento/${id}/anular`, { motivo });
    carregar();
  };

  const baixarPdf = async () => {
    const r = await api.get(`/folhas-pagamento/${id}/recibo.pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url; a.download = `recibo-${folha.referencia}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-slate-400 py-12 text-center">A carregar...</p>;
  if (!folha) return <p className="text-slate-400 py-12 text-center">Folha não encontrada.</p>;

  return (
    <div className="space-y-5">
      <Link to="/rh/folhas" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft size={14}/> Voltar
      </Link>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">{folha.funcionario?.nome}</h1>
            <p className="text-sm text-slate-600">{folha.funcionario?.cargo}{folha.funcionario?.departamento && ` · ${folha.funcionario.departamento}`}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO[folha.estado]?.cls}`}>
                {ESTADO[folha.estado]?.l}
              </span>
              <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                {meses[folha.mes]} {folha.ano}
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-mono">
                {folha.referencia}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={baixarPdf}
              className="text-sm border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1">
              <Download size={14}/> Recibo PDF
            </button>
            {editavel && (
              <button onClick={salvar} disabled={saving}
                className="text-sm bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-600 inline-flex items-center gap-1 disabled:opacity-60">
                <Save size={14}/> {saving ? "..." : "Guardar"}
              </button>
            )}
            {folha.estado === "rascunho" && (
              <button onClick={processar}
                className="text-sm bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-500">
                Processar
              </button>
            )}
            {(folha.estado === "rascunho" || folha.estado === "processada") && (
              <button onClick={() => setShowPagar(true)}
                className="text-sm bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-500 inline-flex items-center gap-1">
                <CheckCircle size={14}/> Marcar pago
              </button>
            )}
            {folha.estado === "paga" && (
              <button onClick={anular}
                className="text-sm border border-red-300 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 inline-flex items-center gap-1">
                <XCircle size={14}/> Anular
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Editor */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Salário base</label>
            <input type="number" min="0" step="0.01" value={salarioBase}
              onChange={e => setSalarioBase(Number(e.target.value))}
              disabled={!editavel}
              className="w-full border rounded-lg px-3 py-2 text-sm font-semibold disabled:bg-slate-50" />
          </div>

          <Componente titulo="Subsídios (+)" cor="emerald" itens={subs} setItens={setSubs} editavel={editavel} />
          <Componente titulo="Descontos (−)" cor="red" itens={descs} setItens={setDescs} editavel={editavel} />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Observação</label>
            <textarea rows="2" value={obs} onChange={e => setObs(e.target.value)} disabled={!editavel}
              className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-slate-50" />
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-fit sticky top-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Apuramento</h2>
          <Linha label="Salário base" v={salarioBase} />
          <Linha label="Total subsídios" v={totSub} cor="text-emerald-600" prefix="+" />
          <Linha label="Total descontos" v={totDes} cor="text-red-500" prefix="−" />
          <div className="border-t border-slate-200 mt-3 pt-3">
            <p className="text-xs uppercase font-bold text-slate-500">Líquido</p>
            <p className="text-3xl font-bold text-slate-800">{fmt(liquido)} <span className="text-base font-normal">Kz</span></p>
          </div>
          {folha.data_pagamento && (
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
              <p>Pago em <strong>{new Date(folha.data_pagamento).toLocaleDateString("pt-AO")}</strong> via {folha.metodo}</p>
              {folha.referencia_externa && <p className="font-mono mt-1">Ref: {folha.referencia_externa}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Modal Pagar */}
      {showPagar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold">Marcar folha como paga</h2>
              <p className="text-xs text-slate-500 mt-1">Líquido: <strong>{fmt(liquido)} Kz</strong></p>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Método *</label>
                <select value={pagamentoForm.metodo}
                  onChange={e => setPagamentoForm({...pagamentoForm, metodo: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="transferencia">Transferência</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="multicaixa">Multicaixa</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data *</label>
                <input type="date" required value={pagamentoForm.data_pagamento}
                  onChange={e => setPagamentoForm({...pagamentoForm, data_pagamento: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Referência externa</label>
                <input value={pagamentoForm.referencia_externa}
                  onChange={e => setPagamentoForm({...pagamentoForm, referencia_externa: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Nº cheque, Nº ref multicaixa..." />
              </div>
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowPagar(false)}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={pagar} disabled={saving}
                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60">
                {saving ? "..." : "✓ Marcar pago"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Componente({ titulo, cor, itens, setItens, editavel }) {
  const corCls = cor === "emerald" ? "text-emerald-700" : "text-red-600";
  const add = () => setItens([...itens, { nome: "", valor: 0 }]);
  const upd = (i, k, v) => setItens(itens.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const rm  = (i)       => setItens(itens.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-xs font-bold uppercase tracking-wide ${corCls}`}>{titulo}</label>
        {editavel && (
          <button onClick={add} className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
            <Plus size={12}/> Adicionar
          </button>
        )}
      </div>
      {itens.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Nenhum item.</p>
      ) : (
        <div className="space-y-2">
          {itens.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={it.nome} onChange={e => upd(i, "nome", e.target.value)} disabled={!editavel}
                placeholder="Descrição" className="flex-1 border rounded-lg px-3 py-1.5 text-sm disabled:bg-slate-50" />
              <input type="number" min="0" step="0.01" value={it.valor}
                onChange={e => upd(i, "valor", Number(e.target.value))} disabled={!editavel}
                placeholder="Valor" className="w-32 border rounded-lg px-3 py-1.5 text-sm text-right disabled:bg-slate-50" />
              {editavel && (
                <button onClick={() => rm(i)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={14}/>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Linha({ label, v, cor, prefix }) {
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${cor || "text-slate-800"}`}>{prefix || ""}{Number(v || 0).toLocaleString("pt-AO")}</span>
    </div>
  );
}
