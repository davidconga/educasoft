import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Plus, Edit3, Trash2, Save, X, Eye, ShieldCheck, Loader2 } from "lucide-react";
import MarkdownLite from "../../components/MarkdownLite";

export default function SuperAdminTermos() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await api.get("/termos");
      setList(data);
    } finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setErro("");
    const ultima = list[0];
    setEditor({
      _new: true,
      versao: ultima ? incrementarVersao(ultima.versao) : "1.0",
      titulo: "Termos e Condições — Educajá",
      conteudo: ultima?.conteudo ?? "# Título\n\nConteúdo aqui...",
      publicar: false,
    });
  }

  function abrirEditar(t) {
    setErro("");
    setEditor({
      _new: false,
      id: t.id,
      versao: t.versao,
      titulo: t.titulo,
      conteudo: t.conteudo,
      publicar: !!t.publicado,
    });
  }

  async function guardar() {
    setSaving(true);
    setErro("");
    try {
      const payload = {
        titulo: editor.titulo,
        conteudo: editor.conteudo,
        publicar: editor.publicar,
      };
      if (editor._new) {
        payload.versao = editor.versao;
        await api.post("/termos", payload);
      } else {
        await api.patch(`/termos/${editor.id}`, payload);
      }
      setEditor(null);
      carregar();
    } catch (e) {
      setErro(e?.response?.data?.message || JSON.stringify(e?.response?.data?.errors || {}));
    } finally { setSaving(false); }
  }

  async function eliminar(t) {
    if (!confirm(`Eliminar versão ${t.versao}?`)) return;
    try {
      await api.delete(`/termos/${t.id}`);
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || "Falha ao eliminar.");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={20} className="text-blue-600" /> Termos e Condições</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerir versões publicadas em educaja.com/termos. Os clientes aceitam a versão em vigor no acto do registo.</p>
        </div>
        <button onClick={abrirNovo}
          className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2">
          <Plus size={14} /> Nova versão
        </button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Versão</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Título</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Publicado em</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              <th className="text-center px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Acções</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">A carregar...</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">Sem versões.</td></tr>
            ) : list.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-mono font-semibold">{t.versao}</td>
                <td className="px-5 py-3 text-gray-800">{t.titulo}</td>
                <td className="px-5 py-3 text-xs text-gray-500">
                  {t.publicado_em ? new Date(t.publicado_em).toLocaleString("pt-AO") : "—"}
                </td>
                <td className="px-5 py-3 text-center">
                  {t.publicado ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Publicada</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Rascunho</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => setPreview(t)} title="Pré-visualizar"
                      className="p-1.5 hover:bg-gray-100 rounded text-gray-600"><Eye size={14} /></button>
                    <button onClick={() => abrirEditar(t)} title="Editar"
                      className="p-1.5 hover:bg-blue-50 rounded text-blue-600"><Edit3 size={14} /></button>
                    <button onClick={() => eliminar(t)} title="Eliminar"
                      className="p-1.5 hover:bg-red-50 rounded text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editor._new ? "Nova versão de termos" : `Editar versão ${editor.versao}`}</h2>
              <button onClick={() => setEditor(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Versão</label>
                    <input value={editor.versao} onChange={(e) => setEditor({ ...editor, versao: e.target.value })}
                      disabled={!editor._new}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 font-mono" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={editor.publicar} onChange={(e) => setEditor({ ...editor, publicar: e.target.checked })} className="accent-blue-600" />
                      Publicar (despublica a anterior)
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
                  <input value={editor.titulo} onChange={(e) => setEditor({ ...editor, titulo: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Conteúdo (Markdown)</label>
                  <textarea rows={20} value={editor.conteudo} onChange={(e) => setEditor({ ...editor, conteudo: e.target.value })}
                    className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono leading-relaxed" />
                  <p className="text-[10px] text-gray-400 mt-1">Suporta # cabeçalhos, **negrito**, *itálico*, listas e [links](url).</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pré-visualização</label>
                <div className="border rounded-lg p-4 bg-gray-50 max-h-[60vh] overflow-y-auto">
                  <MarkdownLite source={editor.conteudo} />
                </div>
              </div>
            </div>

            {erro && <p className="px-6 pb-3 text-xs text-red-600">{erro}</p>}

            <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setEditor(null)}
                className="text-xs font-semibold border border-gray-300 hover:bg-white text-gray-700 px-3 py-2 rounded-md">Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-md flex items-center gap-1.5">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">{preview.titulo}</h2>
                <p className="text-xs text-gray-500 font-mono">Versão {preview.versao}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <MarkdownLite source={preview.conteudo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function incrementarVersao(v) {
  const partes = v.split(".").map(Number);
  if (partes.length === 1) return `${partes[0] + 1}.0`;
  return `${partes[0]}.${(partes[1] ?? 0) + 1}`;
}
