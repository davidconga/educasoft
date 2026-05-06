import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";
import { Plus, Edit3, Trash2, Star, Loader2, Save, X, Check } from "lucide-react";

function formatAOA(v) {
  return new Intl.NumberFormat("pt-AO", { style: "currency", currency: "AOA", minimumFractionDigits: 0 }).format(Number(v || 0));
}

const FORM_INICIAL = {
  codigo: "", nome: "", descricao: "",
  preco_mensal: 0, preco_anual: 0,
  max_alunos: 100, max_admins: 1,
  features: [],
  destaque: false, ativo: true, ordem: 0, dias_trial: 0,
};

export default function SuperAdminPlanos() {
  const { token } = useCentralAuth();
  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  }), [token]);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    try {
      const { data } = await api.get("/planos-admin");
      setList(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setErro("");
    setEditor({ ...FORM_INICIAL, _new: true });
  }

  function abrirEditar(p) {
    setErro("");
    setEditor({
      ...p,
      preco_mensal: Number(p.preco_mensal),
      preco_anual: Number(p.preco_anual ?? 0),
      features: p.features || [],
      _new: false,
    });
  }

  async function guardar() {
    setErro("");
    setSaving(true);
    try {
      const payload = {
        codigo: editor.codigo,
        nome: editor.nome,
        descricao: editor.descricao,
        preco_mensal: Number(editor.preco_mensal),
        preco_anual: editor.preco_anual ? Number(editor.preco_anual) : null,
        max_alunos: Number(editor.max_alunos),
        max_admins: Number(editor.max_admins),
        features: editor.features,
        destaque: !!editor.destaque,
        ativo: !!editor.ativo,
        ordem: Number(editor.ordem),
        dias_trial: Number(editor.dias_trial),
      };
      if (editor._new) await api.post("/planos-admin", payload);
      else await api.patch(`/planos-admin/${editor.id}`, payload);
      setEditor(null);
      carregar();
    } catch (e) {
      setErro(e?.response?.data?.message || JSON.stringify(e?.response?.data?.errors || {}));
    } finally { setSaving(false); }
  }

  async function eliminar(p) {
    if (!confirm(`Desactivar plano "${p.nome}"? (não elimina; só remove da lista pública)`)) return;
    try {
      await api.delete(`/planos-admin/${p.id}`);
      carregar();
    } catch (e) {
      alert(e?.response?.data?.message || "Falha ao desactivar.");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Definir os planos disponíveis para subscrição. Alterações refletem-se na página /precos.</p>
        </div>
        <button onClick={abrirNovo}
          className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2">
          <Plus size={14} /> Novo plano
        </button>
      </div>

      {loading ? <p className="text-center text-gray-400 py-10">A carregar...</p> :
       list.length === 0 ? <p className="text-center text-gray-400 py-10">Sem planos.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {list.map((p) => (
            <div key={p.id} className={`bg-white rounded-2xl border shadow-sm p-5 relative
              ${p.destaque ? "ring-2 ring-blue-400" : ""}
              ${!p.ativo ? "opacity-60" : ""}`}>
              {p.destaque && (
                <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Star size={10} /> Destaque
                </span>
              )}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{p.nome}</h3>
                  <p className="text-[11px] text-gray-400 font-mono">{p.codigo}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => abrirEditar(p)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => eliminar(p)} className="p-1.5 hover:bg-red-50 rounded text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-extrabold text-gray-800">{formatAOA(p.preco_mensal)}</span>
                <span className="text-xs text-gray-500">/mês</span>
              </div>

              {p.descricao && <p className="text-xs text-gray-600 mb-3">{p.descricao}</p>}

              <ul className="space-y-1.5 mb-3">
                {(p.features || []).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <Check size={12} className="text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t pt-3 mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
                <span><strong className="text-gray-700">{p.max_alunos === -1 ? "∞" : p.max_alunos}</strong> alunos</span>
                <span><strong className="text-gray-700">{p.max_admins === -1 ? "∞" : p.max_admins}</strong> admins</span>
                {p.dias_trial > 0 && <span><strong className="text-gray-700">{p.dias_trial}d</strong> trial</span>}
                <span className="ml-auto"><strong className="text-blue-700">{p.total_assinaturas}</strong> activas</span>
              </div>

              {!p.ativo && (
                <span className="inline-block mt-2 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactivo</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditor(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-bold text-gray-800">{editor._new ? "Novo plano" : `Editar: ${editor.nome}`}</h2>
              <button onClick={() => setEditor(null)} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Código" disabled={!editor._new}
                  value={editor.codigo} onChange={(v) => setEditor({ ...editor, codigo: v })}
                  hint="Letras, números, traço/underscore. Ex: pro-anual" />
                <Field label="Nome" required value={editor.nome} onChange={(v) => setEditor({ ...editor, nome: v })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
                <textarea rows={2} value={editor.descricao || ""} onChange={(e) => setEditor({ ...editor, descricao: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Preço mensal (AOA)" type="number" min="0"
                  value={editor.preco_mensal} onChange={(v) => setEditor({ ...editor, preco_mensal: v })} />
                <Field label="Preço anual (AOA, opcional)" type="number" min="0"
                  value={editor.preco_anual} onChange={(v) => setEditor({ ...editor, preco_anual: v })} />
                <Field label="Max alunos" type="number" min="-1"
                  value={editor.max_alunos} onChange={(v) => setEditor({ ...editor, max_alunos: v })}
                  hint="-1 = ilimitado" />
                <Field label="Max admins" type="number" min="-1"
                  value={editor.max_admins} onChange={(v) => setEditor({ ...editor, max_admins: v })}
                  hint="-1 = ilimitado" />
                <Field label="Dias de trial" type="number" min="0" max="90"
                  value={editor.dias_trial} onChange={(v) => setEditor({ ...editor, dias_trial: v })} />
                <Field label="Ordem" type="number" min="0"
                  value={editor.ordem} onChange={(v) => setEditor({ ...editor, ordem: v })} />
              </div>

              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!editor.destaque}
                  onChange={(e) => setEditor({ ...editor, destaque: e.target.checked })} /> Destaque (banner)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!editor.ativo}
                  onChange={(e) => setEditor({ ...editor, ativo: e.target.checked })} /> Activo (visível em /precos)</label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Features</label>
                {(editor.features || []).map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={f} onChange={(e) => {
                      const next = [...editor.features]; next[i] = e.target.value;
                      setEditor({ ...editor, features: next });
                    }}
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200" />
                    <button onClick={() => setEditor({ ...editor, features: editor.features.filter((_, j) => j !== i) })}
                      className="px-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={() => setEditor({ ...editor, features: [...(editor.features || []), ""] })}
                  className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-md flex items-center gap-1">
                  <Plus size={12} /> Adicionar feature
                </button>
              </div>

              {erro && <p className="text-xs text-red-600">{erro}</p>}
            </div>

            <div className="px-6 py-3 border-t flex justify-end gap-2 bg-gray-50 sticky bottom-0">
              <button onClick={() => setEditor(null)}
                className="text-xs font-semibold border border-gray-300 hover:bg-white text-gray-700 px-3 py-2 rounded-md">Cancelar</button>
              <button onClick={guardar} disabled={saving}
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-md flex items-center gap-1.5">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", hint, required, disabled, ...rest }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} {...rest}
        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50" />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
