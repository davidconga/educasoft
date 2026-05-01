import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

/* ── utilitários ───────────────────────────────────────────── */
const fmt = (v) => Number(v || 0).toLocaleString("pt-AO");
const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

const Icon = {
  plus:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  filter:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

const CATEGORIAS_EMOL = ["Secretaria","Exames","Certidões","Matrícula","Inscrição","Uniforme","Outros"];
const ANOS_LETIVOS = Array.from({ length: 6 }, (_, i) => {
  const y = new Date().getFullYear() - 2 + i;
  return `${y}-${y + 1}`;
});

/* ── componentes partilhados ───────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, color = "blue" }) {
  const bg = checked ? (color === "rose" ? "bg-rose-500" : color === "violet" ? "bg-violet-600" : "bg-blue-600") : "bg-slate-200";
  return (
    <div className="relative cursor-pointer w-10 h-5 shrink-0" onClick={() => onChange(!checked)}>
      <div className={`w-full h-full rounded-full transition-colors ${bg}`} />
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </div>
  );
}

function Modal({ title, sub, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-lg" : "max-w-md"} max-h-[90vh] overflow-y-auto`}>
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

function EmptyState({ msg }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-12 h-12 mb-3 opacity-20">
        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/>
      </svg>
      <p className="text-sm">{msg}</p>
    </div>
  );
}

/* ── barra de contexto (âmbito) ────────────────────────────── */
function BarraAmbito({ ambito, setAmbito, cursos, classes }) {
  const classesFiltradas = ambito.curso_id
    ? classes.filter(c => String(c.curso_id) === String(ambito.curso_id))
    : classes;
  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-6">
      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium shrink-0">
        {Icon.filter}
        <span>Filtrar por</span>
      </div>
      <div className="w-px h-5 bg-slate-200 shrink-0" />

      {/* Ano Lectivo */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 shrink-0">Ano Lectivo</label>
        <select
          value={ambito.ano_letivo}
          onChange={e => setAmbito(a => ({ ...a, ano_letivo: e.target.value }))}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
        >
          <option value="">Todos</option>
          {ANOS_LETIVOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Curso */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 shrink-0">Curso</label>
        <select
          value={ambito.curso_id}
          onChange={e => setAmbito(a => ({ ...a, curso_id: e.target.value, nivel: "" }))}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
        >
          <option value="">Todos</option>
          {cursos.map(c => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
        </select>
      </div>

      {/* Classe (filtrada pelo curso) */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 shrink-0">Classe</label>
        <select
          value={ambito.nivel}
          onChange={e => setAmbito(a => ({ ...a, nivel: e.target.value }))}
          disabled={!ambito.curso_id}
          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 disabled:opacity-50"
        >
          <option value="">{ambito.curso_id ? "Todas" : "← Curso primeiro"}</option>
          {classesFiltradas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </select>
      </div>

      {(ambito.ano_letivo || ambito.curso_id || ambito.nivel) && (
        <button
          onClick={() => setAmbito({ ano_letivo: "", curso_id: "", nivel: "" })}
          className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

/* badge de âmbito */
function BadgeAmbito({ item, cursos }) {
  const parts = [];
  if (item.ano_letivo) parts.push(item.ano_letivo);
  if (item.curso_id) {
    const c = cursos.find(c => String(c.id) === String(item.curso_id));
    if (c) parts.push(c.nome);
  }
  if (item.nivel) parts.push(item.nivel);
  if (!parts.length) return <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Global</span>;
  return (
    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{parts.join(" · ")}</span>
  );
}

/* agrupa items por nivel, respeitando a ordem das classes */
function gruposPorClasse(items, classes) {
  const ordem = classes.map(c => c.nome);
  const mapa  = {};
  for (const it of items) {
    const chave = it.nivel || "";
    if (!mapa[chave]) mapa[chave] = [];
    mapa[chave].push(it);
  }
  const grupos = [];
  for (const nome of ordem) {
    if (mapa[nome]) grupos.push({ nome, items: mapa[nome] });
  }
  if (mapa[""]) grupos.push({ nome: "", items: mapa[""] });
  return grupos;
}

function GrupoHeader({ nome }) {
  return (
    <div className="flex items-center gap-3 mt-2 mb-3">
      <span className="text-sm font-semibold text-slate-700">{nome || "Global"}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

/* campo de âmbito dentro do formulário */
function CamposAmbito({ form, setForm, cursos, classes, required }) {
  const classesFiltradas = form.curso_id
    ? classes.filter(c => String(c.curso_id) === String(form.curso_id))
    : classes;
  return (
    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Âmbito de aplicação</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label={`Ano Lectivo${required ? " *" : ""}`}>
          <select
            value={form.ano_letivo}
            onChange={e => setForm(f => ({ ...f, ano_letivo: e.target.value }))}
            required={required}
            className={inp}
          >
            <option value="">Todos os anos</option>
            {ANOS_LETIVOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Curso">
          <select value={form.curso_id || ""} onChange={e => setForm(f => ({ ...f, curso_id: e.target.value, nivel: "" }))} className={inp}>
            <option value="">Todos</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Field>
        <Field label="Classe">
          <select value={form.nivel || ""} onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))} disabled={!form.curso_id} className={`${inp} disabled:opacity-50`}>
            <option value="">{form.curso_id ? "Todas" : "← Curso primeiro"}</option>
            {classesFiltradas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
          </select>
        </Field>
      </div>
      <p className="text-xs text-slate-400">Deixe em branco para aplicar globalmente. Pode combinar os três campos.</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PROPINAS
══════════════════════════════════════════════════════════════ */
function SeccaoPropinas({ cursos, classes }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [ambito, setAmbito] = useState({ ano_letivo: "", curso_id: "", nivel: "" });
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ nome: "", ano_letivo: "", curso_id: "", nivel: "", turno: "", valor_mensal: "", descricao: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ambito.ano_letivo) params.set("ano_letivo", ambito.ano_letivo);
    if (ambito.curso_id)   params.set("curso_id",   ambito.curso_id);
    if (ambito.nivel)      params.set("nivel",       ambito.nivel);
    api.get(`/precario/propinas?${params}`).then(r => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, [ambito]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm({ nome: "", ano_letivo: ambito.ano_letivo, curso_id: ambito.curso_id, nivel: ambito.nivel, turno: "", valor_mensal: "", descricao: "" });
    setError(""); setModal("new");
  };
  const openEdit = (it) => { setForm({ ...it }); setError(""); setModal(it); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (modal === "new") await api.post("/precario/propinas", form);
      else                  await api.put(`/precario/propinas/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar esta propina?")) return;
    await api.delete(`/precario/propinas/${id}`).catch(() => {});
    load();
  };

  return (
    <>
      <BarraAmbito ambito={ambito} setAmbito={setAmbito} cursos={cursos} classes={classes} />

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} registo(s)</p>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Nova Propina
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : items.length === 0 ? (
        <EmptyState msg="Nenhuma propina configurada para este âmbito." />
      ) : (
        <div className="space-y-2">
          {gruposPorClasse(items, classes).map(({ nome, items: grupo }) => (
            <div key={nome || "__global__"}>
              <GrupoHeader nome={nome} />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {grupo.map(it => (
                  <div key={it.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{it.nome || it.nivel || "Propina"}</h3>
                        {it.turno && <p className="text-xs text-slate-400 capitalize mt-0.5">{it.turno}</p>}
                      </div>
                      <BadgeAmbito item={it} cursos={cursos} />
                    </div>
                    {it.descricao && <p className="text-xs text-slate-500 mb-3">{it.descricao}</p>}
                    <div className="border-t border-slate-100 pt-3 flex items-center justify-between mt-3">
                      <div>
                        <p className="text-xs text-slate-400">Valor Mensal</p>
                        <p className="text-xl font-bold text-slate-800">{fmt(it.valor_mensal)} <span className="text-xs font-normal text-slate-400">Kz</span></p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(it)} className="w-8 h-8 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                        <button onClick={() => remove(it.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
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
        <Modal title={modal === "new" ? "Nova Propina" : "Editar Propina"} sub="Valor mensal da propina" onClose={() => setModal(null)} wide>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Designação">
              <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Propina do ensino secundário" className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Turno">
                <select value={form.turno} onChange={e => setForm(f => ({ ...f, turno: e.target.value }))} className={inp}>
                  <option value="">Todos os turnos</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
                </select>
              </Field>
              <Field label="Valor Mensal (Kz) *">
                <input type="number" required min="0" value={form.valor_mensal} onChange={e => setForm(f => ({ ...f, valor_mensal: e.target.value }))} placeholder="0" className={inp} />
              </Field>
            </div>
            <CamposAmbito form={form} setForm={setForm} cursos={cursos} classes={classes} required={false} />
            <Field label="Observações">
              <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Inclui material didáctico" className={inp} />
            </Field>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   EMOLUMENTOS
══════════════════════════════════════════════════════════════ */
function SeccaoEmolumentos({ cursos, classes }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [ambito, setAmbito] = useState({ ano_letivo: "", curso_id: "", nivel: "" });
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ nome: "", categoria: "Secretaria", descricao: "", valor: "", obrigatorio: false, ano_letivo: "", curso_id: "", nivel: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ambito.ano_letivo) params.set("ano_letivo", ambito.ano_letivo);
    if (ambito.curso_id)   params.set("curso_id",   ambito.curso_id);
    if (ambito.nivel)      params.set("nivel",       ambito.nivel);
    api.get(`/precario/emolumentos?${params}`).then(r => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, [ambito]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm({ nome: "", categoria: "Secretaria", descricao: "", valor: "", obrigatorio: false, ano_letivo: ambito.ano_letivo, curso_id: ambito.curso_id, nivel: ambito.nivel });
    setError(""); setModal("new");
  };
  const openEdit = (it) => { setForm({ ...it, obrigatorio: !!it.obrigatorio }); setError(""); setModal(it); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (modal === "new") await api.post("/precario/emolumentos", form);
      else                  await api.put(`/precario/emolumentos/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar este emolumento?")) return;
    await api.delete(`/precario/emolumentos/${id}`).catch(() => {});
    load();
  };

  return (
    <>
      <BarraAmbito ambito={ambito} setAmbito={setAmbito} cursos={cursos} classes={classes} />

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} emolumento(s)</p>
        <button onClick={openNew} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Novo Emolumento
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : items.length === 0 ? (
        <EmptyState msg="Nenhum emolumento configurado para este âmbito." />
      ) : (
        <div className="space-y-2">
          {gruposPorClasse(items, classes).map(({ nome, items: grupo }) => (
            <div key={nome || "__global__"}>
              <GrupoHeader nome={nome} />
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Nome</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Categoria</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Âmbito</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Obrigatório</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Valor</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grupo.map(it => (
                      <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800">{it.nome}</p>
                          {it.descricao && <p className="text-xs text-slate-400 truncate max-w-xs">{it.descricao}</p>}
                        </td>
                        <td className="px-5 py-3.5"><span className="bg-violet-50 text-violet-700 text-xs px-2.5 py-1 rounded-full font-medium">{it.categoria}</span></td>
                        <td className="px-5 py-3.5"><BadgeAmbito item={it} cursos={cursos} /></td>
                        <td className="px-5 py-3.5 text-center">
                          {it.obrigatorio
                            ? <span className="bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium">Sim</span>
                            : <span className="bg-slate-100 text-slate-400 text-xs px-2 py-0.5 rounded-full">Não</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{fmt(it.valor)} Kz</td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(it)} className="w-8 h-8 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                            <button onClick={() => remove(it.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === "new" ? "Novo Emolumento" : "Editar Emolumento"} sub="Taxa ou serviço avulso" onClose={() => setModal(null)} wide>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nome *">
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Declaração de notas" className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria *">
                <select required value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inp}>
                  {CATEGORIAS_EMOL.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Valor (Kz) *">
                <input type="number" required min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0" className={inp} />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Breve descrição do serviço..." className={`${inp} resize-none`} />
            </Field>
            <CamposAmbito form={form} setForm={setForm} cursos={cursos} classes={classes} />
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle checked={form.obrigatorio} onChange={v => setForm(f => ({ ...f, obrigatorio: v }))} color="violet" />
              <span className="text-sm text-slate-600">Cobrança obrigatória na matrícula</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   MULTAS
══════════════════════════════════════════════════════════════ */
function SeccaoMultas({ cursos, classes }) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [ambito, setAmbito] = useState({ ano_letivo: "", curso_id: "", nivel: "" });
  const [modal, setModal]   = useState(null);
  const [form, setForm]     = useState({ nome: "", tipo_calculo: "percentagem", valor: "", dias_carencia: "0", aplicar_em: "mensalidade", descricao: "", ativo: true, ano_letivo: "", curso_id: "", nivel: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ambito.ano_letivo) params.set("ano_letivo", ambito.ano_letivo);
    if (ambito.curso_id)   params.set("curso_id",   ambito.curso_id);
    if (ambito.nivel)      params.set("nivel",       ambito.nivel);
    api.get(`/precario/multas?${params}`).then(r => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, [ambito]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setForm({ nome: "", tipo_calculo: "percentagem", valor: "", dias_carencia: "0", aplicar_em: "mensalidade", descricao: "", ativo: true, ano_letivo: ambito.ano_letivo, curso_id: ambito.curso_id, nivel: ambito.nivel });
    setError(""); setModal("new");
  };
  const openEdit = (it) => { setForm({ ...it, ativo: !!it.ativo }); setError(""); setModal(it); };

  const toggleAtivo = async (it) => {
    await api.put(`/precario/multas/${it.id}`, { ...it, ativo: !it.ativo }).catch(() => {});
    load();
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (modal === "new") await api.post("/precario/multas", form);
      else                  await api.put(`/precario/multas/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar esta regra de multa?")) return;
    await api.delete(`/precario/multas/${id}`).catch(() => {});
    load();
  };

  return (
    <>
      <BarraAmbito ambito={ambito} setAmbito={setAmbito} cursos={cursos} classes={classes} />

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{items.length} regra(s)</p>
        <button onClick={openNew} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Nova Regra
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">A carregar...</div>
      ) : items.length === 0 ? (
        <EmptyState msg="Nenhuma regra de multa configurada para este âmbito." />
      ) : (
        <div className="space-y-2">
          {gruposPorClasse(items, classes).map(({ nome, items: grupo }) => (
            <div key={nome || "__global__"}>
              <GrupoHeader nome={nome} />
              <div className="space-y-3">
                {grupo.map(it => (
                  <div key={it.id} className={`bg-white rounded-2xl border border-slate-100 p-5 transition-all ${!it.ativo ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-800">{it.nome}</h3>
                          <BadgeAmbito item={it} cursos={cursos} />
                          <span className="text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full capitalize">{it.aplicar_em}</span>
                          {!it.ativo && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inactiva</span>}
                        </div>
                        {it.descricao && <p className="text-xs text-slate-500 mb-3">{it.descricao}</p>}
                        <div className="flex flex-wrap gap-5">
                          <div>
                            <p className="text-xs text-slate-400">Cálculo</p>
                            <p className="text-sm font-medium text-slate-700">{it.tipo_calculo === "percentagem" ? "Percentagem" : "Valor fixo"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Valor</p>
                            <p className="text-sm font-bold text-rose-600">{it.tipo_calculo === "percentagem" ? `${it.valor}%` : `${fmt(it.valor)} Kz`}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Carência</p>
                            <p className="text-sm font-medium text-slate-700">{it.dias_carencia} dia(s)</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => toggleAtivo(it)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${it.ativo ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                          {it.ativo ? "Activa" : "Inactiva"}
                        </button>
                        <button onClick={() => openEdit(it)} className="w-8 h-8 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                        <button onClick={() => remove(it.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
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
        <Modal title={modal === "new" ? "Nova Regra de Multa" : "Editar Regra"} sub="Penalização por pagamento tardio" onClose={() => setModal(null)} wide>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <Field label="Nome da Regra *">
              <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Multa de mensalidade em atraso" className={inp} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Aplica-se a *">
                <select required value={form.aplicar_em} onChange={e => setForm(f => ({ ...f, aplicar_em: e.target.value }))} className={inp}>
                  <option value="mensalidade">Mensalidade</option>
                  <option value="matricula">Matrícula</option>
                  <option value="emolumento">Emolumento</option>
                  <option value="todos">Todos</option>
                </select>
              </Field>
              <Field label="Dias de Carência">
                <input type="number" min="0" value={form.dias_carencia} onChange={e => setForm(f => ({ ...f, dias_carencia: e.target.value }))} placeholder="0" className={inp} />
              </Field>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de Cálculo *</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ v: "percentagem", l: "Percentagem (%)" }, { v: "fixo", l: "Valor Fixo (Kz)" }].map(o => (
                  <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, tipo_calculo: o.v }))}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${form.tipo_calculo === o.v ? "bg-rose-600 text-white border-rose-600" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <Field label={`Valor ${form.tipo_calculo === "percentagem" ? "(%)" : "(Kz)"} *`}>
              <div className="relative">
                <input type="number" required min="0" step={form.tipo_calculo === "percentagem" ? "0.1" : "1"}
                  value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0" className={`${inp} pr-10`} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                  {form.tipo_calculo === "percentagem" ? "%" : "Kz"}
                </span>
              </div>
            </Field>
            <Field label="Descrição">
              <textarea rows={2} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Aplicada ao fim de cada mês em atraso" className={`${inp} resize-none`} />
            </Field>
            <CamposAmbito form={form} setForm={setForm} cursos={cursos} classes={classes} />
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Toggle checked={form.ativo} onChange={v => setForm(f => ({ ...f, ativo: v }))} color="rose" />
              <span className="text-sm text-slate-600">Regra activa</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════════ */
const TABS = [
  {
    id: "propinas", label: "Propinas", desc: "Mensalidades por âmbito",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
    color: "blue",
  },
  {
    id: "emolumentos", label: "Emolumentos", desc: "Taxas e serviços avulsos",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    color: "violet",
  },
  {
    id: "multas", label: "Multas de Atraso", desc: "Penalizações por atraso",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    color: "rose",
  },
];

const clrTab = {
  blue:   "bg-blue-50 text-blue-700 border-blue-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  rose:   "bg-rose-50 text-rose-700 border-rose-200",
};

/* ══════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function Precario() {
  const [tab, setTab]         = useState("propinas");
  const [cursos, setCursos]   = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {});
    api.get("/classes").then(r => setClasses(r.data)).catch(() => {});
  }, []);

  const active = TABS.find(t => t.id === tab);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Preçário</h1>
        <p className="text-sm text-slate-500 mt-1">Configure propinas, emolumentos e multas — por ano lectivo, curso ou classe</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${tab === t.id ? clrTab[t.color] : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "propinas"    && <SeccaoPropinas    cursos={cursos} classes={classes} />}
      {tab === "emolumentos" && <SeccaoEmolumentos cursos={cursos} classes={classes} />}
      {tab === "multas"      && <SeccaoMultas      cursos={cursos} classes={classes} />}
    </div>
  );
}
