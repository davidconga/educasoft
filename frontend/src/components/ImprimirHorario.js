const DIAS       = ["segunda","terca","quarta","quinta","sexta","sabado"];
const DIAS_LABEL = { segunda:"Segunda",terca:"Terça",quarta:"Quarta",quinta:"Quinta",sexta:"Sexta",sabado:"Sábado" };

function normDia(d) {
  return (d ?? "").toLowerCase()
    .replace(/ç/g,"c").replace(/ã/g,"a").replace(/ê/g,"e").replace(/é/g,"e")
    .replace(/á/g,"a").replace(/à/g,"a").replace(/\s/g,"");
}

/**
 * imprimirHorarioTurma(turma, horarios, escola)
 * imprimirHorarioProfessor(professor, horarios, escola)
 */
export function imprimirHorarioTurma(turma, horarios, escola) {
  const titulo  = `Horário da Turma ${turma?.nome ?? ""}`;
  const subtitulo = [turma?.classe?.nome, turma?.turno, turma?.ano_letivo].filter(Boolean).join(" · ");
  const html = buildHorarioHtml(horarios, titulo, subtitulo, escola, "disciplina");
  openPrint(html);
}

export function imprimirHorarioProfessor(professor, horarios, escola) {
  const titulo    = `Horário do Professor`;
  const subtitulo = professor?.user?.nome ?? professor?.nome ?? "";
  const html = buildHorarioHtml(horarios, titulo, subtitulo, escola, "turma");
  openPrint(html);
}

/* ── core ──────────────────────────────────────────────────── */

function buildHorarioHtml(horarios, titulo, subtitulo, escola, modoLabel) {
  // Normalizar dia_semana
  const hs = horarios.map(h => ({ ...h, _dia: normDia(h.dia_semana) }));

  // Turnos únicos (hora_inicio + hora_fim), ordenados
  const slots = [...new Map(
    hs.map(h => [`${h.hora_inicio}-${h.hora_fim}`, { inicio: h.hora_inicio, fim: h.hora_fim }])
  ).values()].sort((a,b) => a.inicio.localeCompare(b.inicio));

  // Dias que têm pelo menos 1 aula
  const diasAtivos = DIAS.filter(d => hs.some(h => h._dia === d));

  const escolaNome = escola?.nome ?? "Educajá";
  const logoPath   = escola?.logo ? `/storage/${escola.logo}` : null;
  const hoje       = new Date().toLocaleDateString("pt-AO",{day:"2-digit",month:"long",year:"numeric"});

  const colW   = Math.floor(80 / Math.max(diasAtivos.length,1));
  const tdStyle = "border:1px solid #dde3ea;padding:6px 6px;vertical-align:top;font-size:11px;line-height:1.4;";

  const headerCols = diasAtivos.map(d =>
    `<th style="width:${colW}%;background:#1e3a5f;color:#fff;padding:8px 4px;font-size:12px;">${DIAS_LABEL[d]}</th>`
  ).join("");

  const rows = slots.map(slot => {
    const cells = diasAtivos.map(dia => {
      const aulas = hs.filter(h => h._dia === dia && h.hora_inicio === slot.inicio && h.hora_fim === slot.fim);
      if (!aulas.length) return `<td style="${tdStyle}color:#bbb;">—</td>`;
      const inner = aulas.map(h => {
        const linha1 = modoLabel === "disciplina"
          ? `<strong>${h.disciplina?.nome ?? "—"}</strong>`
          : `<strong>${h.turma?.nome ?? "—"}</strong>`;
        const linha2 = modoLabel === "disciplina"
          ? `<span>${h.professor?.user?.nome ?? ""}</span>`
          : `<span>${h.disciplina?.nome ?? ""}</span>`;
        const sala = h.sala ? `<span style="color:#888;font-size:10px;">Sala: ${h.sala}</span>` : "";
        return `<div style="margin-bottom:4px;">${linha1}<br>${linha2}${sala ? "<br>"+sala : ""}</div>`;
      }).join("");
      return `<td style="${tdStyle}">${inner}</td>`;
    }).join("");

    return `<tr>
      <td style="background:#f0f4f8;font-weight:600;font-size:11px;padding:6px 8px;white-space:nowrap;border:1px solid #dde3ea;">
        ${slot.inicio}<br><span style="color:#888;font-weight:400;">→ ${slot.fim}</span>
      </td>
      ${cells}
    </tr>`;
  }).join("");

  const logoHtml = logoPath
    ? `<img src="${logoPath}" style="height:52px;object-fit:contain;" />`
    : `<div style="width:52px;height:52px;background:#1e3a5f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:22px;">${escolaNome[0]}</div>`;

  return `<!DOCTYPE html><html lang="pt"><head>
  <meta charset="UTF-8"/>
  <title>${titulo}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#222;background:#fff;padding:20px 28px;}
    @media print{body{padding:10px 16px;} .no-print{display:none;}}
    table{width:100%;border-collapse:collapse;}
    th,td{text-align:left;}
  </style>
</head><body>

  <!-- Cabeçalho -->
  <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #1e3a5f;">
    ${logoHtml}
    <div style="flex:1;">
      <div style="font-size:14px;font-weight:700;color:#1e3a5f;">${escolaNome}</div>
      <div style="font-size:17px;font-weight:700;color:#1e3a5f;margin-top:2px;">${titulo}</div>
      ${subtitulo ? `<div style="font-size:11px;color:#666;margin-top:2px;">${subtitulo}</div>` : ""}
    </div>
    <div style="text-align:right;font-size:10px;color:#888;">Data: ${hoje}</div>
  </div>

  <!-- Tabela de horário -->
  ${slots.length === 0
    ? `<p style="text-align:center;color:#888;padding:40px;">Nenhum horário definido.</p>`
    : `<table>
        <thead>
          <tr>
            <th style="width:10%;background:#1e3a5f;color:#fff;padding:8px;font-size:12px;">Hora</th>
            ${headerCols}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  <!-- Rodapé -->
  <div style="margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#aaa;">
    <span>${escolaNome}</span>
    <span>Gerado automaticamente por Educajá</span>
  </div>

  <script>window.onload=()=>{window.print();}</script>
</body></html>`;
}

function openPrint(html) {
  const win = window.open("","_blank","width=960,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
