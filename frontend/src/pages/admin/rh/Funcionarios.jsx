import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, X, Filter, GraduationCap } from "lucide-react";
import api from "../../../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("pt-AO");

const ESTADOS = [
  { v: "activo",    cls: "bg-emerald-100 text-emerald-700", l: "Activo" },
  { v: "suspenso",  cls: "bg-amber-100 text-amber-700",     l: "Suspenso" },
  { v: "demitido",  cls: "bg-red-100 text-red-700",         l: "Demitido" },
  { v: "reformado", cls: "bg-slate-100 text-slate-600",     l: "Reformado" },
];

const TIPOS_CONTRATO = ["efectivo", "temporario", "estagiario", "tarefeiro"];

const emptyForm = {
  nome: "", bi: "", nif: "", telefone: "", email: "", morada: "",
  genero: "", data_nascimento: "", naturalidade: "", estado_civil: "",
  cargo: "", departamento: "", tipo_contrato: "efectivo",
  data_admissao: new Date().toISOString().slice(0, 10), data_fim: "",
  salario_base: "0", iban: "", banco: "",
  estado: "activo", observacao: "",
};

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [busca, setBusca]               = useState("");
  const [filtroEstado, setFiltroEstado] = useState("activo");
  const [filtroCargo, setFiltroCargo]   = useState("");
  const [filtroDept, setFiltroDept]     = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [editando, setEditando]         = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [saving, setSaving]             = useState(false);
  const [showImportProf, setShowImportProf] = useState(false);
  const [profsLivres, setProfsLivres]   = useState([]);
  const [importForm, setImportForm]     = useState({ professor_id: "", cargo: "Professor", departamento: "", tipo_contrato: "efectivo", salario_base: "0" });
  const [importing, setImporting]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/funcionarios?per_page=500");
      setFuncionarios(r.data.data || r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const cargos = useMemo(() =>
    [...new Set(funcionarios.map(f => f.cargo).filter(Boolean))].sort(),
    [funcionarios]);
  const departamentos = useMemo(() =>
    [...new Set(funcionarios.map(f => f.departamento).filter(Boolean))].sort(),
    [funcionarios]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return funcionarios.filter(f => {
      if (filtroEstado && f.estado !== filtroEstado) return false;
      if (filtroCargo && f.cargo !== filtroCargo) return false;
      if (filtroDept && f.departamento !== filtroDept) return false;
      if (!q) return true;
      return [f.nome, f.bi, f.nif, f.email, f.cargo].filter(Boolean)
        .some(x => String(x).toLowerCase().includes(q));
    });
  }, [funcionarios, busca, filtroEstado, filtroCargo, filtroDept]);

  const abrirCriar = () => { setEditando(null); setForm(emptyForm); setShowForm(true); };
  const abrirEditar = (f) => {
    setEditando(f);
    setForm({
      ...emptyForm, ...f,
      data_nascimento: f.data_nascimento?.slice(0, 10) || "",
      data_admissao: f.data_admissao?.slice(0, 10) || "",
      data_fim: f.data_fim?.slice(0, 10) || "",
      salario_base: String(f.salario_base ?? 0),
    });
    setShowForm(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, salario_base: Number(form.salario_base) };
      Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
      if (editando) await api.put(`/funcionarios/${editando.id}`, payload);
      else          await api.post("/funcionarios", payload);
      setShowForm(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao guardar.");
    } finally { setSaving(false); }
  };

  const abrirImportProfessor = async () => {
    try {
      const r = await api.get("/rh/professores-sem-funcionario");
      setProfsLivres(r.data || []);
      setShowImportProf(true);
    } catch { alert("Erro ao carregar professores."); }
  };

  const importarProfessor = async (e) => {
    e.preventDefault();
    if (!importForm.professor_id) { alert("Escolhe um professor."); return; }
    setImporting(true);
    try {
      await api.post("/rh/funcionarios/criar-de-professor", {
        ...importForm,
        salario_base: Number(importForm.salario_base),
      });
      setShowImportProf(false);
      setImportForm({ professor_id: "", cargo: "Professor", departamento: "", tipo_contrato: "efectivo", salario_base: "0" });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao importar.");
    } finally { setImporting(false); }
  };

  const apagar = async (f) => {
    if (!confirm(`Eliminar ${f.nome}?`)) return;
    await api.delete(`/funcionarios/${f.id}`);
    load();
  };

  const limparFiltros = () => { setBusca(""); setFiltroEstado(""); setFiltroCargo(""); setFiltroDept(""); };
  const filtroAtivo = busca || filtroEstado !== "activo" || filtroCargo || filtroDept;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Funcionários</h1>
          <p className="text-xs text-slate-500 mt-1">{filtrados.length} de {funcionarios.length}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={abrirImportProfessor}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-500 text-sm inline-flex items-center gap-2">
            <GraduationCap size={16}/> Importar de Professor
          </button>
          <button onClick={abrirCriar}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm inline-flex items-center gap-2">
            <Plus size={16}/> Novo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, BI, NIF, email, cargo..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-1"><Filter size={11} className="inline mr-1"/>Estado:</span>
            {ESTADOS.map(e => {
              const sel = filtroEstado === e.v;
              return (
                <button key={e.v} onClick={() => setFiltroEstado(sel ? "" : e.v)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors
                    ${sel ? "bg-slate-700 text-white border-slate-700" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {e.l}
                </button>
              );
            })}
          </div>
          <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)}
            className="border border-slate-200 rounded-md px-2 py-1.5 text-xs">
            <option value="">Todos os cargos</option>
            {cargos.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filtroDept} onChange={e => setFiltroDept(e.target.value)}
            className="border border-slate-200 rounded-md px-2 py-1.5 text-xs">
            <option value="">Todos os departamentos</option>
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {filtroAtivo && (
            <button onClick={limparFiltros}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
              <X size={12}/> limpar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-center text-slate-400 py-12">A carregar...</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center text-slate-400">
          <p className="text-sm">Nenhum funcionário corresponde aos filtros.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
              <tr>
                <th className="text-left px-4 py-2.5">Nome</th>
                <th className="text-left px-4 py-2.5">Cargo</th>
                <th className="text-left px-4 py-2.5">Depart.</th>
                <th className="text-center px-4 py-2.5">Tipo</th>
                <th className="text-right px-4 py-2.5">Salário</th>
                <th className="text-center px-4 py-2.5">Estado</th>
                <th className="text-right px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtrados.map(f => {
                const est = ESTADOS.find(e => e.v === f.estado);
                return (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/rh/funcionarios/${f.id}`} className="font-medium text-slate-800 hover:text-blue-700">
                        {f.nome}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {f.bi && <span className="text-[10px] text-slate-400 font-mono">BI: {f.bi}</span>}
                        {f.professor_id && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                            <GraduationCap size={9}/> Professor
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{f.cargo}</td>
                    <td className="px-4 py-2.5 text-slate-600">{f.departamento || "—"}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-600 capitalize">{f.tipo_contrato || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmt(f.salario_base)} Kz</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${est?.cls || "bg-slate-100"}`}>
                        {est?.l || f.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => abrirEditar(f)} className="text-xs text-blue-600 hover:underline mr-2">Editar</button>
                      <button onClick={() => apagar(f)} className="text-xs text-red-500 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editando ? `Editar — ${editando.nome}` : "Novo Funcionário"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={salvar} className="p-5 space-y-4 overflow-y-auto">
              <Sec titulo="Identificação">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome *" full>
                    <input required value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} className={inp} />
                  </Field>
                  <Field label="BI"><input value={form.bi} onChange={e => setForm({...form, bi: e.target.value})} className={inp} /></Field>
                  <Field label="NIF"><input value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} className={inp} /></Field>
                  <Field label="Género">
                    <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} className={inp}>
                      <option value="">—</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="outro">Outro</option>
                    </select>
                  </Field>
                  <Field label="Data nascimento"><input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} className={inp} /></Field>
                </div>
              </Sec>

              <Sec titulo="Contacto">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone"><input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} className={inp} /></Field>
                  <Field label="Email"><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} /></Field>
                  <Field label="Morada" full><input value={form.morada} onChange={e => setForm({...form, morada: e.target.value})} className={inp} /></Field>
                </div>
              </Sec>

              <Sec titulo="Contrato">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Cargo *"><input required value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} className={inp} /></Field>
                  <Field label="Departamento"><input value={form.departamento} onChange={e => setForm({...form, departamento: e.target.value})} className={inp} /></Field>
                  <Field label="Tipo de contrato">
                    <select value={form.tipo_contrato} onChange={e => setForm({...form, tipo_contrato: e.target.value})} className={inp}>
                      {TIPOS_CONTRATO.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado">
                    <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} className={inp}>
                      {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
                    </select>
                  </Field>
                  <Field label="Data admissão *"><input type="date" required value={form.data_admissao} onChange={e => setForm({...form, data_admissao: e.target.value})} className={inp} /></Field>
                  <Field label="Data fim"><input type="date" value={form.data_fim} onChange={e => setForm({...form, data_fim: e.target.value})} className={inp} /></Field>
                  <Field label="Salário base (Kz) *">
                    <input type="number" min="0" step="0.01" required value={form.salario_base}
                      onChange={e => setForm({...form, salario_base: e.target.value})} className={inp} />
                  </Field>
                </div>
              </Sec>

              <Sec titulo="Conta bancária">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="IBAN"><input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} className={inp} /></Field>
                  <Field label="Banco"><input value={form.banco} onChange={e => setForm({...form, banco: e.target.value})} className={inp} /></Field>
                </div>
              </Sec>

              <Field label="Observação" full>
                <textarea rows="2" value={form.observacao} onChange={e => setForm({...form, observacao: e.target.value})} className={inp} />
              </Field>

              <div className="flex gap-3 pt-2 border-t">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-600 disabled:opacity-60">
                  {saving ? "A guardar..." : (editando ? "Actualizar" : "Criar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importar de Professor */}
      {showImportProf && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b">
              <h2 className="text-lg font-semibold inline-flex items-center gap-2">
                <GraduationCap size={18} className="text-indigo-600"/> Importar de Professor
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Cria um funcionário a partir de um professor existente — copia nome, email, telefone e foto.
              </p>
            </div>
            <form onSubmit={importarProfessor} className="p-5 space-y-3">
              {profsLivres.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">
                  Todos os professores já têm registo de funcionário. ✓
                </p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Professor *</label>
                    <select required value={importForm.professor_id} autoFocus
                      onChange={e => setImportForm({...importForm, professor_id: e.target.value})}
                      className={inp}>
                      <option value="">— Selecciona ({profsLivres.length} disponíveis) —</option>
                      {profsLivres.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome}{p.numero_professor ? ` (#${p.numero_professor})` : ""}{p.especialidade ? ` — ${p.especialidade}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cargo *">
                      <input required value={importForm.cargo}
                        onChange={e => setImportForm({...importForm, cargo: e.target.value})} className={inp} />
                    </Field>
                    <Field label="Departamento">
                      <input value={importForm.departamento}
                        onChange={e => setImportForm({...importForm, departamento: e.target.value})} className={inp} />
                    </Field>
                    <Field label="Tipo contrato">
                      <select value={importForm.tipo_contrato}
                        onChange={e => setImportForm({...importForm, tipo_contrato: e.target.value})} className={inp}>
                        {TIPOS_CONTRATO.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                      </select>
                    </Field>
                    <Field label="Salário base (Kz) *">
                      <input type="number" min="0" step="0.01" required value={importForm.salario_base}
                        onChange={e => setImportForm({...importForm, salario_base: e.target.value})} className={inp} />
                    </Field>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowImportProf(false)}
                  className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                  {profsLivres.length === 0 ? "Fechar" : "Cancelar"}
                </button>
                {profsLivres.length > 0 && (
                  <button type="submit" disabled={importing || !importForm.professor_id}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-60">
                    {importing ? "A importar..." : "Importar"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({ label, children, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Sec({ titulo, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{titulo}</h3>
      {children}
    </div>
  );
}
