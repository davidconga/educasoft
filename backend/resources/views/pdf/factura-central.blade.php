<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>{{ $f->numero }}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; margin: 32px; }
  .header { display: table; width: 100%; margin-bottom: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
  .header > div { display: table-cell; vertical-align: top; }
  .brand { font-size: 22px; font-weight: 800; color: #1e40af; letter-spacing: -0.5px; }
  .brand .sub { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .meta { text-align: right; font-size: 10px; color: #64748b; }
  .meta strong { color: #1f2937; }
  .doc-title { font-size: 28px; font-weight: 800; color: #1e293b; }
  .doc-num { font-size: 13px; color: #64748b; margin-top: 2px; }
  .grid { display: table; width: 100%; margin-top: 16px; }
  .grid > div { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
  .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 4px; }
  .box { border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 6px; }
  table.linhas { width: 100%; border-collapse: collapse; margin-top: 24px; }
  table.linhas th { background: #f3f4f6; font-size: 9px; text-transform: uppercase; color: #4b5563; padding: 8px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  table.linhas td { padding: 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  .right { text-align: right; }
  .totals { float: right; width: 280px; margin-top: 18px; }
  .totals tr td { padding: 5px 10px; font-size: 11px; }
  .totals tr.total td { font-size: 14px; font-weight: 800; background: #1e40af; color: white; border-radius: 4px; }
  .estado { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .est-paga { background: #d1fae5; color: #065f46; }
  .est-pendente { background: #fef3c7; color: #92400e; }
  .est-anulada { background: #fee2e2; color: #991b1b; }
  .footer { position: fixed; bottom: 24px; left: 32px; right: 32px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 9px; color: #6b7280; text-align: center; }
  .ref-box { background: #eff6ff; border: 1px dashed #3b82f6; padding: 12px; margin-top: 16px; border-radius: 6px; }
  .ref-box .num { font-size: 18px; font-weight: 800; color: #1e3a8a; letter-spacing: 2px; font-family: 'Courier New', monospace; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">EDUCAJÁ<br><span class="sub">Plataforma de Gestão Escolar</span></div>
    <div style="font-size: 10px; color: #64748b; margin-top: 8px; line-height: 1.5;">
      Benguela, Angola<br>
      contact@educaja.ao<br>
      www.educaja.ao
    </div>
  </div>
  <div class="meta">
    <div class="doc-title">FACTURA</div>
    <div class="doc-num">Nº {{ $f->numero }}</div>
    <div style="margin-top: 8px;">
      <span class="estado est-{{ $f->estado }}">{{ strtoupper($f->estado) }}</span>
    </div>
    <div style="margin-top: 10px;">
      Data emissão: <strong>{{ \Illuminate\Support\Carbon::parse($f->data_emissao)->format('d/m/Y') }}</strong><br>
      Vencimento: <strong>{{ \Illuminate\Support\Carbon::parse($f->data_vencimento)->format('d/m/Y') }}</strong>
    </div>
  </div>
</div>

<div class="grid">
  <div>
    <div class="label">Cliente</div>
    <div class="box">
      @php $escolaLogo = $f->escola?->logo ? public_path('storage/' . $f->escola->logo) : null; @endphp
      <table style="width:100%;border-collapse:collapse"><tr>
        @if($escolaLogo && file_exists($escolaLogo))
          <td style="width:42px;vertical-align:middle;padding-right:8px">
            <img src="{{ $escolaLogo }}" style="width:38px;height:38px;border-radius:4px;border:1px solid #e5e7eb;"/>
          </td>
        @endif
        <td style="vertical-align:middle">
          <strong>{{ $f->cliente_nome }}</strong><br>
          @if($f->cliente_nif) NIF: {{ $f->cliente_nif }}<br>@endif
          @if($f->cliente_morada) {{ $f->cliente_morada }}<br>@endif
          @if($f->cliente_email) {{ $f->cliente_email }}@endif
        </td>
      </tr></table>
    </div>
  </div>
  <div>
    <div class="label">Período de facturação</div>
    <div class="box">
      <strong>Plano {{ ucfirst($f->plano) }}</strong><br>
      {{ \Illuminate\Support\Carbon::parse($f->periodo_inicio)->format('d/m/Y') }}
      –
      {{ \Illuminate\Support\Carbon::parse($f->periodo_fim)->format('d/m/Y') }}
    </div>
  </div>
</div>

<table class="linhas">
  <thead>
    <tr>
      <th style="width: 50%;">Descrição</th>
      <th class="right">Qtd</th>
      <th class="right">Preço unit.</th>
      <th class="right">Subtotal</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <strong>Subscrição mensal — Plano {{ ucfirst($f->plano) }}</strong><br>
        <span style="color: #6b7280; font-size: 10px;">
          Período {{ \Illuminate\Support\Carbon::parse($f->periodo_inicio)->format('d/m/Y') }} a {{ \Illuminate\Support\Carbon::parse($f->periodo_fim)->format('d/m/Y') }}
        </span>
      </td>
      <td class="right">1</td>
      <td class="right">{{ number_format($f->subtotal, 2, ',', '.') }} AOA</td>
      <td class="right">{{ number_format($f->subtotal, 2, ',', '.') }} AOA</td>
    </tr>
  </tbody>
</table>

<table class="totals">
  <tr><td>Subtotal:</td><td class="right">{{ number_format($f->subtotal, 2, ',', '.') }} AOA</td></tr>
  @if($f->desconto_valor > 0)
  <tr><td>Desconto ({{ number_format($f->desconto_pct, 2, ',', '.') }}%):</td><td class="right">−{{ number_format($f->desconto_valor, 2, ',', '.') }} AOA</td></tr>
  @endif
  <tr><td>IVA ({{ number_format($f->iva_taxa, 2, ',', '.') }}%):</td><td class="right">{{ number_format($f->iva_valor, 2, ',', '.') }} AOA</td></tr>
  <tr class="total"><td>TOTAL:</td><td class="right">{{ number_format($f->total, 2, ',', '.') }} AOA</td></tr>
</table>

<div style="clear: both;"></div>

@if($f->referencias->where("estado", "pendente")->count())
  @php $r = $f->referencias->where("estado", "pendente")->sortByDesc("id")->first(); @endphp
  <div class="ref-box">
    <div style="font-size: 10px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Pagar por referência (Multicaixa Express)</div>
    <table style="width: 100%; font-size: 11px;">
      <tr>
        <td style="width: 33%;">Entidade<br><span class="num">{{ $r->entidade }}</span></td>
        <td style="width: 50%;">Referência<br><span class="num">{{ $r->referencia }}</span></td>
        <td>Valor<br><span class="num">{{ number_format($r->valor, 2, ',', '.') }}</span></td>
      </tr>
    </table>
    <div style="font-size: 9px; color: #6b7280; margin-top: 8px;">
      Válida até {{ $r->expira_em ? \Illuminate\Support\Carbon::parse($r->expira_em)->format('d/m/Y') : 'sem expiração' }}.
      Pode pagar em qualquer Multicaixa, internet banking ou Multicaixa Express.
    </div>
  </div>
@endif

@if($f->notas)
  <div style="margin-top: 18px; font-size: 10px; color: #6b7280;">
    <strong>Observações:</strong> {{ $f->notas }}
  </div>
@endif

@php
  $qrData = url('/verificar-factura/' . urlencode($f->numero)) . ($f->hash ? '?h=' . $f->hash : '');
  $qrUrl  = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&qzone=2&data=' . urlencode($qrData);
@endphp
<div style="margin-top: 28px; text-align: right;">
  <img src="{{ $qrUrl }}" alt="QR" style="width:90px;height:90px;border:1px solid #e5e7eb;padding:3px;border-radius:4px;"/>
  <div style="font-size:8px;color:#94a3b8;margin-top:3px;">Verificar autenticidade · {{ $f->numero }}</div>
</div>

<div class="footer">
  Documento processado por programa validado · Hash: {{ $f->hash ?? '—' }} · {{ $f->numero }}
</div>

</body>
</html>
