import { useState, useEffect } from "react";
import { CreditCard, Printer, Search } from "lucide-react";
import api from "../../services/api";
import { useAuthStore } from "../../store/auth";
import { imprimirCartoes } from "../../components/ImprimirCartao";

export default function CartaoEstudante() {
  const { escola: escolaRaw, tenantId } = useAuthStore();
  const escola = { ...escolaRaw, codigo: escolaRaw?.codigo ?? tenantId };

  const ANO_REF  = new Date().getFullYear();
  const ANO_ATUAL = `${ANO_REF - 1}-${ANO_REF}`;

  const [cursos,    setCursos]    = useState([]);
  const [turnos,    setTurnos]    = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [turmas,    setTurmas]    = useState([]);
  const [alunos,    setAlunos]    = useState([]);
  const [selected,  setSelected]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [busca,     setBusca]     = useState("");

  const [cursoSel,  setCursoSel]  = useState("");
  const [classeSel, setClasseSel] = useState("");
  const [turnoSel,  setTurnoSel]  = useState("");
  const [filtroTurma,  setFiltroTurma]  = useState("");
  const [filtroAno,    setFiltroAno]    = useState(ANO_ATUAL);

  const ANOS = [`${ANO_REF-2}-${ANO_REF-1}`, `${ANO_REF-1}-${ANO_REF}`, `${ANO_REF}-${ANO_REF+1}`];

  useEffect(() => {
    api.get("/cursos").then(r => setCursos(r.data.data || r.data)).catch(() => {});
    api.get("/turnos").then(r => setTurnos(r.data.data || r.data)).catch(() => {});
  }, []);

  // Cascade Curso → Classe
  useEffect(() => {
    setClasseSel(""); setFiltroTurma(""); setClasses([]); setTurmas([]);
    if (!cursoSel) return;
    api.get(`/classes?curso_id=${cursoSel}`).then(r => setClasses(r.data)).catch(() => {});
  }, [cursoSel]);

  // Cascade Classe (+ Turno) → Turmas
  useEffect(() => {
    setFiltroTurma("");
    if (!classeSel) { setTurmas([]); return; }
    const params = new URLSearchParams({ classe_id: classeSel });
    if (turnoSel) params.append("turno_id", turnoSel);
    api.get(`/turmas?${params}`).then(r => setTurmas(r.data)).catch(() => {});
  }, [classeSel, turnoSel]);

  useEffect(() => {
    if (!filtroTurma) { setAlunos([]); setSelected([]); return; }
    setLoading(true);
    api.get("/matriculas", { params: { turma_id: filtroTurma, ano_letivo: filtroAno, per_page: 200 } })
      .then(r => {
        const mats = r.data.data || r.data;
        const turma = turmas.find(t => String(t.id) === String(filtroTurma));
        const lista = mats.map(m => ({
          ...m.aluno,
          _turma: turma?.nome ?? "",
          _curso: turma?.classe?.curso?.nome ?? "",
        }));
        setAlunos(lista);
        setSelected(lista.map(a => a.id));
      })
      .finally(() => setLoading(false));
  }, [filtroTurma, filtroAno]);

  const alunosFiltrados = alunos.filter(a =>
    !busca || (a.user?.nome ?? "").toLowerCase().includes(busca.toLowerCase()) ||
    (a.numero_aluno ?? "").includes(busca)
  );

  const allSelected = alunosFiltrados.length > 0 && alunosFiltrados.every(a => selected.includes(a.id));
  const toggleAll   = () => setSelected(allSelected ? [] : alunosFiltrados.map(a => a.id));
  const toggle      = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handlePrint = () => {
    const para = alunos.filter(a => selected.includes(a.id));
    if (!para.length) return;
    imprimirCartoes(para, escola, filtroAno);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <CreditCard size={20} className="text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Cartão de Estudante</h1>
            <p className="text-sm text-gray-500">Gera e imprime cartões de identificação</p>
          </div>
        </div>
        {selected.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-800 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm shadow"
          >
            <Printer size={16} /> Imprimir {selected.length} cartão{selected.length !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-5 space-y-3">
        {/* Cascada: Curso → Classe → Turno → Turma */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Curso *</label>
            <select value={cursoSel} onChange={e => setCursoSel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">Seleccionar...</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Classe *</label>
            <select value={classeSel} onChange={e => setClasseSel(e.target.value)} disabled={!cursoSel}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50">
              <option value="">{cursoSel ? "Seleccionar..." : "← Curso"}</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Turno</label>
            <select value={turnoSel} onChange={e => setTurnoSel(e.target.value)} disabled={!classeSel}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50">
              <option value="">Todos</option>
              {turnos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Turma *</label>
            <select value={filtroTurma} onChange={e => setFiltroTurma(e.target.value)} disabled={!classeSel}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50">
              <option value="">{classeSel ? (turmas.length ? "Seleccionar..." : "Sem turmas") : "← Classe"}</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}{t.turnoObj ? ` · ${t.turnoObj.nome}` : ""}</option>)}
            </select>
          </div>
        </div>
        {/* Linha 2: Ano + Pesquisa */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-40">
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Ano Lectivo</label>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {alunos.length > 0 && (
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pesquisar</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou número..."
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estado inicial */}
      {!filtroTurma && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center text-gray-400">
          <CreditCard size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Seleccione uma turma para ver os alunos</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">A carregar...</div>
      )}

      {/* Tabela de alunos */}
      {!loading && filtroTurma && alunos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm text-gray-500">{alunosFiltrados.length} aluno{alunosFiltrados.length !== 1 ? "s" : ""}</span>
            <button onClick={toggleAll} className="text-sm text-blue-600 hover:underline">
              {allSelected ? "Desseleccionar todos" : "Seleccionar todos"}
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nº Aluno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Turma</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Cartão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alunosFiltrados.map((a, i) => (
                <tr key={a.id} className={`hover:bg-gray-50 ${selected.includes(a.id) ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(a.id)}
                      onChange={() => toggle(a.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.user?.nome}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-500">{a.numero_aluno}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a._turma}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => imprimirCartoes([a], escola, filtroAno)}
                      title="Imprimir cartão individual"
                      className="text-blue-400 hover:text-blue-700 transition-colors"
                    >
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtroTurma && alunos.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-400 text-sm">
          Nenhum aluno matriculado nesta turma para o ano {filtroAno}.
        </div>
      )}
    </div>
  );
}
