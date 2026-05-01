import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Settings2, X } from "lucide-react";
import api from "../../services/api";

const NIVEIS_ENSINO = [
  { value: "primario",        label: "Ensino Primário" },
  { value: "secundario_i",    label: "Secundário I Ciclo" },
  { value: "secundario_ii",   label: "Secundário II Ciclo" },
  { value: "medio_tecnico",   label: "Médio Técnico" },
];

const COMP_REPROVADO = [
  { value: "repete",         label: "Repete (cria matrícula pendente na mesma classe)" },
  { value: "rejeita",        label: "Rejeita (não cria nova matrícula)" },
  { value: "pendente_admin", label: "Admin decide (cria pendente, marca para revisão)" },
];

const initialForm = () => ({
  nome: "",
  descricao: "",
  ativa: true,
  prioridade: 0,
  nivel_ensino: "",
  curso_id: "",
  classe_id: "",
  ano_letivo: "",
  metodo_disciplina: "media_aritmetica",
  pesos_periodos: { 1:1, 2:1, 3:1 },
  incluir_exame: false,
  metodo_geral: "media_aritmetica",
  media_geral_minima: 10,
  media_disciplina_minima: 8,
  max_disciplinas_reprovadas: "",
  comportamento_reprovado: "repete",
});

function buildConfig(f) {
  const cfg = {
    calculo_media_disciplina: {
      metodo: f.metodo_disciplina,
      pesos_periodos: f.pesos_periodos,
      incluir_exame: !!f.incluir_exame,
    },
    calculo_media_geral: { metodo: f.metodo_geral },
    criterios_aprovacao: {},
    comportamento_reprovado: f.comportamento_reprovado,
  };
  if (f.media_geral_minima !== "" && f.media_geral_minima !== null) cfg.criterios_aprovacao.media_geral_minima = parseFloat(f.media_geral_minima);
  if (f.media_disciplina_minima !== "" && f.media_disciplina_minima !== null) cfg.criterios_aprovacao.media_disciplina_minima = parseFloat(f.media_disciplina_minima);
  if (f.max_disciplinas_reprovadas !== "" && f.max_disciplinas_reprovadas !== null) cfg.criterios_aprovacao.max_disciplinas_reprovadas = parseInt(f.max_disciplinas_reprovadas, 10);
  return cfg;
}

function parseConfig(regra) {
  const c = regra.config || {};
  const md = c.calculo_media_disciplina || {};
  const mg = c.calculo_media_geral || {};
  const cr = c.criterios_aprovacao || {};
  return {
    nome: regra.nome || "",
    descricao: regra.descricao || "",
    ativa: !!regra.ativa,
    prioridade: regra.prioridade ?? 0,
    nivel_ensino: regra.nivel_ensino || "",
    curso_id: regra.curso_id || "",
    classe_id: regra.classe_id || "",
    ano_letivo: regra.ano_letivo || "",
    metodo_disciplina: md.metodo || "media_aritmetica",
    pesos_periodos: md.pesos_periodos || { 1:1, 2:1, 3:1 },
    incluir_exame: !!md.incluir_exame,
    metodo_geral: mg.metodo || "media_aritmetica",
    media_geral_minima: cr.media_geral_minima ?? 10,
    media_disciplina_minima: cr.media_disciplina_minima ?? 8,
    max_disciplinas_reprovadas: cr.max_disciplinas_reprovadas ?? "",
    comportamento_reprovado: c.comportamento_reprovado || "repete",
  };
}

export default function RegrasAproveitamento() {
  const [regras, setRegras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // {form, id?}
  const [cursos,  setCursos]  = useState([]);
  const [classes, setClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(() => setToast(null), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/regras-aproveitamento?per_page=100");
      setRegras(r.data.data || r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (!editing?.form?.curso_id) { setClasses([]); return; }
    api.get(`/classes?curso_id=${editing.form.curso_id}`).then(r => setClasses(r.data)).catch(() => setClasses([]));
  }, [editing?.form?.curso_id]);

  const openCreate = () => setEditing({ form: initialForm(), id: null });
  const openEdit   = (regra) => setEditing({ form: parseConfig(regra), id: regra.id });
  const close      = () => { setEditing(null); setError(""); };

  const updField = (k, v) => setEditing(e => ({ ...e, form: { ...e.form, [k]: v } }));

  const save = async () => {
    setSaving(true); setError("");
    try {
      const f = editing.form;
      if (!f.nome.trim()) { setError("Nome é obrigatório."); setSaving(false); return; }
      const payload = {
        nome: f.nome,
        descricao: f.descricao || null,
        ativa: !!f.ativa,
        prioridade: parseInt(f.prioridade || 0, 10),
        nivel_ensino: f.nivel_ensino || null,
        curso_id: f.curso_id || null,
        classe_id: f.classe_id || null,
        ano_letivo: f.ano_letivo || null,
        config: buildConfig(f),
      };
      if (editing.id) await api.put(`/regras-aproveitamento/${editing.id}`, payload);
      else await api.post("/regras-aproveitamento", payload);
      showToast(editing.id ? "Regra actualizada." : "Regra criada.");
      close();
      load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      const firstErr = errs ? Object.values(errs)[0]?.[0] : null;
      setError(firstErr || err.response?.data?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  };

  const remove = async (regra) => {
    if (!confirm(`Eliminar regra "${regra.nome}"?`)) return;
    try {
      await api.delete(`/regras-aproveitamento/${regra.id}`);
      showToast("Regra removida.");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Erro ao remover.", "error");
    }
  };

  const escopoBadge = (r) => {
    const partes = [];
    if (r.classe?.nome) partes.push(`Classe: ${r.classe.nome}`);
    else if (r.curso?.nome) partes.push(`Curso: ${r.curso.nome}`);
    else if (r.nivel_ensino) partes.push(`Ensino: ${NIVEIS_ENSINO.find(n => n.value === r.nivel_ensino)?.label || r.nivel_ensino}`);
    else partes.push("Geral (toda a escola)");
    if (r.ano_letivo) partes.push(`Ano ${r.ano_letivo}`);
    return partes.join(" · ");
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Regras de Aproveitamento</h1>
          <p className="text-sm text-slate-400 mt-0.5">Define como o sistema decide se um aluno passou ou reprovou no ano lectivo</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16}/> Nova Regra
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">A carregar...</div>
        ) : regras.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <Settings2 size={28} strokeWidth={1.4} className="text-slate-300"/>
            Nenhuma regra configurada. A renovação de matrículas só funciona após criar pelo menos uma regra.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Escopo</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prioridade</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {regras.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.nome}</p>
                    {r.descricao && <p className="text-xs text-slate-400 mt-0.5">{r.descricao}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{escopoBadge(r)}</td>
                  <td className="px-4 py-3 text-center text-slate-600 font-mono">{r.prioridade}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${r.ativa ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                      {r.ativa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(r)} className="text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14}/></button>
                      <button onClick={() => remove(r)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editing.id ? "Editar regra" : "Nova regra"}</h2>
              <button onClick={close} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
            </div>

            {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm">{error}</div>}

            <div className="p-6 space-y-5">
              {/* Identificação */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Identificação</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                    <input value={editing.form.nome} onChange={e => updField("nome", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                    <textarea value={editing.form.descricao} onChange={e => updField("descricao", e.target.value)} rows={2}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                    <input type="number" value={editing.form.prioridade} onChange={e => updField("prioridade", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input id="ativa" type="checkbox" checked={!!editing.form.ativa} onChange={e => updField("ativa", e.target.checked)}/>
                    <label htmlFor="ativa" className="text-sm text-slate-700">Activa</label>
                  </div>
                </div>
              </section>

              {/* Escopo */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Escopo (regra mais específica vence)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nível de Ensino</label>
                    <select value={editing.form.nivel_ensino} onChange={e => updField("nivel_ensino", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                      <option value="">— Qualquer —</option>
                      {NIVEIS_ENSINO.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ano Lectivo</label>
                    <input value={editing.form.ano_letivo} onChange={e => updField("ano_letivo", e.target.value)} placeholder="ex: 2024-2025 (vazio = qualquer)"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
                    <select value={editing.form.curso_id} onChange={e => updField("curso_id", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                      <option value="">— Qualquer —</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
                    <select value={editing.form.classe_id} onChange={e => updField("classe_id", e.target.value)} disabled={!editing.form.curso_id}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 disabled:opacity-50">
                      <option value="">— Qualquer —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Cálculo da média */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cálculo da Média</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Por disciplina</label>
                    <select value={editing.form.metodo_disciplina} onChange={e => updField("metodo_disciplina", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                      <option value="media_aritmetica">Aritmética dos períodos</option>
                      <option value="media_ponderada">Ponderada pelos períodos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Geral (do aluno)</label>
                    <select value={editing.form.metodo_geral} onChange={e => updField("metodo_geral", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                      <option value="media_aritmetica">Aritmética das disciplinas</option>
                      <option value="media_ponderada_por_disciplina">Ponderada por disciplina</option>
                    </select>
                  </div>
                  {editing.form.metodo_disciplina === "media_ponderada" && (
                    <div className="col-span-2 grid grid-cols-3 gap-3">
                      {[1,2,3].map(p => (
                        <div key={p}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Peso Período {p}</label>
                          <input type="number" step="0.1" value={editing.form.pesos_periodos[p] ?? 1}
                            onChange={e => updField("pesos_periodos", {...editing.form.pesos_periodos, [p]: parseFloat(e.target.value || 0)})}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="col-span-2 flex items-center gap-2">
                    <input id="incl-exame" type="checkbox" checked={editing.form.incluir_exame} onChange={e => updField("incluir_exame", e.target.checked)}/>
                    <label htmlFor="incl-exame" className="text-sm text-slate-700">Incluir nota de exame na média da disciplina (média periodos + exame) / 2</label>
                  </div>
                </div>
              </section>

              {/* Critérios */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Critérios de Aprovação</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Média geral mínima</label>
                    <input type="number" step="0.1" value={editing.form.media_geral_minima} onChange={e => updField("media_geral_minima", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Média mín. por disciplina</label>
                    <input type="number" step="0.1" value={editing.form.media_disciplina_minima} onChange={e => updField("media_disciplina_minima", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Máx. disciplinas reprovadas</label>
                    <input type="number" value={editing.form.max_disciplinas_reprovadas} onChange={e => updField("max_disciplinas_reprovadas", e.target.value)} placeholder="vazio = sem limite"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                </div>
              </section>

              {/* Comportamento reprovado */}
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quando reprovar</h3>
                <select value={editing.form.comportamento_reprovado} onChange={e => updField("comportamento_reprovado", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                  {COMP_REPROVADO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={close} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-medium">
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
