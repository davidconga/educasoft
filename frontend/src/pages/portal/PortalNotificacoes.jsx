import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Mail, MessageCircle, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import api from "../../services/api";

const fmtData = (s) => s ? new Date(s).toLocaleString("pt-PT", { dateStyle: "medium", timeStyle: "short" }) : "—";
const fmtVal  = (v) => Number(v || 0).toLocaleString("pt-AO", { minimumFractionDigits: 2 });

export default function PortalNotificacoes() {
  const [list, setList]       = useState([]);
  const [load, setLoad]       = useState(true);
  const [filtro, setFiltro]   = useState("todas"); // todas | nao_lidas

  const carregar = async () => {
    setLoad(true);
    try {
      const params = filtro === "nao_lidas" ? { nao_lidas: 1 } : {};
      const r = await api.get("/portal/notificacoes", { params });
      setList(r.data || []);
    } finally { setLoad(false); }
  };

  useEffect(() => { carregar(); }, [filtro]);

  const marcarLida = async (n) => {
    if (n.lida_em) return;
    try {
      await api.post(`/portal/notificacoes/${n.id}/lida`);
      setList(curr => curr.map(x => x.id === n.id ? { ...x, lida_em: new Date().toISOString() } : x));
    } catch { /* silencioso */ }
  };

  const marcarTodas = async () => {
    try {
      await api.post("/portal/notificacoes/lidas");
      setList(curr => curr.map(x => ({ ...x, lida_em: x.lida_em || new Date().toISOString() })));
    } catch { /* silencioso */ }
  };

  const naoLidasCount = list.filter(n => !n.lida_em).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Notificações</h1>
            <p className="text-sm text-slate-500">Lembretes de pagamento e avisos da escola.</p>
          </div>
        </div>
        {naoLidasCount > 0 && (
          <button onClick={marcarTodas}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium">
            <CheckCheck size={14}/> Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {[
          { v: "todas",     l: "Todas" },
          { v: "nao_lidas", l: `Não lidas${naoLidasCount > 0 ? ` (${naoLidasCount})` : ""}` },
        ].map(t => (
          <button key={t.v} onClick={() => setFiltro(t.v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filtro === t.v ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}>
            {t.l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {load ? (
          <p className="text-center text-slate-400 py-12">A carregar…</p>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
            <Inbox size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-400">Sem notificações por aqui.</p>
          </div>
        ) : (
          list.map(n => {
            const naoLida = !n.lida_em;
            const Icon = n.canal === "email" ? Mail : MessageCircle;
            const venc = n.pagamento?.data_vencimento ? new Date(n.pagamento.data_vencimento).toLocaleDateString("pt-PT") : null;
            const titulo = n.pagamento?.propina?.nome
              || n.pagamento?.emolumento?.nome
              || (n.pagamento?.tipo === "mensalidade" ? "Mensalidade" : "Pagamento");
            return (
              <div key={n.id} onClick={() => marcarLida(n)}
                className={`bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow
                  ${naoLida ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-100"}`}>
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                    ${naoLida ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          Lembrete: {titulo}
                          {n.pagamento?.mes_referencia && <span className="text-slate-400 font-normal"> · {n.pagamento.mes_referencia}</span>}
                        </p>
                        {naoLida && <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{fmtData(n.enviado_em)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 whitespace-pre-line line-clamp-3">{n.mensagem}</p>
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <div className="text-xs text-slate-500">
                        {n.pagamento?.valor != null && (
                          <span className="font-semibold text-slate-700">{fmtVal(n.pagamento.valor)} AOA</span>
                        )}
                        {venc && <span className="ml-2">· vence a {venc}</span>}
                        <span className="ml-2 text-slate-400">· enviado para {n.destinatario}</span>
                      </div>
                      <Link to="/portal/financas" onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800">
                        Ver pagamento <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
