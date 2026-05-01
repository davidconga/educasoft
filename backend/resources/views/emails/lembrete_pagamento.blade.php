<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>{{ $assunto }}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#1e40af;padding:18px 24px;color:#ffffff;">
            @if($logoUrl)
              <img src="{{ $logoUrl }}" alt="{{ $escolaNome }}" height="36" style="vertical-align:middle;border-radius:6px;margin-right:10px;"/>
            @endif
            <span style="font-size:18px;font-weight:700;vertical-align:middle;">{{ $escolaNome }}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 24px 8px;">
            <h2 style="margin:0 0 6px;font-size:18px;color:#0f172a;">Lembrete de Pagamento</h2>
            <p style="margin:0;color:#64748b;font-size:13px;">Para {{ $alunoNome }}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 24px;">
            <div style="font-size:14px;line-height:1.6;color:#334155;white-space:pre-line;">{{ $corpo }}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
            Mensagem automática enviada por {{ $escolaNome }} via Educajá.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
