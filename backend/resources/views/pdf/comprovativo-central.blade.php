<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>{{ $c->numero }}</title>
<style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; margin: 32px; }
  .header { display: table; width: 100%; margin-bottom: 24px; border-bottom: 2px solid #16a34a; padding-bottom: 12px; }
  .header > div { display: table-cell; vertical-align: top; }
  .brand { font-size: 22px; font-weight: 800; color: #166534; letter-spacing: -0.5px; }
  .brand .sub { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .meta { text-align: right; font-size: 10px; color: #64748b; }
  .doc-title { font-size: 28px; font-weight: 800; color: #14532d; }
  .doc-num { font-size: 13px; color: #64748b; margin-top: 2px; }
  .stamp { display: inline-block; padding: 6px 14px; border: 2px solid #16a34a; color: #14532d; font-weight: 800; border-radius: 6px; transform: rotate(-3deg); margin-top: 8px; }
  .grid { display: table; width: 100%; margin-top: 16px; }
  .grid > div { display: table-cell; width: 50%; vertical-align: top; padding-right: 12px; }
  .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 4px; }
  .box { border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 6px; }
  .total-box { margin-top: 24px; background: #f0fdf4; border: 2px solid #16a34a; padding: 18px; border-radius: 8px; text-align: center; }
  .total-box .label-big { font-size: 11px; color: #166534; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
  .total-box .valor { font-size: 32px; font-weight: 800; color: #14532d; margin-top: 4px; }
  table.detalhe { width: 100%; border-collapse: collapse; margin-top: 18px; }
  table.detalhe td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
  table.detalhe td.k { color: #6b7280; width: 40%; font-size: 10px; }
  .footer { position: fixed; bottom: 24px; left: 32px; right: 32px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 9px; color: #6b7280; text-align: center; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="brand">EDUCAJÁ<br><span class="sub">Plataforma de Gestão Escolar</span></div>
    <div style="font-size: 10px; color: #64748b; margin-top: 8px; line-height: 1.5;">
      Benguela, Angola<br>
      contact@educaja.com<br>
      www.educaja.com
    </div>
  </div>
  <div class="meta">
    <div class="doc-title">RECIBO</div>
    <div class="doc-num">Nº {{ $c->numero }}</div>
    <div class="stamp">PAGO</div>
    <div style="margin-top: 10px;">
      Data: <strong>{{ \Illuminate\Support\Carbon::parse($c->data_emissao)->format('d/m/Y') }}</strong>
    </div>
  </div>
</div>

<div class="grid">
  <div>
    <div class="label">Pago por</div>
    <div class="box">
      @php $escolaLogo = $c->factura?->escola?->logo ? public_path('storage/' . $c->factura->escola->logo) : null; @endphp
      <table style="width:100%;border-collapse:collapse"><tr>
        @if($escolaLogo && file_exists($escolaLogo))
          <td style="width:42px;vertical-align:middle;padding-right:8px">
            <img src="{{ $escolaLogo }}" style="width:38px;height:38px;border-radius:4px;border:1px solid #e5e7eb;"/>
          </td>
        @endif
        <td style="vertical-align:middle">
          <strong>{{ $c->factura->cliente_nome }}</strong><br>
          @if($c->factura->cliente_nif) NIF: {{ $c->factura->cliente_nif }}<br>@endif
          @if($c->factura->cliente_morada) {{ $c->factura->cliente_morada }}<br>@endif
          @if($c->factura->cliente_email) {{ $c->factura->cliente_email }}@endif
        </td>
      </tr></table>
    </div>
  </div>
  <div>
    <div class="label">Referente à factura</div>
    <div class="box">
      <strong>{{ $c->factura->numero }}</strong><br>
      Plano {{ ucfirst($c->factura->plano) }}<br>
      {{ \Illuminate\Support\Carbon::parse($c->factura->periodo_inicio)->format('d/m/Y') }}
      –
      {{ \Illuminate\Support\Carbon::parse($c->factura->periodo_fim)->format('d/m/Y') }}
    </div>
  </div>
</div>

<table class="detalhe">
  <tr><td class="k">Método de pagamento:</td><td><strong>{{ ucfirst(str_replace('_', ' ', $c->metodo_pagamento)) }}</strong></td></tr>
  @if($c->transacao_ref)
  <tr><td class="k">Referência da transacção:</td><td>{{ $c->transacao_ref }}</td></tr>
  @endif
  <tr><td class="k">Data de pagamento:</td><td>{{ \Illuminate\Support\Carbon::parse($c->factura->paga_em ?? $c->data_emissao)->format('d/m/Y H:i') }}</td></tr>
  <tr><td class="k">Hash do recibo:</td><td style="font-family: monospace;">{{ $c->hash }}</td></tr>
</table>

<div class="total-box">
  <div class="label-big">Valor pago</div>
  <div class="valor">{{ number_format($c->valor, 2, ',', '.') }} AOA</div>
</div>

@php
  $qrData = url('/verificar-recibo-central/' . urlencode($c->numero)) . ($c->hash ? '?h=' . $c->hash : '');
  $qrUrl  = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&qzone=2&data=' . urlencode($qrData);
@endphp
<div style="margin-top: 22px; text-align: center;">
  <img src="{{ $qrUrl }}" alt="QR" style="width:90px;height:90px;border:1px solid #e5e7eb;padding:3px;border-radius:4px;"/>
  <div style="font-size:8px;color:#94a3b8;margin-top:3px;">Verificar autenticidade do recibo</div>
</div>

<div class="footer">
  Recibo emitido electronicamente · {{ $c->numero }} · Hash {{ $c->hash }}
</div>

</body>
</html>
