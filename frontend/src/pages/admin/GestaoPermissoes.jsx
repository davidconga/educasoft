import { useEffect, useState } from "react";
import { ShieldCheck, Save, RotateCcw, User } from "lucide-react";
import api from "../../services/api";

const MODULOS = [
  {
    grupo: "Principal",
    itens: [
      { key: "dashboard", label: "Dashboard" },
    ],
  },
  {
    grupo: "Académico",
    itens: [
      { key: "alunos",        label: "Alunos" },
      { key: "matriculas",    label: "Matrículas" },
      { key: "professores",   label: "Professores" },
      { key: "turmas",        label: "Turmas" },
      { key: "notas",         label: "Notas" },
      { key: "presencas",     label: "Presenças" },
      { key: "horarios",      label: "Horários" },
      { key: "aulas_remotas", label: "Aulas Remotas" },
    ],
  },
  {
    grupo: "Configurações",
    itens: [
      { key: "gestao_escolar", label: "Classes & Salas" },
      { key: "cursos",         label: "Cursos" },
      { key: "disciplinas",    label: "Disciplinas" },
      { key: "configuracoes",  label: "Dados da Escola" },
      { key: "utilizadores",   label: "Utilizadores" },
      { key: "permissoes",     label: "Permissões" },
    ],
  },
  {
    grupo: "Financeiro",
    itens: [
      { key: "pagamentos",        label: "Finanças" },
      { key: "tesouraria",        label: "Tesouraria" },
      { key: "controlo_propinas", label: "Controlo Propinas" },
      { key: "precario",          label: "Preçário" },
    ],
  },
];

const DEFAULTS = {
  admin:     null,
  secretaria: ["dashboard","alunos","matriculas","professores","turmas","notas","presencas","horarios","pagamentos","tesouraria","controlo_propinas"],
  director:   ["dashboard","alunos","notas","pagamentos","tesouraria","controlo_propinas"],
};

const TIPO_BADGE = {
  admin:     "bg-violet-100 text-violet-700",
  secretaria:"bg-blue-100 text-blue-700",
  director:  "bg-emerald-100 text-emerald-700",
};

export default function GestaoPermissoes() {
  const [utilizadores, setUtilizadores] = useState([]);
  const [selected, setSelected] = useState(null);
  const [permissoes, setPermissoes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/utilizadores").then(r => {
      setUtilizadores(r.data);
      setLoading(false);
    });
  }, []);

  const selectUser = (u) => {
    setSelected(u);
    setPermissoes(u.tipo === "admin" ? getAllKeys() : (u.permissoes ?? []));
    setToast(null);
  };

  const getAllKeys = () => MODULOS.flatMap(g => g.itens.map(i => i.key));

  const toggle = (key) => {
    if (selected?.tipo === "admin") return;
    setPermissoes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGrupo = (grupo) => {
    if (selected?.tipo === "admin") return;
    const keys = grupo.itens.map(i => i.key);
    const allActive = keys.every(k => permissoes.includes(k));
    if (allActive) {
      setPermissoes(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setPermissoes(prev => [...new Set([...prev, ...keys])]);
    }
  };

  const resetDefaults = () => {
    if (!selected) return;
    const def = DEFAULTS[selected.tipo];
    setPermissoes(def === null ? getAllKeys() : (def ?? []));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = selected.tipo === "admin" ? null : permissoes;
      const { data } = await api.put(`/utilizadores/${selected.id}/permissoes`, { permissoes: payload });
      setUtilizadores(prev => prev.map(u => u.id === data.id ? data : u));
      setSelected(data);
      showToast("Permissões guardadas com sucesso.", "success");
    } catch {
      showToast("Erro ao guardar permissões.", "error");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isAdmin = selected?.tipo === "admin";

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <ShieldCheck size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Gestão de Permissões</h1>
          <p className="text-sm text-slate-500">Controle o acesso de cada utilizador aos módulos do sistema</p>
        </div>
      </div>

      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${toast.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Lista de utilizadores */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Utilizadores</p>
            <p className="text-xs text-slate-400 mt-0.5">{utilizadores.length} utilizadores encontrados</p>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="py-10 text-center text-slate-400 text-sm">A carregar...</div>
            ) : utilizadores.map(u => (
              <button
                key={u.id}
                onClick={() => selectUser(u)}
                className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors
                  ${selected?.id === u.id ? "bg-violet-50" : "hover:bg-slate-50"}`}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {u.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium text-slate-700 truncate">{u.nome}</p>
                  <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize mt-0.5 ${TIPO_BADGE[u.tipo] || "bg-slate-100 text-slate-600"}`}>
                    {u.tipo}
                  </span>
                </div>
                {!u.ativo && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">inativo</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Painel de permissões */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <User size={32} strokeWidth={1.5} />
              <p className="text-sm">Seleccione um utilizador para gerir as permissões</p>
            </div>
          ) : (
            <>
              {/* User header */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {selected.nome?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{selected.nome}</p>
                    <p className="text-xs text-slate-400">{selected.email}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${TIPO_BADGE[selected.tipo]}`}>
                    {selected.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetDefaults}
                    disabled={isAdmin}
                    title="Repor permissões padrão"
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={13} /> Repor padrão
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || isAdmin}
                    className="flex items-center gap-1.5 text-xs text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <Save size={13} /> {saving ? "A guardar..." : "Guardar"}
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div className="bg-violet-50 border border-violet-200 text-violet-700 text-sm px-4 py-3 rounded-xl">
                  O utilizador com perfil <strong>admin</strong> tem acesso total ao sistema e não pode ter permissões restritas.
                </div>
              )}

              {/* Modules grid */}
              <div className="space-y-4">
                {MODULOS.map(grupo => {
                  const grupoKeys = grupo.itens.map(i => i.key);
                  const allActive = grupoKeys.every(k => permissoes.includes(k));
                  const someActive = grupoKeys.some(k => permissoes.includes(k));
                  return (
                    <div key={grupo.grupo} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div
                        className={`flex items-center justify-between px-5 py-3 border-b border-slate-100 ${!isAdmin ? "cursor-pointer hover:bg-slate-50" : ""}`}
                        onClick={() => toggleGrupo(grupo)}
                      >
                        <p className="text-sm font-semibold text-slate-700">{grupo.grupo}</p>
                        {!isAdmin && (
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                            ${allActive ? "bg-violet-600 border-violet-600" : someActive ? "border-violet-400 bg-violet-100" : "border-slate-300"}`}
                          >
                            {allActive && <span className="text-white text-[10px] font-bold">✓</span>}
                            {someActive && !allActive && <span className="w-2 h-0.5 bg-violet-500 block" />}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-slate-100">
                        {grupo.itens.map(item => {
                          const active = isAdmin || permissoes.includes(item.key);
                          return (
                            <button
                              key={item.key}
                              onClick={() => toggle(item.key)}
                              disabled={isAdmin}
                              className={`flex items-center gap-2.5 px-4 py-3 bg-white text-left transition-colors
                                ${!isAdmin ? "hover:bg-slate-50 cursor-pointer" : "cursor-default"}
                                ${active ? "text-slate-800" : "text-slate-400"}`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                                ${active ? "bg-violet-600 border-violet-600" : "border-slate-300"}`}
                              >
                                {active && <span className="text-white text-[9px] font-bold">✓</span>}
                              </div>
                              <span className="text-sm font-medium truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
