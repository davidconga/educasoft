import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, X, GraduationCap, Ban, RotateCcw, FileText } from "lucide-react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";
const fmt = (v) => Number(v || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2 });

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const FORM_INICIAL = {
  aluno_id: "", matricula_id: "", financiador_id: "",
  tipo: "percentagem", valor: "",
  cobre_propinas: true, cobre_emolumentos: true, cobre_matricula: true,
  data_inicio: new Date().toISOString().slice(0, 10),
  observacoes: "",
};

export default function Bolsas() {
  const [list, setList]               = useState([]);
  const [load, setLoad]               = useState(true);
  const [status, setStatus]           = useState("activa");
  const [search, setSearch]           = useState("");
  const [financiadorFilter, setFin]   = useState("");
  const [financiadores, setFinList]   = useState([]);
  const [alunos, setAlunos]           = useState([]);
  const [matriculasAluno, setMatAlu]  = useState([]);

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(FORM_INICIAL);
  const [saving, setSaving]     = useState(false);
  const [openCancel, setOpenCancel] = useState(null);
  const [motivoCancel, setMotivoCancel] = useState("");

  const [openRecibo, setOpenRecibo] = useState(null);
  const [reciboForm, setReciboForm] = useState({ desde: "", ate: "", observacoes: "" });
  const [emitindoRecibo, setEmitindo] = useState(false);

  const carregar = async () => {
    setLoad(true);
    try {
      const params = {};
      if (status)             params.status = status;
      if (search)             params.search = search;
      if (financiadorFilter)  params.financiador_id = financiadorFilter;
      const r = await api.get("/bolsas", { params });
      setList(r.data || []);
    } finally { setLoad(false); }
  };

  useEffect(() => { carregar(); }, [status, financiadorFilter]);

  useEffect(() => {
    api.get("/financiadores", { params: { activo: true } }).then(r => setFinList(r.data || []));
    api.get("/alunos").then(r => setAlunos(r.data || []));
  }, []);

  useEffect(() => {
    if (!form.aluno_id) { setMatAlu([]); return; }
    api.get(`/alunos/${form.aluno_id}`).then(r => {
      const ms = r.data?.matriculas || [];
      setMatAlu(ms);
      // pré-selecciona matrícula activa
      const activa = ms.find(m => m.status === "activa");
      if (!editing && activa) setForm(f => ({ ...f, matricula_id: activa.id }));
    });
  }, [form.aluno_id]);

  const abrirNovo = () => {
    setEditing(null);
    setForm(FORM_INICIAL);
    setOpenForm(true);
  };

  const abrirEditar = (b) => {
    setEditing(b);
    setForm({
      aluno_id: b.aluno_id, matricula_id: b.matricula_id || "",
      financiador_id: b.financiador_id || "",
      tipo: b.tipo, valor: b.valor,
      cobre_propinas: !!b.cobre_propinas, cobre_emolumentos: !!b.cobre_emolumentos, cobre_matricula: !!b.cobre_matricula,
      data_inicio: b.data_inicio?.slice(0, 10) || "",
      observacoes: b.observacoes || "",
    });
    setOpenForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        valor: Number(form.valor),
        financiador_id: form.financiador_id || null,
        matricula_id: form.matricula_id || null,
      };
      if (editing) await api.put(`/bolsas/${editing.id}`, payload);
      else         await api.post("/bolsas", payload);
      setOpenForm(false);
      await carregar();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  };

  const cancelar = async () => {
    try {
      await api.post(`/bolsas/${openCancel.id}/cancelar`, { motivo: motivoCancel });
      setOpenCancel(null);
      setMotivoCancel("");
      carregar();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao cancelar.");
    }
  };

  const reactivar = async (b) => {
    if (!confirm(`Reactivar a bolsa de "${b.aluno?.user?.nome}"?`)) return;
    try {
      await api.post(`/bolsas/${b.id}/reactivar`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao reactivar.");
    }
  };

  const apagar = async (b) => {
    if (!confirm("Eliminar esta bolsa?")) return;
    try {
      await api.delete(`/bolsas/${b.id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao eliminar.");
    }
  };

  const emitirRecibo = async () => {
    setEmitindo(true);
    try {
      const r = await api.post("/recibos-bolsa/emitir", {
        aluno_id: openRecibo.aluno_id,
        financiador_id: openRecibo.financiador_id,
        desde: reciboForm.desde,
        ate: reciboForm.ate,
        observacoes: reciboForm.observacoes,
      });
      // abrir PDF
      const pdfRes = await api.get(`/recibos-bolsa/${r.data.id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(pdfRes.data);
      window.open(url, "_blank");
      setOpenRecibo(null);
      setReciboForm({ desde: "", ate: "", observacoes: "" });
      alert(`Recibo ${r.data.referencia} emitido. Total: ${fmt(r.data.valor_total)} AOA`);
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao emitir recibo.");
    } finally { setEmitindo(false); }
  };

  const podeEmitirRecibo = (b) => b.financiador_id && b.status === "activa";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Bolsas de Estudo</h1>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16} /> Nova Bolsa
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && carregar()}
            placeholder="Pesquisar aluno…" className={`${inp} pl-9`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inp} w-auto min-w-[140px]`}>
          <option value="">Todos os estados</option>
          <option value="activa">Activas</option>
          <option value="cancelada">Canceladas</option>
        </select>
        <select value={financiadorFilter} onChange={(e) => setFin(e.target.value)} className={`${inp} w-auto min-w-[180px]`}>
          <option value="">Todos os financiadores</option>
          <option value="null">— Internos —</option>
          {financiadores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {load ? (
          <p className="text-center text-slate-400 py-12">A carregar…</p>
        ) : list.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Sem bolsas registadas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Aluno</th>
                <th className="text-left px-4 py-3 font-semibold">Financiador</th>
                <th className="text-left px-4 py-3 font-semibold">Bolsa</th>
                <th className="text-left px-4 py-3 font-semibold">Cobre</th>
                <th className="text-left px-4 py-3 font-semibold">Início</th>
                <th className="text-center px-4 py-3 font-semibold">Estado</th>
                <th className="text-right px-4 py-3 font-semibold">Acções</th>
              </tr>
            </thead>
            <tbody>
              {list.map(b => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{b.aluno?.user?.nome || "—"}</div>
                    {b.matricula?.classe?.nome && (
                      <div className="text-xs text-slate-400">
                        {b.matricula.curso?.nome} · {b.matricula.classe.nome}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {b.financiador?.nome || <span className="text-slate-400 italic">Interno (escola)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {b.tipo === "percentagem"
                      ? <span className="font-semibold text-emerald-700">{Number(b.valor).toFixed(2).replace(/\.?0+$/, "")}%</span>
                      : <span className="font-semibold text-emerald-700">{fmt(b.valor)} AOA</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {[b.cobre_propinas && "Propinas", b.cobre_emolumentos && "Emolumentos", b.cobre_matricula && "Matrícula"].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{b.data_inicio?.slice(0, 10) || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {b.status === "activa"
                      ? <span className="text-xs font-semibold px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">Activa</span>
                      : <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-600">Cancelada</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {podeEmitirRecibo(b) && (
                      <button title="Emitir recibo de bolsa para o financiador"
                        onClick={() => { setOpenRecibo(b); setReciboForm({ desde: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), ate: new Date().toISOString().slice(0, 10), observacoes: "" }); }}
                        className="p-1.5 hover:bg-emerald-50 rounded text-emerald-600 mr-1">
                        <FileText size={15}/>
                      </button>
                    )}
                    <button onClick={() => abrirEditar(b)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 mr-1"><Pencil size={15}/></button>
                    {b.status === "activa"
                      ? <button onClick={() => setOpenCancel(b)} className="p-1.5 hover:bg-amber-50 rounded text-amber-600 mr-1" title="Cancelar bolsa"><Ban size={15}/></button>
                      : <button onClick={() => reactivar(b)}    className="p-1.5 hover:bg-blue-50 rounded text-blue-600 mr-1" title="Reactivar"><RotateCcw size={15}/></button>}
                    <button onClick={() => apagar(b)} className="p-1.5 hover:bg-rose-50 rounded text-rose-500"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openForm && (
        <Modal title={editing ? "Editar Bolsa" : "Nova Bolsa"}
               sub={editing ? `${editing.aluno?.user?.nome || ""}` : "Atribuir desconto fiscal a aluno"}
               wide onClose={() => setOpenForm(false)}>
          <form onSubmit={guardar} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Aluno *</label>
              <select required disabled={!!editing} value={form.aluno_id} onChange={e => setForm(f => ({ ...f, aluno_id: e.target.value, matricula_id: "" }))} className={inp}>
                <option value="">— Seleccionar —</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.user?.nome || a.numero_aluno}</option>)}
              </select>
            </div>
            {matriculasAluno.length > 0 && (
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Matrícula (vigência da bolsa)</label>
                <select value={form.matricula_id} onChange={e => setForm(f => ({ ...f, matricula_id: e.target.value }))} className={inp}>
                  <option value="">Sem vínculo a matrícula específica</option>
                  {matriculasAluno.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.curso?.nome || ""} · {m.classe?.nome || ""} — {m.status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">A bolsa fica activa enquanto a matrícula seleccionada estiver activa.</p>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Financiador</label>
              <select value={form.financiador_id} onChange={e => setForm(f => ({ ...f, financiador_id: e.target.value }))} className={inp}>
                <option value="">— Bolsa interna (escola assume) —</option>
                {financiadores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo *</label>
                <select required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inp}>
                  <option value="percentagem">Percentagem (%)</option>
                  <option value="valor_fixo">Valor fixo (AOA)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  Valor * {form.tipo === "percentagem" ? "(0–100%)" : "(AOA)"}
                </label>
                <input required type="number" min="0" step="0.01" max={form.tipo === "percentagem" ? 100 : undefined}
                  value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className={inp}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Cobre</label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={form.cobre_propinas} onChange={e => setForm(f => ({ ...f, cobre_propinas: e.target.checked }))}/>
                  Propinas
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={form.cobre_emolumentos} onChange={e => setForm(f => ({ ...f, cobre_emolumentos: e.target.checked }))}/>
                  Emolumentos
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={form.cobre_matricula} onChange={e => setForm(f => ({ ...f, cobre_matricula: e.target.checked }))}/>
                  Matrícula
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Data de início</label>
              <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Observações</label>
              <textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className={`${inp} resize-none`}/>
            </div>
            <div className="flex gap-2 pt-3">
              <button type="button" onClick={() => setOpenForm(false)}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
                {saving ? "A guardar…" : (editing ? "Guardar" : "Criar")}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {openCancel && (
        <Modal title="Cancelar bolsa" sub={openCancel.aluno?.user?.nome || ""} onClose={() => setOpenCancel(null)}>
          <p className="text-sm text-slate-600 mb-3">
            Bolsas pendentes/vencidas serão recalculadas sem desconto. Pagamentos já pagos mantêm-se inalterados.
          </p>
          <label className="text-xs font-medium text-slate-600 mb-1.5 block">Motivo (opcional)</label>
          <input value={motivoCancel} onChange={e => setMotivoCancel(e.target.value)} className={inp} placeholder="Ex: aproveitamento insuficiente"/>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setOpenCancel(null)} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium">Voltar</button>
            <button onClick={cancelar} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">Cancelar bolsa</button>
          </div>
        </Modal>
      )}

      {openRecibo && (
        <Modal title="Emitir recibo de bolsa" sub={`Para ${openRecibo.financiador?.nome || ""} — beneficiário ${openRecibo.aluno?.user?.nome || ""}`}
               onClose={() => setOpenRecibo(null)}>
          <p className="text-sm text-slate-600 mb-3">
            Agrega todos os pagamentos pagos com bolsa do financiador no período seleccionado, num único recibo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Desde *</label>
              <input type="date" required value={reciboForm.desde} onChange={e => setReciboForm(f => ({ ...f, desde: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Até *</label>
              <input type="date" required value={reciboForm.ate} onChange={e => setReciboForm(f => ({ ...f, ate: e.target.value }))} className={inp}/>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Observações</label>
            <textarea rows={2} value={reciboForm.observacoes} onChange={e => setReciboForm(f => ({ ...f, observacoes: e.target.value }))} className={`${inp} resize-none`}/>
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setOpenRecibo(null)} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-sm font-medium">Voltar</button>
            <button onClick={emitirRecibo} disabled={emitindoRecibo || !reciboForm.desde || !reciboForm.ate}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60">
              {emitindoRecibo ? "A emitir…" : "Emitir e abrir PDF"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
