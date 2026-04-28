import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useCentralAuth } from "../../store/centralAuth";

const PLANO_COLOR = {
  basico:   "bg-gray-100 text-gray-700",
  standard: "bg-blue-100 text-blue-700",
  premium:  "bg-purple-100 text-purple-700",
};
const PLANOS = ["basico", "standard", "premium"];

const emptyForm = { nome:"", email:"", telefone:"", endereco:"", codigo:"", plano:"standard", admin_nome:"", admin_email:"", admin_password:"" };

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inp = (extra = "") => `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`;

export default function SuperAdminEscolas() {
  const { token } = useCentralAuth();

  const api = useMemo(() => axios.create({
    baseURL: "/api/v1",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
  }), [token]);

  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPlano, setFilterPlano] = useState("todos");

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editEscola, setEditEscola] = useState(null);
  const [detailEscola, setDetailEscola] = useState(null);
  const [activateModal, setActivateModal] = useState(null); // escola sem admin guardado
  const [activateForm, setActivateForm] = useState({ admin_nome:"", admin_email:"", admin_password:"" });

  // Forms
  const [form, setForm]       = useState(emptyForm);
  const [editForm, setEditForm] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]   = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/escolas?per_page=200");
      setEscolas(res.data.data || res.data);
    } catch {
      showToast("Erro ao carregar escolas.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => escolas.filter(e => {
    const q = search.toLowerCase();
    if (q && !e.nome?.toLowerCase().includes(q) && !e.email?.toLowerCase().includes(q) && !e.codigo?.toLowerCase().includes(q)) return false;
    if (filterStatus === "ativas"    && !e.ativo) return false;
    if (filterStatus === "pendentes" &&  e.ativo) return false;
    if (filterPlano !== "todos" && e.plano !== filterPlano) return false;
    return true;
  }), [escolas, search, filterStatus, filterPlano]);

  const autoCode = (nome) =>
    nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 25);

  // ── Actions ──────────────────────────────────────────────────
  const activate = async (escola, extraData = null) => {
    if (!escola.admin_email && !extraData) {
      setActivateForm({ admin_nome: "", admin_email: "", admin_password: "" });
      setActivateModal(escola);
      return;
    }
    setActionLoading(escola.id + "_act");
    try {
      const res = await api.post(`/escolas/${escola.id}/activate`, extraData ?? {});
      showToast(res.data.message);
      setActivateModal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Erro ao activar.", "error");
    } finally { setActionLoading(null); }
  };

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    await activate(activateModal, activateForm);
  };

  const deactivate = async (escola) => {
    if (!confirm(`Suspender "${escola.nome}"?`)) return;
    setActionLoading(escola.id + "_deact");
    try {
      await api.post(`/escolas/${escola.id}/deactivate`);
      showToast("Escola suspensa.");
      load();
    } catch { showToast("Erro ao suspender.", "error"); }
    finally { setActionLoading(null); }
  };

  const destroy = async (escola) => {
    if (!confirm(`Eliminar "${escola.nome}" permanentemente?`)) return;
    setActionLoading(escola.id + "_del");
    try {
      await api.delete(`/escolas/${escola.id}`);
      showToast("Escola eliminada.");
      load();
    } catch { showToast("Erro ao eliminar.", "error"); }
    finally { setActionLoading(null); }
  };

  // ── Create ───────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      await api.post("/escolas", form);
      showToast("Escola criada e activada com sucesso.");
      setShowCreate(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      if (err.response?.data?.errors) setFormErrors(err.response.data.errors);
      else showToast(err.response?.data?.message || "Erro ao criar escola.", "error");
    } finally { setSaving(false); }
  };

  // ── Edit ─────────────────────────────────────────────────────
  const openEdit = (escola) => {
    setEditEscola(escola);
    setEditForm({ nome: escola.nome, email: escola.email, telefone: escola.telefone ?? "", endereco: escola.endereco ?? "", plano: escola.plano });
    setFormErrors({});
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormErrors({});
    try {
      await api.put(`/escolas/${editEscola.id}`, editForm);
      showToast("Escola actualizada.");
      setEditEscola(null);
      load();
    } catch (err) {
      if (err.response?.data?.errors) setFormErrors(err.response.data.errors);
      else showToast(err.response?.data?.message || "Erro ao actualizar.", "error");
    } finally { setSaving(false); }
  };

  const pendentes = escolas.filter(e => !e.ativo).length;
  const ativas    = escolas.filter(e =>  e.ativo).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestão de Escolas</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {escolas.length} escola{escolas.length !== 1 ? "s" : ""} registada{escolas.length !== 1 ? "s" : ""}
            {pendentes > 0 && <span className="text-yellow-600 ml-2">· {pendentes} pendente{pendentes !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setForm(emptyForm); setFormErrors({}); }}
          className="bg-blue-700 text-white px-4 py-2.5 rounded-xl hover:bg-blue-600 text-sm font-semibold flex items-center gap-2 shadow-sm"
        >
          + Nova Escola
        </button>
      </div>

      {/* Stats pills */}
      <div className="flex gap-3 mb-5">
        {[
          { label:"Todas",    value: escolas.length, key:"todos",     cls:"bg-white border text-gray-700" },
          { label:"Activas",  value: ativas,         key:"ativas",    cls:"bg-green-50 border border-green-200 text-green-700" },
          { label:"Pendentes",value: pendentes,      key:"pendentes", cls:"bg-yellow-50 border border-yellow-200 text-yellow-700" },
        ].map(p => (
          <button key={p.key} onClick={() => setFilterStatus(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${p.cls} ${filterStatus === p.key ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}>
            {p.label} <span className="font-bold">{p.value}</span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, email ou código..."
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={filterPlano} onChange={e => setFilterPlano(e.target.value)}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todos">Todos os planos</option>
          {PLANOS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 py-16">A carregar...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Nenhuma escola encontrada.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Escola</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Contacto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Admin</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(escola => {
                const busy = (sfx) => actionLoading === escola.id + sfx;
                return (
                  <tr key={escola.id} className="hover:bg-gray-50 group">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-800 text-sm">{escola.nome}</p>
                      <p className="text-xs text-gray-400 font-mono">{escola.codigo}.educa.okulandisa.com</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-600">{escola.email}</p>
                      {escola.telefone && <p className="text-xs text-gray-400">{escola.telefone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLANO_COLOR[escola.plano] ?? "bg-gray-100 text-gray-600"}`}>
                        {escola.plano}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {escola.admin_email
                        ? <><p className="text-sm text-gray-700">{escola.admin_nome}</p><p className="text-xs text-gray-400">{escola.admin_email}</p></>
                        : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${escola.ativo ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {escola.ativo ? "Activa" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Detail */}
                        <button onClick={() => setDetailEscola(escola)}
                          className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="Detalhes">
                          👁
                        </button>
                        {/* Edit */}
                        <button onClick={() => openEdit(escola)}
                          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Editar">
                          ✏️
                        </button>
                        {/* Activate / Deactivate */}
                        {!escola.ativo ? (
                          <button onClick={() => activate(escola)} disabled={busy("_act")}
                            className="bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-green-500 disabled:opacity-50 whitespace-nowrap">
                            {busy("_act") ? "..." : "Activar"}
                          </button>
                        ) : (
                          <button onClick={() => deactivate(escola)} disabled={busy("_deact")}
                            className="bg-yellow-500 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-yellow-400 disabled:opacity-50 whitespace-nowrap">
                            {busy("_deact") ? "..." : "Suspender"}
                          </button>
                        )}
                        {/* Delete */}
                        <button onClick={() => destroy(escola)} disabled={busy("_del")}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Eliminar">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal: Criar Escola ── */}
      {showCreate && (
        <Modal title="Nova Escola" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-sm text-gray-500 -mt-1 mb-2">A escola será criada e activada imediatamente.</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Nome da Escola *" error={formErrors.nome?.[0]}>
                  <input value={form.nome} onChange={e => { const v = e.target.value; setForm(f => ({...f, nome: v, codigo: f.codigo || autoCode(v)})); }}
                    required className={inp(formErrors.nome ? "border-red-400" : "border-gray-300")} placeholder="Ex: Colégio São Pedro" />
                </Field>
              </div>
              <Field label="Email *" error={formErrors.email?.[0]}>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                  required className={inp(formErrors.email ? "border-red-400" : "border-gray-300")} placeholder="geral@escola.ao" />
              </Field>
              <Field label="Telefone" error={formErrors.telefone?.[0]}>
                <input value={form.telefone} onChange={e => setForm(f => ({...f, telefone: e.target.value}))}
                  className={inp("border-gray-300")} placeholder="+244 9xx xxx xxx" />
              </Field>
              <div className="col-span-2">
                <Field label="Endereço" error={formErrors.endereco?.[0]}>
                  <input value={form.endereco} onChange={e => setForm(f => ({...f, endereco: e.target.value}))}
                    className={inp("border-gray-300")} placeholder="Rua Principal, Luanda" />
                </Field>
              </div>
              <Field label="Código *" error={formErrors.codigo?.[0]}>
                <input value={form.codigo} onChange={e => setForm(f => ({...f, codigo: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")}))}
                  required className={inp(formErrors.codigo ? "border-red-400" : "border-gray-300")} placeholder="codigo-escola" />
              </Field>
              <Field label="Plano *" error={formErrors.plano?.[0]}>
                <select value={form.plano} onChange={e => setForm(f => ({...f, plano: e.target.value}))} required className={inp("border-gray-300")}>
                  {PLANOS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </Field>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Conta do Administrador</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Field label="Nome do Admin *" error={formErrors.admin_nome?.[0]}>
                    <input value={form.admin_nome} onChange={e => setForm(f => ({...f, admin_nome: e.target.value}))}
                      required className={inp(formErrors.admin_nome ? "border-red-400" : "border-gray-300")} placeholder="João Silva" />
                  </Field>
                </div>
                <Field label="Email do Admin *" error={formErrors.admin_email?.[0]}>
                  <input type="email" value={form.admin_email} onChange={e => setForm(f => ({...f, admin_email: e.target.value}))}
                    required className={inp(formErrors.admin_email ? "border-red-400" : "border-gray-300")} placeholder="admin@escola.ao" />
                </Field>
                <Field label="Password *" error={formErrors.admin_password?.[0]}>
                  <input type="password" value={form.admin_password} onChange={e => setForm(f => ({...f, admin_password: e.target.value}))}
                    required minLength={6} className={inp(formErrors.admin_password ? "border-red-400" : "border-gray-300")} placeholder="Mínimo 6 caracteres" />
                </Field>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
                {saving ? "A criar..." : "Criar Escola"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Editar Escola ── */}
      {editEscola && (
        <Modal title={`Editar — ${editEscola.nome}`} onClose={() => setEditEscola(null)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Nome *" error={formErrors.nome?.[0]}>
                  <input value={editForm.nome} onChange={e => setEditForm(f => ({...f, nome: e.target.value}))}
                    required className={inp(formErrors.nome ? "border-red-400" : "border-gray-300")} />
                </Field>
              </div>
              <Field label="Email *" error={formErrors.email?.[0]}>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))}
                  required className={inp(formErrors.email ? "border-red-400" : "border-gray-300")} />
              </Field>
              <Field label="Telefone">
                <input value={editForm.telefone} onChange={e => setEditForm(f => ({...f, telefone: e.target.value}))} className={inp("border-gray-300")} />
              </Field>
              <div className="col-span-2">
                <Field label="Endereço">
                  <input value={editForm.endereco} onChange={e => setEditForm(f => ({...f, endereco: e.target.value}))} className={inp("border-gray-300")} />
                </Field>
              </div>
              <Field label="Plano *">
                <select value={editForm.plano} onChange={e => setEditForm(f => ({...f, plano: e.target.value}))} className={inp("border-gray-300")}>
                  {PLANOS.map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                </select>
              </Field>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditEscola(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Detalhe ── */}
      {detailEscola && (
        <Modal title="Detalhes da Escola" onClose={() => setDetailEscola(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🏫</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{detailEscola.nome}</h3>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PLANO_COLOR[detailEscola.plano] ?? "bg-gray-100 text-gray-600"}`}>
                  {detailEscola.plano}
                </span>
                <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${detailEscola.ativo ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {detailEscola.ativo ? "Activa" : "Pendente"}
                </span>
              </div>
            </div>

            {[
              { label:"Email",    value: detailEscola.email },
              { label:"Telefone", value: detailEscola.telefone || "—" },
              { label:"Endereço", value: detailEscola.endereco || "—" },
              { label:"Código",   value: detailEscola.codigo, mono: true },
              { label:"Domínio",  value: `${detailEscola.codigo}.educa.okulandisa.com`, mono: true },
            ].map(row => (
              <div key={row.label} className="flex justify-between py-2 border-b border-gray-50 text-sm">
                <span className="text-gray-500 font-medium">{row.label}</span>
                <span className={`text-gray-800 ${row.mono ? "font-mono text-xs" : ""}`}>{row.value}</span>
              </div>
            ))}

            {detailEscola.admin_email && (
              <div className="bg-blue-50 rounded-xl p-4 mt-2">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Administrador</p>
                <p className="text-sm font-semibold text-gray-800">{detailEscola.admin_nome}</p>
                <p className="text-sm text-gray-600">{detailEscola.admin_email}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              {!detailEscola.ativo && (
                <button onClick={() => { activate(detailEscola); setDetailEscola(null); }}
                  className="flex-1 bg-green-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-green-500">
                  ✅ Activar
                </button>
              )}
              <button onClick={() => { setDetailEscola(null); openEdit(detailEscola); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-50">
                ✏️ Editar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Activar escola sem admin guardado ── */}
      {activateModal && (
        <Modal title={`Activar — ${activateModal.nome}`} onClose={() => setActivateModal(null)}>
          <form onSubmit={handleActivateSubmit} className="space-y-4">
            <p className="text-sm text-gray-500 -mt-1">Esta escola não tem dados de administrador guardados. Defina as credenciais de acesso.</p>
            <Field label="Nome do Administrador *">
              <input
                value={activateForm.admin_nome}
                onChange={e => setActivateForm(f => ({...f, admin_nome: e.target.value}))}
                required className={inp("border-gray-300")} placeholder="Nome completo"
              />
            </Field>
            <Field label="Email do Administrador *">
              <input
                type="email"
                value={activateForm.admin_email}
                onChange={e => setActivateForm(f => ({...f, admin_email: e.target.value}))}
                required className={inp("border-gray-300")} placeholder="admin@escola.ao"
              />
            </Field>
            <Field label="Password *">
              <input
                type="password"
                value={activateForm.admin_password}
                onChange={e => setActivateForm(f => ({...f, admin_password: e.target.value}))}
                required minLength={6} className={inp("border-gray-300")} placeholder="Mínimo 6 caracteres"
              />
            </Field>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setActivateModal(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={actionLoading === activateModal.id + "_act"} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-500 disabled:opacity-60">
                {actionLoading === activateModal.id + "_act" ? "A activar..." : "✅ Activar Escola"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium z-[60]
          ${toast.type === "error" ? "bg-red-600" : "bg-green-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
