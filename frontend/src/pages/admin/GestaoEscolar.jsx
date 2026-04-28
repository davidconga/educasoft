import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

/* ── utilitários ───────────────────��───────────────────────── */
const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

const Icon = {
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

/* ── componentes reutilizáveis ──────────────────────���──────── */
function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <div className="relative cursor-pointer w-10 h-5 shrink-0" onClick={() => onChange(!checked)}>
      <div className={`w-full h-full rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-200"}`} />
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </div>
  );
}

function Modal({ title, sub, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">{Icon.close}</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormActions({ onCancel, saving, color = "blue" }) {
  const bg = color === "violet" ? "bg-violet-600 hover:bg-violet-700" : color === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" : color === "amber" ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700";
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onCancel} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
      <button type="submit" disabled={saving} className={`flex-1 ${bg} disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors`}>
        {saving ? "A guardar..." : "Guardar"}
      </button>
    </div>
  );
}

function EmptyState({ msg, onAdd, label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-14 h-14 mb-4 opacity-20">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
      </svg>
      <p className="text-sm mb-3">{msg}</p>
      {onAdd && <button onClick={onAdd} className="text-sm text-blue-600 hover:underline">+ {label}</button>}
    </div>
  );
}

function StatusBadge({ ativo }) {
  return ativo
    ? <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium ring-1 ring-emerald-200">Activo</span>
    : <span className="bg-slate-100 text-slate-400 text-xs px-2.5 py-1 rounded-full ring-1 ring-slate-200">Inactivo</span>;
}

const ANOS_LETIVOS = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() - 1 + i));

/* ══════════════════════════════════════════════════════════════
   SECÇÃO — CLASSES
══════════════════════════════════════════════════════════════ */
function SeccaoClasses({ cursos }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ nome: "", nivel: "", ordem: "", curso_id: "", descricao: "", ativo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = () => {
    setLoading(true);
    api.get("/classes").then(r => setItems(r.data.data || r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew  = () => { setForm({ nome: "", nivel: "", ordem: "", curso_id: "", descricao: "", ativo: true }); setError(""); setModal("new"); };
  const openEdit = (it) => { setForm({ ...it, ativo: !!it.ativo }); setError(""); setModal(it); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      modal === "new" ? await api.post("/classes", form) : await api.put(`/classes/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar esta classe?")) return;
    await api.delete(`/classes/${id}`).catch(() => {});
    load();
  };

  const sorted = [...items].sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{items.length} classe(s) configurada(s)</p>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Nova Classe
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : sorted.length === 0 ? (
        <EmptyState msg="Nenhuma classe configurada." onAdd={openNew} label="Adicionar primeira classe" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Ordem</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Classe</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Nível</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Curso</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(it => (
                <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{it.ordem || "—"}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{it.nome}</p>
                    {it.descricao && <p className="text-xs text-slate-400 truncate max-w-xs">{it.descricao}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{it.nivel || "—"}</td>
                  <td className="px-5 py-3.5">
                    {it.curso_id
                      ? <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">{cursos.find(c => String(c.id) === String(it.curso_id))?.nome || "—"}</span>
                      : <span className="text-slate-400 text-xs">Todos</span>}
                  </td>
                  <td className="px-5 py-3.5 text-center"><StatusBadge ativo={it.ativo} /></td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(it)} className="w-8 h-8 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                      <button onClick={() => remove(it.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === "new" ? "Nova Classe" : "Editar Classe"} sub="Ano de escolaridade" onClose={() => setModal(null)}>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" required>
                <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: 12ª Classe" className={inp} />
              </Field>
              <Field label="Nível">
                <input value={form.nivel} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} placeholder="Ex: Secundário" className={inp} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ordem (sequência)">
                <input type="number" min="1" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))} placeholder="Ex: 12" className={inp} />
              </Field>
              <Field label="Curso" required>
                <select required value={form.curso_id || ""} onChange={e => setForm(f => ({ ...f, curso_id: e.target.value }))} className={inp}>
                  <option value="">Seleccionar curso...</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Descrição">
              <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição opcional..." className={`${inp} resize-none`} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle checked={form.ativo} onChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <span className="text-sm text-slate-600">Classe activa</span>
            </label>
            <FormActions onCancel={() => setModal(null)} saving={saving} />
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECÇÃO — TURNOS
══════════════════════════════════════════════════════════════ */
const TURNO_CORES = {
  manha:  { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",  dot: "bg-amber-400"   },
  tarde:  { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200", dot: "bg-orange-500"  },
  noite:  { bg: "bg-indigo-50",  text: "text-indigo-700",  ring: "ring-indigo-200", dot: "bg-indigo-500"  },
  integral:{ bg: "bg-blue-50",   text: "text-blue-700",    ring: "ring-blue-200",   dot: "bg-blue-500"    },
};

function SeccaoTurnos() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ nome: "", codigo: "manha", hora_inicio: "07:00", hora_fim: "12:30", descricao: "", ativo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = () => {
    setLoading(true);
    api.get("/turnos").then(r => setItems(r.data.data || r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew  = () => { setForm({ nome: "", codigo: "manha", hora_inicio: "07:00", hora_fim: "12:30", descricao: "", ativo: true }); setError(""); setModal("new"); };
  const openEdit = (it) => { setForm({ ...it, ativo: !!it.ativo }); setError(""); setModal(it); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      modal === "new" ? await api.post("/turnos", form) : await api.put(`/turnos/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar este turno?")) return;
    await api.delete(`/turnos/${id}`).catch(() => {});
    load();
  };

  const cor = (codigo) => TURNO_CORES[codigo] || TURNO_CORES.manha;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{items.length} turno(s) configurado(s)</p>
        <button onClick={openNew} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Novo Turno
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : items.length === 0 ? (
        <EmptyState msg="Nenhum turno configurado." onAdd={openNew} label="Adicionar primeiro turno" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {items.map(it => {
            const c = cor(it.codigo);
            return (
              <div key={it.id} className={`rounded-2xl border p-5 ${it.ativo ? "bg-white border-slate-100 hover:shadow-md" : "bg-slate-50 border-slate-100 opacity-70"} transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${c.bg} ${c.text} ${c.ring}`}>
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    {it.nome || it.codigo}
                  </div>
                  <StatusBadge ativo={it.ativo} />
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-slate-800">{it.hora_inicio}</span>
                  <span className="text-slate-400 text-sm">→</span>
                  <span className="text-2xl font-bold text-slate-800">{it.hora_fim}</span>
                </div>
                {it.descricao && <p className="text-xs text-slate-400 mt-1">{it.descricao}</p>}
                <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => openEdit(it)} className="w-8 h-8 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                  <button onClick={() => remove(it.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === "new" ? "Novo Turno" : "Editar Turno"} sub="Período lectivo" onClose={() => setModal(null)}>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" required>
                <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Manhã" className={inp} />
              </Field>
              <Field label="Código / Tipo">
                <select value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} className={inp}>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                  <option value="integral">Integral</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hora de Início" required>
                <input type="time" required value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} className={inp} />
              </Field>
              <Field label="Hora de Fim" required>
                <input type="time" required value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} className={inp} />
              </Field>
            </div>
            <Field label="Descrição">
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Funciona de segunda a sexta" className={inp} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle checked={form.ativo} onChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <span className="text-sm text-slate-600">Turno activo</span>
            </label>
            <FormActions onCancel={() => setModal(null)} saving={saving} color="amber" />
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECÇÃO — SALAS
═════════════════════════════════════════════════════��════════ */
const TIPOS_SALA = ["Sala de Aula","Laboratório","Biblioteca","Auditório","Sala de Informática","Sala de Arte","Ginásio","Outro"];

const TIPO_ICONE = {
  "Sala de Aula":        "🏫",
  "Laboratório":         "🔬",
  "Biblioteca":          "📚",
  "Auditório":           "🎭",
  "Sala de Informática": "💻",
  "Sala de Arte":        "🎨",
  "Ginásio":             "🏋️",
  "Outro":               "📌",
};

function SeccaoSalas() {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ nome: "", tipo: "Sala de Aula", capacidade: "", localizacao: "", descricao: "", ativo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = () => {
    setLoading(true);
    api.get("/salas").then(r => setItems(r.data.data || r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew  = () => { setForm({ nome: "", tipo: "Sala de Aula", capacidade: "", localizacao: "", descricao: "", ativo: true }); setError(""); setModal("new"); };
  const openEdit = (it) => { setForm({ ...it, ativo: !!it.ativo }); setError(""); setModal(it); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      modal === "new" ? await api.post("/salas", form) : await api.put(`/salas/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar esta sala?")) return;
    await api.delete(`/salas/${id}`).catch(() => {});
    load();
  };

  const filtradas = items.filter(s =>
    s.nome?.toLowerCase().includes(search.toLowerCase()) ||
    s.localizacao?.toLowerCase().includes(search.toLowerCase())
  );

  const porTipo = filtradas.reduce((acc, s) => {
    const t = s.tipo || "Outro";
    if (!acc[t]) acc[t] = [];
    acc[t].push(s);
    return acc;
  }, {});

  return (
    <>
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar sala..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        </div>
        <span className="text-sm text-slate-400">{filtradas.length} sala(s)</span>
        <button onClick={openNew} className="ml-auto flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Nova Sala
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : filtradas.length === 0 ? (
        <EmptyState msg="Nenhuma sala encontrada." onAdd={openNew} label="Adicionar primeira sala" />
      ) : (
        <div className="space-y-6">
          {Object.entries(porTipo).map(([tipo, salas]) => (
            <div key={tipo}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-slate-600">{TIPO_ICONE[tipo] || "📌"} {tipo}</span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">{salas.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {salas.map(s => (
                  <div key={s.id} className={`bg-white rounded-2xl border p-4 transition-all ${s.ativo ? "border-slate-100 hover:shadow-md" : "border-slate-100 opacity-60"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{s.nome}</p>
                        {s.localizacao && <p className="text-xs text-slate-400 mt-0.5">📍 {s.localizacao}</p>}
                        {s.descricao  && <p className="text-xs text-slate-400 mt-0.5">{s.descricao}</p>}
                      </div>
                      <StatusBadge ativo={s.ativo} />
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      {s.capacidade
                        ? <div className="flex items-center gap-1.5 text-xs text-slate-500">{Icon.users}<span>{s.capacidade} lugares</span></div>
                        : <span />}
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                        <button onClick={() => remove(s.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === "new" ? "Nova Sala" : "Editar Sala"} sub="Espaço físico" onClose={() => setModal(null)}>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome" required>
                <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Sala 10" className={inp} />
              </Field>
              <Field label="Tipo">
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inp}>
                  {TIPOS_SALA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Capacidade (lugares)">
                <input type="number" min="1" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} placeholder="Ex: 40" className={inp} />
              </Field>
              <Field label="Localização / Bloco">
                <input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} placeholder="Ex: Bloco A, 1º Piso" className={inp} />
              </Field>
            </div>
            <Field label="Descrição / Equipamento">
              <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Equipada com projector e quadro interactivo" className={`${inp} resize-none`} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle checked={form.ativo} onChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <span className="text-sm text-slate-600">Sala disponível</span>
            </label>
            <FormActions onCancel={() => setModal(null)} saving={saving} color="emerald" />
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   SECÇÃO — TURMAS
═════════════════════════════════════════════════════════���════ */
function SeccaoTurmas({ cursos }) {
  const [turmas, setTurmas]     = useState([]);
  const [classes, setClasses]   = useState([]);
  const [turnos, setTurnos]     = useState([]);
  const [salas, setSalas]       = useState([]);
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ nome: "", classe_id: "", turno_id: "", sala_id: "", ano_letivo: String(new Date().getFullYear()), capacidade: "40", diretor_turma_id: "", descricao: "", ativo: true });
  const [cursoFiltro, setCursoFiltro] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const loadTurmas = useCallback(() => {
    setLoading(true);
    const params = filtroAno ? `?ano_letivo=${filtroAno}` : "";
    api.get(`/turmas${params}`).then(r => setTurmas(r.data.data || r.data)).catch(() => setTurmas([])).finally(() => setLoading(false));
  }, [filtroAno]);

  useEffect(() => {
    loadTurmas();
    api.get("/classes").then(r => setClasses(r.data.data || r.data)).catch(() => {});
    api.get("/turnos").then(r => setTurnos(r.data.data || r.data)).catch(() => {});
    api.get("/salas").then(r => setSalas(r.data.data || r.data)).catch(() => {});
    api.get("/professores").then(r => setProfessores(r.data.data || r.data)).catch(() => {});
  }, [loadTurmas]);

  const openNew  = () => { setForm({ nome: "", classe_id: "", turno_id: "", sala_id: "", ano_letivo: filtroAno || String(new Date().getFullYear()), capacidade: "40", diretor_turma_id: "", descricao: "", ativo: true }); setCursoFiltro(""); setError(""); setModal("new"); };
  const openEdit = (it) => {
    const classeDoItem = classes.find(c => String(c.id) === String(it.classe_id));
    setCursoFiltro(classeDoItem?.curso_id ? String(classeDoItem.curso_id) : "");
    setForm({ ...it, ativo: !!it.ativo });
    setError(""); setModal(it);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      modal === "new" ? await api.post("/turmas", form) : await api.put(`/turmas/${modal.id}`, form);
      setModal(null); loadTurmas();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar esta turma?")) return;
    await api.delete(`/turmas/${id}`).catch(() => {});
    loadTurmas();
  };

  const filtradas = turmas.filter(t =>
    t.nome?.toLowerCase().includes(search.toLowerCase()) ||
    t.nivel?.toLowerCase().includes(search.toLowerCase())
  );

  const getClasse  = (id) => classes.find(c => String(c.id) === String(id));
  const getTurno   = (id) => turnos.find(t => String(t.id) === String(id));
  const getSala    = (id) => salas.find(s => String(s.id) === String(id));
  const getProf    = (id) => professores.find(p => String(p.id) === String(id));

  const turnoColors = { manha: "bg-amber-50 text-amber-700", tarde: "bg-orange-50 text-orange-700", noite: "bg-indigo-50 text-indigo-700", integral: "bg-blue-50 text-blue-700" };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar turma..."
            className="pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl w-52 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500">Ano Lectivo</label>
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todos</option>
            {ANOS_LETIVOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <span className="text-sm text-slate-400">{filtradas.length} turma(s)</span>
        <button onClick={openNew} className="ml-auto flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Nova Turma
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : filtradas.length === 0 ? (
        <EmptyState msg="Nenhuma turma encontrada." onAdd={openNew} label="Criar primeira turma" />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Turma</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Classe</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Turno</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Sala</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Director de Turma</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Alunos</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtradas.map(t => {
                const turno  = getTurno(t.turno_id);
                const tc     = turnoColors[turno?.codigo] || "bg-slate-100 text-slate-500";
                const sala   = getSala(t.sala_id);
                const prof   = getProf(t.diretor_turma_id);
                const classe = getClasse(t.classe_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{t.nome}</p>
                      <p className="text-xs text-slate-400">{t.ano_letivo}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{classe?.nome || t.nivel || "—"}</td>
                    <td className="px-5 py-3.5">
                      {turno
                        ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tc}`}>{turno.nome}</span>
                        : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{sala?.nome || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{prof?.user?.nome || "—"}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm font-semibold text-slate-700">{t.matriculas_count ?? "—"}</span>
                      {t.capacidade && <span className="text-xs text-slate-400"> / {t.capacidade}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge ativo={t.ativo !== false} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                        <button onClick={() => remove(t.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === "new" ? "Nova Turma" : "Editar Turma"} sub="Grupo de alunos" onClose={() => setModal(null)}>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nome da Turma" required>
                <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: 12ª A" className={inp} />
              </Field>
              <Field label="Ano Lectivo" required>
                <select required value={form.ano_letivo} onChange={e => setForm(f => ({ ...f, ano_letivo: e.target.value }))} className={inp}>
                  {ANOS_LETIVOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Curso">
              <select value={cursoFiltro} onChange={e => { setCursoFiltro(e.target.value); setForm(f => ({ ...f, classe_id: "" })); }} className={inp}>
                <option value="">Todos os cursos</option>
                {cursos.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Classe">
                <select value={form.classe_id || ""} onChange={e => setForm(f => ({ ...f, classe_id: e.target.value }))} className={inp}>
                  <option value="">Seleccionar...</option>
                  {classes
                    .filter(c => !cursoFiltro || String(c.curso_id) === cursoFiltro)
                    .map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>
              <Field label="Turno">
                <select value={form.turno_id || ""} onChange={e => setForm(f => ({ ...f, turno_id: e.target.value }))} className={inp}>
                  <option value="">Seleccionar...</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sala">
                <select value={form.sala_id || ""} onChange={e => setForm(f => ({ ...f, sala_id: e.target.value }))} className={inp}>
                  <option value="">Seleccionar...</option>
                  {salas.filter(s => s.ativo !== false).map(s => <option key={s.id} value={s.id}>{s.nome} {s.capacidade ? `(${s.capacidade})` : ""}</option>)}
                </select>
              </Field>
              <Field label="Capacidade">
                <input type="number" min="1" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))} placeholder="40" className={inp} />
              </Field>
            </div>
            <Field label="Director de Turma">
              <select value={form.diretor_turma_id || ""} onChange={e => setForm(f => ({ ...f, diretor_turma_id: e.target.value }))} className={inp}>
                <option value="">Nenhum</option>
                {professores.map(p => <option key={p.id} value={p.id}>{p.user?.nome}</option>)}
              </select>
            </Field>
            <Field label="Observações">
              <input value={form.descricao || ""} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Notas adicionais..." className={inp} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle checked={form.ativo} onChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <span className="text-sm text-slate-600">Turma activa</span>
            </label>
            <FormActions onCancel={() => setModal(null)} saving={saving} color="violet" />
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   TABS + PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════ */
const TABS = [
  {
    id: "turmas", label: "Turmas", color: "violet",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    id: "classes", label: "Classes", color: "blue",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
  {
    id: "turnos", label: "Turnos", color: "amber",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    id: "salas", label: "Salas", color: "emerald",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
];

const clrTab = {
  blue:   "bg-blue-50   text-blue-700   border-blue-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  amber:  "bg-amber-50  text-amber-700  border-amber-200",
  emerald:"bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function GestaoEscolar() {
  const [tab, setTab]       = useState("turmas");
  const [cursos, setCursos] = useState([]);

  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Gestão Escolar</h1>
        <p className="text-sm text-slate-500 mt-1">Configure turmas, classes, turnos e salas da escola</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${tab === t.id ? clrTab[t.color] : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "turmas"  && <SeccaoTurmas  cursos={cursos} />}
      {tab === "classes" && <SeccaoClasses cursos={cursos} />}
      {tab === "turnos"  && <SeccaoTurnos  />}
      {tab === "salas"   && <SeccaoSalas   />}
    </div>
  );
}
