import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Printer } from "lucide-react";
import api from "../../services/api";

const PERIODO_LABEL = { "1": "Iº Trimestre", "2": "IIº Trimestre", "3": "IIIº Trimestre" };

/* ───── Pauta de um trimestre: FJ FI MAC NPP NPT MT ───── */
function PautaTrimestral({ data, periodo, anoLetivo, escolaNome, logoUrl }) {
  const periodoLabel = PERIODO_LABEL[periodo] ?? `Período ${periodo}`;

  return (
    <>
      <div className="text-center mb-3 border-b border-slate-300 pb-3">
        {logoUrl && <img src={logoUrl} alt="" className="h-12 object-contain mx-auto mb-1" onError={e => { e.target.style.display = "none"; }} />}
        <h1 className="text-sm font-bold uppercase">{escolaNome ?? "Educajá"}</h1>
        <h2 className="text-sm font-bold uppercase mt-0.5">Pauta de Aproveitamento — {periodoLabel}</h2>
        <div className="flex flex-wrap justify-center gap-4 mt-1 text-[9px] text-slate-600">
          <span><strong>Curso:</strong> {data.turma.curso ?? "—"}</span>
          <span><strong>Classe:</strong> {data.turma.classe ?? "—"}</span>
          <span><strong>Turma:</strong> {data.turma.nome}</span>
          {data.turma.turno && <span><strong>Período:</strong> {data.turma.turno}</span>}
          <span><strong>Ano Lectivo:</strong> {anoLetivo}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-[7.5px] w-full" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 20 }} />
            <col style={{ width: 130 }} />
            {data.disciplinas.flatMap((_, i) => [
              <col key={`fj-${i}`}  style={{ width: 12 }} />,
              <col key={`fi-${i}`}  style={{ width: 12 }} />,
              <col key={`mac-${i}`} style={{ width: 16 }} />,
              <col key={`npp-${i}`} style={{ width: 16 }} />,
              <col key={`npt-${i}`} style={{ width: 16 }} />,
              <col key={`mt-${i}`}  style={{ width: 20 }} />,
            ])}
            <col style={{ width: 20 }} />
            <col style={{ width: 28 }} />
          </colgroup>
          <thead>
            {/* Linha 1 — nomes disciplinas */}
            <tr style={{ backgroundColor: "#d1d5db" }}>
              <th className="border border-slate-500 px-0.5 py-1 text-center align-bottom" rowSpan={3}>Nº</th>
              <th className="border border-slate-500 px-1 py-1 text-left align-bottom" rowSpan={3}>NOMES</th>
              {data.disciplinas.map(d => (
                <th key={d.id} className="border border-slate-500 text-center font-bold align-bottom" colSpan={6}>
                  <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 72, overflow: "hidden", fontSize: 7, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {d.nome}
                  </div>
                </th>
              ))}
              <th className="border border-slate-500 px-0.5 py-0.5 text-center font-bold" rowSpan={3} style={{ fontSize: 7 }}>
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>MG</div>
              </th>
              <th className="border border-slate-500 px-0.5 py-0.5 text-center font-bold" rowSpan={3} style={{ fontSize: 7 }}>OBS</th>
            </tr>
            {/* Linha 2 — F / componentes / MT */}
            <tr style={{ backgroundColor: "#e5e7eb" }}>
              {data.disciplinas.flatMap(d => [
                <th key={`${d.id}-f`}   className="border border-slate-500 px-0 py-0.5 text-center" colSpan={2} style={{ fontSize: 6 }}>F</th>,
                <th key={`${d.id}-mac`} className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6 }}>MAC</th>,
                <th key={`${d.id}-npp`} className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6 }}>NPP</th>,
                <th key={`${d.id}-npt`} className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6 }}>NPT</th>,
                <th key={`${d.id}-mt`}  className="border border-slate-500 px-0 py-0.5 text-center font-bold" rowSpan={2} style={{ fontSize: 7 }}>MT</th>,
              ])}
            </tr>
            {/* Linha 3 — J / I */}
            <tr style={{ backgroundColor: "#e5e7eb" }}>
              {data.disciplinas.flatMap(d => [
                <th key={`${d.id}-fj`}  className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6, width: 12 }}>J</th>,
                <th key={`${d.id}-fi`}  className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6, width: 12 }}>I</th>,
                <th key={`${d.id}-m2`}  className="border border-slate-500" />,
                <th key={`${d.id}-m3`}  className="border border-slate-500" />,
                <th key={`${d.id}-m4`}  className="border border-slate-500" />,
              ])}
            </tr>
          </thead>
          <tbody>
            {data.alunos.map((aluno, idx) => {
              const mts = data.disciplinas.map(d => aluno.notas[d.id]?.mt).filter(v => v != null);
              const mg  = mts.length ? (mts.reduce((s, v) => s + Number(v), 0) / mts.length).toFixed(1) : null;
              return (
                <tr key={aluno.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td className="border border-slate-300 px-0.5 py-0.5 text-center">{aluno.ord}</td>
                  <td className="border border-slate-300 px-1 py-0.5 font-medium" style={{ fontSize: 7.5 }}>{aluno.nome}</td>
                  {data.disciplinas.flatMap(d => {
                    const n  = aluno.notas[d.id];
                    const mt = n?.mt != null ? Number(n.mt) : null;
                    return [
                      <td key={`${aluno.id}_${d.id}_fj`}  className="border border-slate-300 px-0 py-0.5 text-center">{n?.falta_justificada   > 0 ? n.falta_justificada   : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_fi`}  className="border border-slate-300 px-0 py-0.5 text-center">{n?.falta_injustificada > 0 ? n.falta_injustificada : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_mac`} className="border border-slate-300 px-0.5 py-0.5 text-center">{n?.mac != null ? Number(n.mac).toFixed(1) : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_npp`} className="border border-slate-300 px-0.5 py-0.5 text-center">{n?.npp != null ? Number(n.npp).toFixed(1) : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_npt`} className="border border-slate-300 px-0.5 py-0.5 text-center">{n?.npt != null ? Number(n.npt).toFixed(1) : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_mt`}  className="border border-slate-300 px-0.5 py-0.5 text-center font-bold"
                        style={{ color: mt != null ? (mt >= 10 ? "#1e40af" : "#dc2626") : undefined }}>
                        {mt != null ? mt.toFixed(1) : ""}
                      </td>,
                    ];
                  })}
                  <td className="border border-slate-300 px-0.5 py-0.5 text-center font-bold"
                    style={{ color: mg != null ? (Number(mg) >= 10 ? "#1e40af" : "#dc2626") : undefined }}>
                    {mg ?? ""}
                  </td>
                  <td className="border border-slate-300 px-0.5 py-0.5"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ───── Pauta anual: MT1 MT2 MT3 MF por disciplina ───── */
function PautaAnual({ data, anoLetivo, escolaNome, logoUrl }) {
  return (
    <>
      <div className="text-center mb-3 border-b border-slate-300 pb-3">
        {logoUrl && <img src={logoUrl} alt="" className="h-12 object-contain mx-auto mb-1" onError={e => { e.target.style.display = "none"; }} />}
        <h1 className="text-sm font-bold uppercase">{escolaNome ?? "Educajá"}</h1>
        <h2 className="text-sm font-bold uppercase mt-0.5">Pauta de Aproveitamento Anual</h2>
        <div className="flex flex-wrap justify-center gap-4 mt-1 text-[9px] text-slate-600">
          <span><strong>Curso:</strong> {data.turma.curso ?? "—"}</span>
          <span><strong>Classe:</strong> {data.turma.classe ?? "—"}</span>
          <span><strong>Turma:</strong> {data.turma.nome}</span>
          {data.turma.turno && <span><strong>Período:</strong> {data.turma.turno}</span>}
          <span><strong>Ano Lectivo:</strong> {anoLetivo}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-[7.5px] w-full" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 20 }} />
            <col style={{ width: 130 }} />
            {data.disciplinas.flatMap((_, i) => [
              <col key={`mt1-${i}`} style={{ width: 18 }} />,
              <col key={`mt2-${i}`} style={{ width: 18 }} />,
              <col key={`mt3-${i}`} style={{ width: 18 }} />,
              <col key={`mf-${i}`}  style={{ width: 20 }} />,
            ])}
            <col style={{ width: 22 }} />
            <col style={{ width: 28 }} />
          </colgroup>
          <thead>
            <tr style={{ backgroundColor: "#d1d5db" }}>
              <th className="border border-slate-500 px-0.5 py-1 text-center align-bottom" rowSpan={2}>Nº</th>
              <th className="border border-slate-500 px-1 py-1 text-left align-bottom" rowSpan={2}>NOMES</th>
              {data.disciplinas.map(d => (
                <th key={d.id} className="border border-slate-500 text-center font-bold align-bottom" colSpan={4}>
                  <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 72, overflow: "hidden", fontSize: 7, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {d.nome}
                  </div>
                </th>
              ))}
              <th className="border border-slate-500 px-0.5 py-0.5 text-center font-bold" rowSpan={2} style={{ fontSize: 7 }}>
                <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>MG</div>
              </th>
              <th className="border border-slate-500 px-0.5 py-0.5 text-center font-bold" rowSpan={2} style={{ fontSize: 7 }}>OBS</th>
            </tr>
            <tr style={{ backgroundColor: "#e5e7eb" }}>
              {data.disciplinas.flatMap(d => [
                <th key={`${d.id}-mt1`} className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6 }}>MT1</th>,
                <th key={`${d.id}-mt2`} className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6 }}>MT2</th>,
                <th key={`${d.id}-mt3`} className="border border-slate-500 px-0 py-0.5 text-center" style={{ fontSize: 6 }}>MT3</th>,
                <th key={`${d.id}-mf`}  className="border border-slate-500 px-0 py-0.5 text-center font-bold" style={{ fontSize: 7 }}>MF</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {data.alunos.map((aluno, idx) => {
              const mfs = data.disciplinas.map(d => aluno.notas[d.id]?.mf).filter(v => v != null);
              const mg  = mfs.length ? (mfs.reduce((s, v) => s + Number(v), 0) / mfs.length).toFixed(1) : null;
              return (
                <tr key={aluno.id} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td className="border border-slate-300 px-0.5 py-0.5 text-center">{aluno.ord}</td>
                  <td className="border border-slate-300 px-1 py-0.5 font-medium" style={{ fontSize: 7.5 }}>{aluno.nome}</td>
                  {data.disciplinas.flatMap(d => {
                    const n   = aluno.notas[d.id] ?? {};
                    const mf  = n.mf != null ? Number(n.mf) : null;
                    const col = (v) => v != null ? (Number(v) >= 10 ? "#1e40af" : "#dc2626") : undefined;
                    return [
                      <td key={`${aluno.id}_${d.id}_mt1`} className="border border-slate-300 px-0.5 py-0.5 text-center" style={{ color: col(n.mt1) }}>{n.mt1 != null ? Number(n.mt1).toFixed(1) : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_mt2`} className="border border-slate-300 px-0.5 py-0.5 text-center" style={{ color: col(n.mt2) }}>{n.mt2 != null ? Number(n.mt2).toFixed(1) : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_mt3`} className="border border-slate-300 px-0.5 py-0.5 text-center" style={{ color: col(n.mt3) }}>{n.mt3 != null ? Number(n.mt3).toFixed(1) : ""}</td>,
                      <td key={`${aluno.id}_${d.id}_mf`}  className="border border-slate-300 px-0.5 py-0.5 text-center font-bold" style={{ color: col(mf) }}>{mf != null ? mf.toFixed(1) : ""}</td>,
                    ];
                  })}
                  <td className="border border-slate-300 px-0.5 py-0.5 text-center font-bold"
                    style={{ color: mg != null ? (Number(mg) >= 10 ? "#1e40af" : "#dc2626") : undefined }}>
                    {mg ?? ""}
                  </td>
                  <td className="border border-slate-300 px-0.5 py-0.5"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ───── Componente principal ───── */
export default function PautaImpressao() {
  const [params] = useSearchParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [escola,  setEscola]  = useState(null);

  const turmaId   = params.get("turma_id");
  const periodo   = params.get("periodo");
  const anoLetivo = params.get("ano_letivo");
  const anual     = params.get("anual") === "1";   // ?anual=1 para pauta anual

  useEffect(() => {
    api.get("/configuracoes/escola").then(r => setEscola(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!turmaId) { setError("Parâmetros em falta."); setLoading(false); return; }
    const endpoint = anual ? "/notas/pauta-anual" : "/notas/pauta";
    const p        = anual
      ? { turma_id: turmaId, ano_letivo: anoLetivo }
      : { turma_id: turmaId, periodo, ano_letivo: anoLetivo };

    api.get(endpoint, { params: p })
      .then(r => setData(r.data))
      .catch(() => setError("Erro ao carregar pauta."))
      .finally(() => setLoading(false));
  }, [turmaId, periodo, anoLetivo, anual]);

  const escolaNome = escola?.nome ?? null;
  const logoUrl    = escola?.logo ? `/storage/${escola.logo}` : null;

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-white text-slate-400 text-sm">A carregar pauta...</div>;
  if (error)   return <div className="flex items-center justify-center min-h-screen bg-white text-red-500 text-sm">{error}</div>;
  if (!data)   return null;

  return (
    <>
      <div className="no-print fixed top-4 right-4 z-50">
        <button onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors">
          <Printer size={14} /> Imprimir / Salvar PDF
        </button>
      </div>

      <div className="pauta-page bg-white min-h-screen p-6 print:p-0">
        {anual
          ? <PautaAnual      data={data} anoLetivo={anoLetivo} escolaNome={escolaNome} logoUrl={logoUrl} />
          : <PautaTrimestral data={data} periodo={periodo} anoLetivo={anoLetivo} escolaNome={escolaNome} logoUrl={logoUrl} />
        }

        {/* Legenda */}
        <div className="mt-2 flex gap-5 text-[8px] text-slate-500 no-print">
          {anual
            ? <><span>MT1/MT2/MT3 = Médias Trimestrais</span><span>MF = Média Final = (MT1+MT2+MT3)/3</span><span>MG = Média Geral das disciplinas</span></>
            : <><span>J/I = Faltas Just./Injust.</span><span>MAC = Av. Contínua</span><span>NPP = Prova Prática</span><span>NPT = Prova Teórica</span><span>MT = (MAC+NPP+NPT)/3</span><span>MG = Média Geral</span></>
          }
          <span style={{ color: "#1e40af" }}>● ≥ 10 Aprovado</span>
          <span style={{ color: "#dc2626" }}>● &lt; 10 Reprovado</span>
        </div>

        {/* Rodapé */}
        <div className="mt-8 flex justify-between items-end text-[9px]">
          <div>
            <p className="mb-10">O (A) Professor(a)</p>
            <div style={{ borderTop: "1px solid #64748b", width: 180, paddingTop: 2 }}>&nbsp;</div>
          </div>
          <div className="text-center">
            <p>Benguela, aos _____ de ___________________ de {anoLetivo?.split("-")[1] ?? new Date().getFullYear()}</p>
          </div>
          <div className="text-right">
            <p className="mb-10">O (A) Director(a) de Turma</p>
            <div style={{ borderTop: "1px solid #64748b", width: 200, marginLeft: "auto", paddingTop: 2 }}>
              {data.turma.diretor ?? " "}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[9px]">
          <p className="mb-10">O (A) Director(a) do Instituto</p>
          <div style={{ borderTop: "1px solid #64748b", width: 220, margin: "0 auto", paddingTop: 2 }}>&nbsp;</div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .pauta-page { padding: 5mm !important; }
        }
        @page { size: A3 landscape; margin: 7mm; }
      `}</style>
    </>
  );
}
