import { useState, useEffect } from "react";
import api from "../../services/api";

const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition";

const Icon = {
  plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  edit: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  trash: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>),
  close: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  book: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>),
  chevron: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>),
  back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>),
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
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

const NIVEIS = ["1ª Classe","2ª Classe","3ª Classe","4ª Classe","5ª Classe","6ª Classe","7ª Classe","8ª Classe","9ª Classe","10ª Classe","11ª Classe","12ª Classe","Técnico Médio","Bacharelato","Licenciatura"];
const AREAS  = ["Ciências","Humanidades","Economia","Tecnologia","Artes","Saúde","Jurídico","Educação","Outra"];

/* ══════════════════════════════════════════════════════════════
   VISTA: LISTA DE CURSOS
══════════════════════════════════════════════════════════════ */
function ListaCursos({ onSelect }) {
  const [cursos, setCursos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({ nome: "", codigo: "", area: "Ciências", duracao_anos: "1", descricao: "", ativo: true });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const load = () => {
    setLoading(true);
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => setCursos([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew  = () => { setForm({ nome: "", codigo: "", area: "Ciências", duracao_anos: "1", descricao: "", ativo: true }); setError(""); setModal("new"); };
  const openEdit = (c) => { setForm({ ...c, ativo: !!c.ativo }); setError(""); setModal(c); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (modal === "new") await api.post("/cursos", form);
      else                  await api.put(`/cursos/${modal.id}`, form);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminar este curso?")) return;
    await api.delete(`/cursos/${id}`).catch(() => {});
    load();
  };

  const filtrados = cursos.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cursos</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gerencie os cursos e os seus planos curriculares</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          {Icon.plus} Novo Curso
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar curso..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        </div>
        <span className="text-sm text-slate-400">{filtrados.length} curso(s)</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">A carregar...</div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-5xl mb-3 opacity-30">📚</span>
          <p className="text-sm">Nenhum curso encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  {Icon.book}
                </div>
                <div className="flex items-center gap-1.5">
                  {c.ativo
                    ? <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Activo</span>
                    : <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Inactivo</span>}
                </div>
              </div>
              <h3 className="font-semibold text-slate-800 mb-0.5">{c.nome}</h3>
              <p className="text-xs text-slate-400 mb-3">{c.codigo && <span className="font-mono mr-2">{c.codigo}</span>}{c.area}</p>
              {c.descricao && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{c.descricao}</p>}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>⏱ {c.duracao_anos} ano(s)</span>
                  {c.disciplinas_count !== undefined && <span>📖 {c.disciplinas_count} disc.</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(c)} className="w-7 h-7 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                  <button onClick={() => remove(c.id)}  className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
                  <button onClick={() => onSelect(c)} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 ml-1 transition-colors">
                    Plano Curricular {Icon.chevron}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === "new" ? "Novo Curso" : "Editar Curso"} sub="Informações gerais do curso" onClose={() => setModal(null)}>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Nome do Curso *">
                  <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Informática" className={inp} />
                </Field>
              </div>
              <Field label="Código">
                <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: INF" className={inp} />
              </Field>
              <Field label="Área *">
                <select required value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} className={inp}>
                  {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </Field>
              <Field label="Duração (anos) *">
                <input type="number" required min="1" max="10" value={form.duracao_anos} onChange={e => setForm({ ...form, duracao_anos: e.target.value })} className={inp} />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea rows={3} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição do curso..." className={`${inp} resize-none`} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.ativo ? "bg-blue-600" : "bg-slate-200"}`} />
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ativo ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-slate-600">Curso activo</span>
            </label>
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
   VISTA: PLANO CURRICULAR DE UM CURSO
══════════════════════════════════════════════════════════════ */
function PlanoCurricular({ curso, onBack }) {
  const [disciplinas, setDisciplinas] = useState([]);
  const [classes, setClasses]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({ nome: "", codigo: "", carga_horaria: "", classe_id: "", semestre: "", obrigatoria: true, descricao: "" });
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [catalogo, setCatalogo]       = useState([]);

  const load = () => {
    setLoading(true);
    api.get(`/cursos/${curso.id}/disciplinas`).then(r => setDisciplinas(r.data.data || r.data)).catch(() => setDisciplinas([])).finally(() => setLoading(false));
  };
  useEffect(load, [curso.id]);
  useEffect(() => {
    api.get("/disciplinas").then(r => setCatalogo(r.data?.data ?? r.data ?? [])).catch(() => {});
    // Carrega as classes deste curso (para o dropdown)
    api.get(`/classes?curso_id=${curso.id}`).then(r => setClasses(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, [curso.id]);

  const openNew  = () => { setForm({ nome: "", codigo: "", carga_horaria: "", classe_id: classes[0]?.id ?? "", semestre: "", obrigatoria: true, descricao: "" }); setError(""); setModal("new"); };
  const openEdit = (d) => { setForm({ ...d, classe_id: d.classe_id ?? "", obrigatoria: !!d.obrigatoria }); setError(""); setModal(d); };

  const handleSelectCatalogo = (id) => {
    const disc = catalogo.find(d => String(d.id) === String(id));
    if (!disc) return;
    setForm(f => ({ ...f, nome: disc.nome, codigo: disc.codigo ?? "", carga_horaria: disc.carga_horaria ?? "" }));
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, curso_id: curso.id };
      if (modal === "new") await api.post(`/cursos/${curso.id}/disciplinas`, payload);
      else                  await api.put(`/cursos/${curso.id}/disciplinas/${modal.id}`, payload);
      setModal(null); load();
    } catch (err) { setError(err.response?.data?.message || "Erro ao guardar."); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm("Remover esta disciplina do plano?")) return;
    await api.delete(`/cursos/${curso.id}/disciplinas/${id}`).catch(() => {});
    load();
  };

  // agrupar por classe (com fallback para ano em registos antigos sem classe_id)
  const porClasse = disciplinas.reduce((acc, d) => {
    const key = d.classe_id ? `c${d.classe_id}` : `a${d.ano || 1}`;
    if (!acc[key]) {
      acc[key] = {
        nome: d.classe?.nome ?? `${d.ano || 1}º Ano`,
        ordem: d.classe?.ordem ?? d.ano ?? 99,
        disciplinas: [],
      };
    }
    acc[key].disciplinas.push(d);
    return acc;
  }, {});
  const grupos = Object.entries(porClasse).sort(([,a],[,b]) => (a.ordem ?? 99) - (b.ordem ?? 99));

  const totalHoras = disciplinas.reduce((s, d) => s + Number(d.carga_horaria || 0), 0);

  return (
    <>
      {/* Cabeçalho */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          {Icon.back} Cursos
        </button>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">{Icon.book}</div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{curso.nome}</h1>
            <p className="text-xs text-slate-400">{curso.codigo && `${curso.codigo} · `}{curso.area} · {curso.duracao_anos} ano(s)</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-400">Total de horas</p>
            <p className="text-sm font-bold text-slate-800">{totalHoras}h</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            {Icon.plus} Adicionar Disciplina
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">A carregar...</div>
      ) : disciplinas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-16 text-center">
          <div className="text-4xl mb-3 opacity-30">📖</div>
          <p className="text-slate-400 text-sm">Nenhuma disciplina no plano curricular.</p>
          <button onClick={openNew} className="mt-4 text-sm text-blue-600 hover:underline">+ Adicionar primeira disciplina</button>
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map(([key, grupo]) => (
            <div key={key}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-semibold text-slate-600">{grupo.nome}</span>
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400">{grupo.disciplinas.length} disciplina(s)</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Disciplina</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Código</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Semestre</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Carga Horária</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {grupo.disciplinas.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-800">{d.nome}</p>
                          {d.descricao && <p className="text-xs text-slate-400 truncate max-w-xs">{d.descricao}</p>}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{d.codigo || "—"}</td>
                        <td className="px-5 py-3.5 text-center text-slate-500">{d.semestre ? `${d.semestre}º` : "Anual"}</td>
                        <td className="px-5 py-3.5 text-center font-semibold text-slate-800">{d.carga_horaria ? `${d.carga_horaria}h` : "—"}</td>
                        <td className="px-5 py-3.5 text-center">
                          {d.obrigatoria
                            ? <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">Obrigatória</span>
                            : <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-1 rounded-full">Opcional</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(d)} className="w-7 h-7 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors">{Icon.edit}</button>
                            <button onClick={() => remove(d.id)}  className="w-7 h-7 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors">{Icon.trash}</button>
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
        <Modal title={modal === "new" ? "Adicionar Disciplina" : "Editar Disciplina"} sub={`Plano de ${curso.nome}`} onClose={() => setModal(null)}>
          {error && <div className="mb-4 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-2 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            {modal === "new" && (
              <Field label="Disciplina *">
                <select required className={inp} defaultValue=""
                  onChange={e => handleSelectCatalogo(e.target.value)}>
                  <option value="" disabled>Seleccionar disciplina...</option>
                  {catalogo.map(d => <option key={d.id} value={d.id}>{d.nome}{d.codigo ? ` (${d.codigo})` : ""}</option>)}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Nome da Disciplina *">
                  <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Matemática" className={inp} />
                </Field>
              </div>
              <Field label="Código">
                <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Ex: MAT101" className={inp} />
              </Field>
              <Field label="Carga Horária (h)">
                <input type="number" min="0" value={form.carga_horaria} onChange={e => setForm({ ...form, carga_horaria: e.target.value })} placeholder="0" className={inp} />
              </Field>
              <Field label="Classe *">
                <select required value={form.classe_id} onChange={e => setForm({ ...form, classe_id: e.target.value })} className={inp}>
                  <option value="">Seleccionar classe...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Este curso não tem classes configuradas. Crie em Configurações → Classes & Salas.</p>
                )}
              </Field>
              <Field label="Semestre">
                <select value={form.semestre} onChange={e => setForm({ ...form, semestre: e.target.value })} className={inp}>
                  <option value="">Anual</option>
                  <option value="1">1º Semestre</option>
                  <option value="2">2º Semestre</option>
                </select>
              </Field>
            </div>
            <Field label="Descrição">
              <textarea rows={2} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Breve descrição da disciplina..." className={`${inp} resize-none`} />
            </Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={form.obrigatoria} onChange={e => setForm({ ...form, obrigatoria: e.target.checked })} />
                <div className={`w-10 h-5 rounded-full transition-colors ${form.obrigatoria ? "bg-blue-600" : "bg-slate-200"}`} />
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.obrigatoria ? "translate-x-5" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-slate-600">Disciplina obrigatória</span>
            </label>
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
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function Cursos() {
  const [cursoPlan, setCursoPlan] = useState(null);
  return cursoPlan
    ? <PlanoCurricular curso={cursoPlan} onBack={() => setCursoPlan(null)} />
    : <ListaCursos onSelect={setCursoPlan} />;
}
