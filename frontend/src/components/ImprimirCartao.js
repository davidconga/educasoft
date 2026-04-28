/**
 * Gerador de Cartões de Estudante — Modelo Golfinho
 * imprimirCartoes(alunos, escola, anoLetivo)
 *
 * Cada aluno deve ter: user.nome, numero_aluno, foto, _turma, _curso
 */

export function imprimirCartoes(alunos, escola, anoLetivo) {
  const escolaNome  = escola?.nome    ?? "Escola";
  const escolaCodigo= escola?.codigo  ?? escola?.id ?? "";
  const baseUrl     = window.location.origin;
  const logoUrl     = escola?.logo    ? `${baseUrl}/storage/${escola.logo}` : null;
  const email       = escola?.email   ?? "";
  const telefone    = escola?.telefone ?? "";
  const contato     = [email, telefone].filter(Boolean).join(" | ");

  const cards = alunos.map(a => {
    const nome     = a.user?.nome ?? a.nome ?? "—";
    const numero   = String(a.numero_aluno ?? "").padStart(6, "0");
    const curso    = a._curso  ?? "";
    const classe   = a._turma ?? "";
    const fotoUrl  = a.foto ? `${baseUrl}/storage/${a.foto}` : null;

    const badgeHtml = logoUrl
      ? `<img src="${logoUrl}" class="badge-img" alt="logo">`
      : `<div class="badge-fallback">${escolaNome.charAt(0)}</div>`;

    const fotoHtml = fotoUrl
      ? `<img src="${fotoUrl}" class="student-photo" alt="foto">`
      : `<div class="photo-placeholder">👤</div>`;

    return `
<div class="card">
  <!-- decoração verde canto superior direito -->
  <div class="deco-green"></div>

  <!-- Badge logo da escola -->
  <div class="badge-wrap">
    ${badgeHtml}
  </div>

  <!-- Foto do aluno sobreposta ao badge -->
  <div class="photo-wrap">
    ${fotoHtml}
  </div>

  <!-- Nome em caixa arredondada -->
  <div class="name-box">${nome}</div>

  <!-- Detalhes -->
  <div class="details">
    <div class="detail-line"><strong>ID:</strong> ${numero}</div>
    ${curso  ? `<div class="detail-line"><strong>Curso:</strong> ${curso}</div>`  : ""}
    ${classe ? `<div class="detail-line"><strong>Classe:</strong> ${classe}</div>` : ""}
  </div>

  <!-- Rodapé: QR + Director -->
  <div class="card-bottom">
    <div class="qr-wrap">
      <div id="qr-${numero}" class="qr-box"></div>
    </div>
    <div class="director-wrap">
      <div class="director-label">O Director</div>
      <div class="director-line"></div>
    </div>
  </div>

  <!-- Contacto da escola -->
  ${contato ? `<div class="footer-bar">${contato}</div>` : ""}
</div>`;
  }).join("\n");

  // URLs para os QR codes
  const qrData = alunos.map(a => ({
    id:  String(a.numero_aluno ?? "").padStart(6, "0"),
    val: `${baseUrl}/p/${escolaCodigo}/${encodeURIComponent(a.numero_aluno ?? a.id ?? "")}`,
  }));

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Cartões de Estudante</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; background: #e5e7eb; }

  .toolbar {
    display: flex; gap: 8px; padding: 10px 14px;
    background: #1e293b; position: sticky; top: 0; z-index: 100;
  }
  .toolbar button {
    padding: 6px 18px; border: none; border-radius: 6px;
    cursor: pointer; font-size: 13px; font-weight: 700; color: #fff;
  }
  .btn-p { background: #2563eb; }
  .btn-p:hover { background: #1d4ed8; }
  .btn-c { background: #475569; }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, 88mm);
    gap: 8mm;
    padding: 8mm;
    justify-content: center;
  }

  /* ─── CARTÃO ─── */
  .card {
    width: 88mm;
    min-height: 124mm;
    background: #ffffff;
    border-radius: 5mm;
    position: relative;
    overflow: hidden;
    box-shadow: 0 3px 12px rgba(0,0,0,0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 0;
    page-break-inside: avoid;
  }

  /* Decoração verde canto superior direito */
  .deco-green {
    position: absolute;
    top: 0; right: 0;
    width: 22mm; height: 22mm;
    background: #22c55e;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
    z-index: 1;
  }

  /* Badge / logo circular */
  .badge-wrap {
    margin-top: 5mm;
    width: 36mm;
    height: 36mm;
    border-radius: 50%;
    overflow: hidden;
    border: 1.5mm solid #1e40af;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    position: relative;
  }
  .badge-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .badge-fallback {
    width: 100%;
    height: 100%;
    background: #1e40af;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: 800;
  }

  /* Foto do aluno — sobreposta, abaixo do badge */
  .photo-wrap {
    margin-top: 2mm;
    width: 24mm;
    height: 30mm;
    border-radius: 3mm;
    overflow: hidden;
    border: 1mm solid #1e40af;
    background: #e2e8f0;
    z-index: 2;
  }
  .student-photo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top;
  }
  .photo-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #94a3b8;
  }

  /* Nome em caixa */
  .name-box {
    margin: 3mm 4mm 1mm;
    padding: 1.5mm 5mm;
    border: 1.2px solid #1e40af;
    border-radius: 20mm;
    font-size: 10px;
    font-weight: 800;
    color: #111;
    text-align: center;
    width: calc(100% - 8mm);
    line-height: 1.3;
  }

  /* Detalhes */
  .details {
    padding: 1mm 6mm;
    width: 100%;
    text-align: center;
  }
  .detail-line {
    font-size: 7.5px;
    color: #1e293b;
    line-height: 1.7;
  }
  .detail-line strong {
    color: #1e40af;
  }

  /* Rodapé do cartão: QR + Director */
  .card-bottom {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    width: 100%;
    padding: 2mm 4mm 2.5mm;
    margin-top: auto;
  }
  .qr-wrap { flex-shrink: 0; }
  .qr-box  { width: 18mm; height: 18mm; }
  .qr-box canvas, .qr-box img { width: 18mm !important; height: 18mm !important; }

  .director-wrap {
    text-align: center;
    flex: 1;
    padding-left: 4mm;
  }
  .director-label {
    font-size: 6.5px;
    color: #1e40af;
    margin-bottom: 4mm;
    font-style: italic;
  }
  .director-line {
    border-top: 0.5px solid #94a3b8;
    width: 85%;
    margin: 0 auto;
  }

  /* Barra de contacto */
  .footer-bar {
    width: 100%;
    background: #f1f5f9;
    color: #475569;
    font-size: 6px;
    text-align: center;
    padding: 1.2mm 2mm;
    border-top: 0.5px solid #e2e8f0;
    margin-top: 1.5mm;
  }

  @media print {
    .toolbar { display: none; }
    body { background: #fff; }
    .grid { padding: 0; gap: 5mm; }
    .card { box-shadow: none; border: 0.5px solid #ddd; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button class="btn-p" onclick="window.print()">🖨️ Imprimir ${alunos.length} cartão${alunos.length !== 1 ? "s" : ""}</button>
  <button class="btn-c" onclick="window.close()">✕ Fechar</button>
</div>
<div class="grid">
${cards}
</div>
<script>
var qrData = ${JSON.stringify(qrData)};
qrData.forEach(function(item) {
  var el = document.getElementById('qr-' + item.id);
  if (!el) return;
  new QRCode(el, {
    text: item.val,
    width: 68,
    height: 68,
    colorDark: "#1e40af",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
});
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1000,height=800");
  win.document.write(html);
  win.document.close();
}
