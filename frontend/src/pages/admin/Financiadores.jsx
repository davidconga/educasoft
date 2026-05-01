import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, X, Building2, CheckCircle2, XCircle } from "lucide-react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

const TIPOS = [
  { value: "interno",    label: "Interno (escola)" },
  { value: "governo",    label: "Governo" },
  { value: "empresa",    label: "Empresa" },
  { value: "fundacao",   label: "Fundação" },
  { value: "particular", label: "Particular" },
  { value: "outro",      label: "Outro" },
];

const TIPO_BADGE = {
  interno:    "bg-slate-100 text-slate-700",
  governo:    "bg-indigo-100 text-indigo-700",
  empresa:    "bg-amber-100 text-amber-700",
  fundacao:   "bg-emerald-100 text-emerald-700",
  particular: "bg-rose-100 text-rose-700",
  outro:      "bg-slate-100 text-slate-700",
};

function Modal({ title, sub, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
  nome: "", tipo: "outro", nif: "", email: "", telefone: "",
  endereco: "", contacto_responsavel: "", observacoes: "", activo: true,
};

export default function Financiadores() {
  const [list, setList]   = useState([]);
  const [load, setLoad]   = useState(true);
  const [search, setSearch] = useState("");
  const [tipo, setTipo]   = useState("");
  const [showInactivos, setShowInactivos] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoad(true);
    try {
      const params = {};
      if (tipo)           params.tipo = tipo;
      if (search)         params.search = search;
      if (!showInactivos) params.activo = true;
      const r = await api.get("/financiadores", { params });
      setList(r.data || []);
    } finally { setLoad(false); }
  };

  useEffect(() => { carregar(); }, [tipo, showInactivos]);

  const abrirNovo = () => {
    setEditing(null);
    setForm(FORM_INICIAL);
    setOpenForm(true);
  };

  const abrirEditar = (f) => {
    setEditing(f);
    setForm({
      nome: f.nome || "", tipo: f.tipo || "outro", nif: f.nif || "",
      email: f.email || "", telefone: f.telefone || "", endereco: f.endereco || "",
      contacto_responsavel: f.contacto_responsavel || "",
      observacoes: f.observacoes || "", activo: !!f.activo,
    });
    setOpenForm(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/financiadores/${editing.id}`, form);
      else         await api.post("/financiadores", form);
      setOpenForm(false);
      await carregar();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  };

  const apagar = async (f) => {
    if (!confirm(`Eliminar financiador "${f.nome}"?`)) return;
    try {
      await api.delete(`/financiadores/${f.id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao eliminar.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Building2 size={22} className="text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">Financiadores de Bolsas</h1>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus size={16} /> Novo Financiador
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && carregar()}
            placeholder="Pesquisar por nome ou NIF…" className={`${inp} pl-9`} />
        </div>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${inp} w-auto min-w-[180px]`}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showInactivos} onChange={(e) => setShowInactivos(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {load ? (
          <p className="text-center text-slate-400 py-12">A carregar…</p>
        ) : list.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Sem financiadores registados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Nome</th>
                <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold">NIF</th>
                <th className="text-left px-4 py-3 font-semibold">Contacto</th>
                <th className="text-center px-4 py-3 font-semibold">Bolsas</th>
                <th className="text-center px-4 py-3 font-semibold">Estado</th>
                <th className="text-right px-4 py-3 font-semibold">Acções</th>
              </tr>
            </thead>
            <tbody>
              {list.map(f => (
                <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{f.nome}</div>
                    {f.contacto_responsavel && <div className="text-xs text-slate-400">{f.contacto_responsavel}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${TIPO_BADGE[f.tipo] || "bg-slate-100 text-slate-700"}`}>
                      {TIPOS.find(t => t.value === f.tipo)?.label || f.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{f.nif || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {f.email && <div>{f.email}</div>}
                    {f.telefone && <div className="text-xs">{f.telefone}</div>}
                    {!f.email && !f.telefone && "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{f.bolsas_count ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    {f.activo
                      ? <CheckCircle2 size={16} className="inline text-emerald-500"/>
                      : <XCircle size={16} className="inline text-slate-300"/>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => abrirEditar(f)} className="p-1.5 hover:bg-slate-100 rounded text-slate-500 mr-1"><Pencil size={15}/></button>
                    <button onClick={() => apagar(f)} className="p-1.5 hover:bg-rose-50 rounded text-rose-500"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openForm && (
        <Modal title={editing ? "Editar Financiador" : "Novo Financiador"}
               sub={editing ? editing.nome : "Entidade que cobre bolsas de aluno"}
               onClose={() => setOpenForm(false)}>
          <form onSubmit={guardar} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Nome *</label>
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={inp}/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Tipo *</label>
                <select required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inp}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">NIF</label>
                <input value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} className={inp}/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp}/>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={inp}/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Contacto responsável</label>
              <input value={form.contacto_responsavel} onChange={e => setForm(f => ({ ...f, contacto_responsavel: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Endereço</label>
              <input value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))} className={inp}/>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">Observações</label>
              <textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className={`${inp} resize-none`}/>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}/>
              Activo
            </label>
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
    </div>
  );
}
