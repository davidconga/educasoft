<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Novo contacto Educajá</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
  <tr>
    <td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:#1e40af;padding:18px 24px;color:#ffffff;font-size:18px;font-weight:700;">
            Novo contacto pelo site Educajá
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;">
              <tr><td style="color:#64748b;width:120px;">Nome</td><td style="font-weight:600;">{{ $d['nome'] ?? '—' }}</td></tr>
              <tr><td style="color:#64748b;">Email</td><td>{{ $d['email'] ?? '—' }}</td></tr>
              @if(!empty($d['escola']))
                <tr><td style="color:#64748b;">Escola</td><td>{{ $d['escola'] }}</td></tr>
              @endif
              @if(!empty($d['telefone']))
                <tr><td style="color:#64748b;">Telefone</td><td>{{ $d['telefone'] }}</td></tr>
              @endif
            </table>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0;"/>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;margin-bottom:8px;">Mensagem</div>
            <div style="font-size:14px;line-height:1.6;color:#334155;white-space:pre-line;">{{ $d['mensagem'] ?? '' }}</div>
          </td>
        </tr>
        <tr>
          <td style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
            Recebido em {{ now()->format('d/m/Y H:i') }} via educaja.com
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
