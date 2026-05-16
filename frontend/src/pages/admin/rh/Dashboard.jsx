import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, UserCheck, UserX, Cake, Building2, Briefcase, Banknote, Plus, BookOpen } from "lucide-react";
import api from "../../../services/api";

const fmt = (v) => Number(v || 0).toLocaleString("pt-PT");

export default function RhDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/rh/dashboard")
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const abrirGuia = async () => {
    try {
      const r = await api.get("/rh/guia-rapido.pdf", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([r.data], { type: "application/pdf" }));
      const w = window.open(url, "_blank");
      if (!w) {
        const a = document.createElement("a");
        a.href = url; a.download = "guia-rapido-rh.pdf";
        document.body.appendChild(a); a.click(); a.remove();
      }
    } catch (e) {
      alert(e.response?.data?.message || "Falha ao abrir o guia.");
    }
  };

  if (loading) return <p className="text-slate-400 py-12 text-center">A carregar...</p>;
  if (!data)   return <p className="text-slate-400 py-12 text-center">Sem dados.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">👥 Recursos Humanos</h1>
          <p className="text-xs text-slate-500 mt-1">Visão geral do quadro de pessoal e folha de pagamentos.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={abrirGuia}
            className="border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
            <BookOpen size={16}/> Guia Rápido
          </button>
          <Link to="/rh/funcionarios" className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 inline-flex items-center gap-2">
            <Plus size={16}/> Novo funcionário
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total" value={data.total} icon={<Users className="text-blue-600" />} cor="bg-blue-50" />
        <Stat label="Activos" value={data.activos} icon={<UserCheck className="text-emerald-600" />} cor="bg-emerald-50" />
        <Stat label="Suspensos" value={data.suspensos} icon={<UserX className="text-amber-600" />} cor="bg-amber-50" />
        <Stat label="Demitidos" value={data.demitidos} icon={<UserX className="text-red-500" />} cor="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Folha do mês */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Banknote size={18} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-700">
              Folha de pagamento — {String(data.folha_mes.mes).padStart(2,"0")}/{data.folha_mes.ano}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Mini label="Total folhas" valor={data.folha_mes.total} cor="text-slate-700" />
            <Mini label="Pagas" valor={data.folha_mes.pagas} cor="text-emerald-600" />
            <Mini label="Pendentes" valor={data.folha_mes.pendentes} cor="text-amber-600" />
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-slate-500">Total a pagar</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(data.folha_mes.valor_total)} Kz</p>
          </div>
          <Link to="/rh/folhas" className="block mt-4 text-center text-sm text-blue-600 hover:underline">
            Ver folhas detalhadas →
          </Link>
        </div>

        {/* Aniversariantes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cake size={18} className="text-pink-500" />
            <h2 className="text-sm font-semibold text-slate-700">Aniversariantes do mês</h2>
          </div>
          {data.aniversariantes_mes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Nenhum aniversariante este mês.</p>
          ) : (
            <ul className="space-y-2">
              {data.aniversariantes_mes.map(a => (
                <li key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-semibold text-xs">
                    {a.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{a.nome}</p>
                    <p className="text-xs text-slate-500">{a.cargo} · {new Date(a.data_nascimento).toLocaleDateString("pt-AO", { day: "2-digit", month: "long" })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Distribuicao titulo="Por cargo" icon={<Briefcase size={16} />} dados={data.por_cargo} keyLabel="cargo" />
        <Distribuicao titulo="Por departamento" icon={<Building2 size={16} />} dados={data.por_departamento} keyLabel="departamento" />
      </div>
    </div>
  );
}

function Stat({ label, value, icon, cor }) {
  return (
    <div className={`${cor} rounded-2xl p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-600">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-2 text-slate-800">{value}</p>
    </div>
  );
}

function Mini({ label, valor, cor }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${cor}`}>{valor}</p>
    </div>
  );
}

function Distribuicao({ titulo, icon, dados, keyLabel }) {
  const total = dados.reduce((s, x) => s + Number(x.total), 0);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-slate-700">{titulo}</h2>
      </div>
      {dados.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Sem dados.</p>
      ) : (
        <ul className="space-y-2">
          {dados.slice(0, 8).map((d, i) => {
            const pct = total > 0 ? Math.round(d.total / total * 100) : 0;
            return (
              <li key={i}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-700 font-medium">{d[keyLabel] || "—"}</span>
                  <span className="text-slate-500">{d.total} ({pct}%)</span>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
