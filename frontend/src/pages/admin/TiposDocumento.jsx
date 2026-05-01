import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, FileCheck, X } from "lucide-react";
import api from "../../services/api";

const initialForm = () => ({
  nome: "",
  descricao: "",
  obrigatorio: false,
  bloqueia_matricula: false,
  aceita_upload: true,
  ativo: true,
  ordem: 0,
  curso_id: "",
  classe_id: "",
});

export default function TiposDocumento() {
  const [tipos, setTipos]     = useState([]);
  const [cursos, setCursos]   = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // {form, id?}
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [toast, setToast]     = useState(null);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(() => setToast(null), 3500); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/tipos-documento?per_page=200");
      setTipos(r.data.data || r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {}); }, []);

  useEffect(() => {
    if (!editing?.form?.curso_id) { setClasses([]); return; }
    api.get(`/classes?curso_id=${editing.form.curso_id}`).then(r => setClasses(r.data)).catch(() => setClasses([]));
  }, [editing?.form?.curso_id]);

  const openCreate = () => setEditing({ form: initialForm(), id: null });
  const openEdit   = (tipo) => setEditing({
    form: {
      nome: tipo.nome || "",
      descricao: tipo.descricao || "",
      obrigatorio: !!tipo.obrigatorio,
      bloqueia_matricula: !!tipo.bloqueia_matricula,
      aceita_upload: !!tipo.aceita_upload,
      ativo: !!tipo.ativo,
      ordem: tipo.ordem ?? 0,
      curso_id: tipo.curso_id || "",
      classe_id: tipo.classe_id || "",
    },
    id: tipo.id,
  });
  const close = () => { setEditing(null); setError(""); };

  const updField = (k, v) => setEditing(e => ({ ...e, form: { ...e.form, [k]: v } }));

  const save = async () => {
    setSaving(true); setError("");
    try {
      const f = editing.form;
      if (!f.nome.trim()) { setError("Nome é obrigatório."); setSaving(false); return; }
      const payload = {
        ...f,
        ordem: parseInt(f.ordem || 0, 10),
        curso_id: f.curso_id || null,
        classe_id: f.classe_id || null,
      };
      if (editing.id) await api.put(`/tipos-documento/${editing.id}`, payload);
      else await api.post("/tipos-documento", payload);
      showToast(editing.id ? "Tipo actualizado." : "Tipo criado.");
      close();
      load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      const firstErr = errs ? Object.values(errs)[0]?.[0] : null;
      setError(firstErr || err.response?.data?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  };

  const remove = async (tipo) => {
    if (!confirm(`Eliminar tipo "${tipo.nome}"?\n\nAtenção: as entregas dos alunos para este tipo também serão removidas.`)) return;
    try {
      await api.delete(`/tipos-documento/${tipo.id}`);
      showToast("Tipo removido.");
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Erro ao remover.", "error");
    }
  };

  const escopoBadge = (t) => {
    if (t.classe?.nome) return `Classe: ${t.classe.nome}`;
    if (t.curso?.nome)  return `Curso: ${t.curso.nome}`;
    return "Toda a escola";
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tipos de Documento</h1>
          <p className="text-sm text-slate-400 mt-0.5">Documentos que os alunos devem entregar na inscrição (BI, certificados, atestados, etc.)</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">
          <Plus size={16}/> Novo Tipo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">A carregar...</div>
        ) : tipos.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <FileCheck size={28} strokeWidth={1.4} className="text-slate-300"/>
            Nenhum tipo de documento configurado. Comece criando os documentos obrigatórios da sua escola.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">Ordem</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Escopo</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Obrigatório</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Bloqueia</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Upload</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ativo</th>
                <th className="px-4 py-2"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tipos.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 text-center text-slate-500 font-mono text-xs">{t.ordem}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{t.nome}</p>
                    {t.descricao && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.descricao}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{escopoBadge(t)}</td>
                  <td className="px-3 py-3 text-center">{t.obrigatorio ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">○</span>}</td>
                  <td className="px-3 py-3 text-center">{t.bloqueia_matricula ? <span className="text-red-600" title="Bloqueia confirmação da matrícula se faltar">●</span> : <span className="text-slate-300">○</span>}</td>
                  <td className="px-3 py-3 text-center">{t.aceita_upload ? <span className="text-blue-600">●</span> : <span className="text-slate-300">○</span>}</td>
                  <td className="px-3 py-3 text-center">{t.ativo ? <span className="text-emerald-600">●</span> : <span className="text-slate-300">○</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-blue-600"><Pencil size={14}/></button>
                      <button onClick={() => remove(t)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">{editing.id ? "Editar tipo" : "Novo tipo de documento"}</h2>
              <button onClick={close} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
            </div>

            {error && <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl text-sm">{error}</div>}

            <div className="p-6 space-y-5">
              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Identificação</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                    <input value={editing.form.nome} onChange={e => updField("nome", e.target.value)} placeholder="ex: Bilhete de Identidade"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Ordem</label>
                    <input type="number" value={editing.form.ordem} onChange={e => updField("ordem", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descrição / instruções</label>
                    <textarea value={editing.form.descricao} onChange={e => updField("descricao", e.target.value)} rows={2} placeholder="ex: Cópia legível, frente e verso. Aceitamos PDF ou imagem."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50"/>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Escopo</h3>
                <p className="text-xs text-slate-400 mb-2">Deixe em branco para aplicar a toda a escola. Use Curso/Classe para regras específicas (ex: certificado profissional só para o técnico).</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Curso</label>
                    <select value={editing.form.curso_id} onChange={e => updField("curso_id", e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50">
                      <option value="">— Todos —</option>
                      {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Classe</label>
                    <select value={editing.form.classe_id} onChange={e => updField("classe_id", e.target.value)} disabled={!editing.form.curso_id}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-slate-50 disabled:opacity-50">
                      <option value="">— Todas —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Comportamento</h3>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!editing.form.obrigatorio} onChange={e => updField("obrigatorio", e.target.checked)} className="mt-0.5"/>
                    <div>
                      <p className="text-sm text-slate-800 font-medium">Obrigatório</p>
                      <p className="text-xs text-slate-400">Aparece marcado como obrigatório na ficha do aluno e nas listagens.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2 cursor-pointer ${!editing.form.obrigatorio ? "opacity-50" : ""}`}>
                    <input type="checkbox" disabled={!editing.form.obrigatorio} checked={!!editing.form.bloqueia_matricula} onChange={e => updField("bloqueia_matricula", e.target.checked)} className="mt-0.5"/>
                    <div>
                      <p className="text-sm text-slate-800 font-medium">Bloqueia confirmação de matrícula</p>
                      <p className="text-xs text-slate-400">Sem este documento entregue, a matrícula não pode passar de pendente para activa. (só faz sentido se obrigatório)</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!editing.form.aceita_upload} onChange={e => updField("aceita_upload", e.target.checked)} className="mt-0.5"/>
                    <div>
                      <p className="text-sm text-slate-800 font-medium">Aceita upload de ficheiro digitalizado</p>
                      <p className="text-xs text-slate-400">Permite anexar PDF/imagem (5MB máx).</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!editing.form.ativo} onChange={e => updField("ativo", e.target.checked)} className="mt-0.5"/>
                    <div>
                      <p className="text-sm text-slate-800 font-medium">Activo</p>
                      <p className="text-xs text-slate-400">Desactive para parar de exigir este documento sem apagar o histórico de entregas.</p>
                    </div>
                  </label>
                </div>
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
