<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Recibo Consolidado {{ $lote_id }}</title>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
  table { border-collapse: collapse; width: 100%; }
  .header { background: #1d4ed8; color: #fff; padding: 14px 16px; }
  .header td { color: #fff; vertical-align: middle; }
  .escola-nome { font-size: 16px; font-weight: 700; }
  .escola-sub  { font-size: 10px; opacity: .85; margin-top: 2px; }
  .doc-label   { font-size: 13px; font-weight: 700; text-align: right; }
  .doc-ref     { font-size: 10px; opacity: .85; text-align: right; margin-top: 2px; font-family: 'Courier', monospace; }
  .logo-box    { width: 44px; height: 44px; background: rgba(255,255,255,.2); text-align: center; vertical-align: middle; font-size: 18px; font-weight: 800; color: #fff; line-height: 44px; border-radius: 4px; }
  .meta { background: #f8fafc; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; }
  .meta td { width: 25%; padding: 4px 8px; vertical-align: top; }
  .meta-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; display: block; }
  .meta-value { font-size: 11px; font-weight: 600; color: #1e293b; display: block; margin-top: 2px; }
  .status-pago { color: #16a34a; }
  .sec-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; padding: 12px 16px 4px; }
  .aluno-box { padding: 0 16px 8px; }
  .aluno-row td { padding: 4px 0; border-bottom: 1px dashed #f1f5f9; vertical-align: top; }
  .aluno-row td:first-child { color: #64748b; width: 140px; }
  .aluno-row td:last-child  { font-weight: 600; }
  .items { margin: 4px 16px 12px; }
  .items th { background: #1d4ed8; color: #fff; padding: 7px 10px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .items td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .items .right { text-align: right; }
  .items tfoot td { border-top: 2px solid #cbd5e1; padding-top: 10px; border-bottom: none; }
  .tf-label { text-align: right; font-weight: 700; color: #334155; font-size: 11px; }
  .tf-valor { text-align: right; font-size: 14px; font-weight: 800; color: #1d4ed8; }
  .multa { color: #dc2626; font-size: 9px; }
  .carteira { margin: 6px 16px 12px; }
  .carteira td { width: 33.33%; text-align: center; padding: 8px 4px; vertical-align: top; }
  .carteira .col-mid { border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
  .cart-label { display: block; font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; }
  .cart-value { display: block; font-weight: 700; font-size: 12px; margin-top: 3px; }
  .cart-pago    { color: #16a34a; }
  .cart-pend    { color: #d97706; }
  .cart-saldo-pos { color: #16a34a; }
  .cart-saldo-neg { color: #dc2626; }
  .assinaturas { margin: 28px 16px 8px; }
  .assinaturas td { width: 50%; padding: 0 16px; vertical-align: top; }
  .ass-linha { border-top: 1px solid #94a3b8; margin-top: 28px; }
  .ass-label { font-size: 9px; color: #64748b; text-align: center; margin-top: 4px; }
  .rodape { text-align: center; font-size: 9px; color: #94a3b8; padding: 10px 0 4px; border-top: 1px solid #f1f5f9; margin: 8px 16px 0; }
</style>
</head>
<body>

@php
  $fmt = fn($v) => number_format((float)$v, 2, ',', '.');
  $tipoLabels = ['mensalidade'=>'Mensalidade','matricula'=>'Matrícula','emolumento'=>'Emolumento','outro'=>'Outro'];
  $primeiro = $pagamentos->first();
  $userNome = $aluno?->user?->nome ?? '—';
  $numAluno = $aluno?->numero_aluno ?? '';
  $totalBase  = $pagamentos->sum(fn($p) => (float)$p->valor);
  $totalMulta = $pagamentos->sum(fn($p) => (float)($p->multa_valor ?? 0));
  $total      = $totalBase + $totalMulta;
  $valorEntregue = $pagamentos->whereNotNull('valor_entregue')->sum('valor_entregue');
  if ($valorEntregue == 0) $valorEntregue = null;
  $troco = $valorEntregue !== null ? max(0, $valorEntregue - $total) : null;
@endphp

<table class="header">
  <tr>
    <td style="width:50px;">
      @if($escola['logo'] ?? null)
        <img src="{{ public_path('storage/' . $escola['logo']) }}" style="width:44px;height:44px;border-radius:4px;"/>
      @else
        <div class="logo-box">{{ strtoupper(substr($escola['nome'] ?? 'E', 0, 1)) }}</div>
      @endif
    </td>
    <td>
      <div class="escola-nome">{{ $escola['nome'] ?? 'Educajá' }}</div>
      <div class="escola-sub">Sistema de Gestão Escolar</div>
    </td>
    <td>
      <div class="doc-label">RECIBO DE COBRANÇAS</div>
      <div class="doc-ref">Lote {{ $lote_id }} · {{ $pagamentos->count() }} pagamento(s)</div>
    </td>
  </tr>
</table>

<table class="meta">
  <tr>
    <td><span class="meta-label">Emissão</span><span class="meta-value">{{ now()->format('d/m/Y') }}</span></td>
    <td><span class="meta-label">Pagamento</span><span class="meta-value">{{ $primeiro->data_pagamento ? $primeiro->data_pagamento->format('d/m/Y') : '—' }}</span></td>
    <td><span class="meta-label">Método</span><span class="meta-value" style="text-transform:capitalize;">{{ $primeiro->metodo ?? '—' }}</span></td>
    <td><span class="meta-label">Estado</span><span class="meta-value status-pago">PAGO</span></td>
  </tr>
</table>

<div class="sec-title">Dados do Aluno</div>
<div class="aluno-box">
  <table>
    <tr class="aluno-row"><td>Nome completo</td><td>{{ $userNome }}</td></tr>
    @if($numAluno)<tr class="aluno-row"><td>Nº de Aluno</td><td>{{ $numAluno }}</td></tr>@endif
    @if(!empty($academico['curso']))<tr class="aluno-row"><td>Curso</td><td>{{ $academico['curso'] }}</td></tr>@endif
    @if(!empty($academico['classe']))<tr class="aluno-row"><td>Classe</td><td>{{ $academico['classe'] }}</td></tr>@endif
    @if(!empty($academico['turno']))<tr class="aluno-row"><td>Turno</td><td>{{ $academico['turno'] }}</td></tr>@endif
    @if(!empty($academico['turma']))<tr class="aluno-row"><td>Turma</td><td>{{ $academico['turma'] }}</td></tr>@endif
  </table>
</div>

<div class="sec-title">Itens do Recibo</div>
<table class="items">
  <thead>
    <tr>
      <th>Serviço</th>
      <th style="width:90px;">Mês/Ref</th>
      <th class="right" style="width:90px;">Valor</th>
      <th class="right" style="width:80px;">Multa</th>
      <th class="right" style="width:90px;">Total</th>
    </tr>
  </thead>
  <tbody>
    @foreach($pagamentos as $p)
      @php
        $servico = $p->propina?->nome ?? $p->emolumento?->nome ?? $p->plano?->nome ?? ($tipoLabels[$p->tipo] ?? $p->tipo);
        $multa   = (float)($p->multa_valor ?? 0);
        $linha   = (float)$p->valor + $multa;
      @endphp
      <tr>
        <td>{{ $servico }}</td>
        <td style="font-size:10px;">{{ $p->mes_referencia ?? '—' }}</td>
        <td class="right">{{ $fmt($p->valor) }}</td>
        <td class="right {{ $multa > 0 ? 'multa' : '' }}">{{ $multa > 0 ? '+' . $fmt($multa) : '—' }}</td>
        <td class="right">{{ $fmt($linha) }} Kz</td>
      </tr>
    @endforeach
  </tbody>
  <tfoot>
    @if($totalMulta > 0)
    <tr>
      <td colspan="3" class="tf-label" style="font-size:10px;color:#64748b;">Subtotal</td>
      <td colspan="2" class="right" style="font-size:11px;">{{ $fmt($totalBase) }} Kz</td>
    </tr>
    <tr>
      <td colspan="3" class="tf-label multa" style="font-size:10px;">Total Multas</td>
      <td colspan="2" class="right multa" style="font-size:11px;">+ {{ $fmt($totalMulta) }} Kz</td>
    </tr>
    @endif
    <tr>
      <td colspan="4" class="tf-label">TOTAL A PAGAR</td>
      <td class="tf-valor">{{ $fmt($total) }} Kz</td>
    </tr>
  </tfoot>
</table>

@if($valorEntregue !== null)
<table class="items" style="margin-top:6px;">
  <tr>
    <td class="tf-label" style="text-align:right;width:60%;">Valor Entregue</td>
    <td class="tf-valor" style="font-size:13px;color:#1e293b;">{{ $fmt($valorEntregue) }} Kz</td>
  </tr>
  @if($troco > 0.009)
  <tr>
    <td class="tf-label" style="text-align:right;color:#16a34a;">Troco</td>
    <td class="tf-valor" style="font-size:13px;color:#16a34a;">{{ $fmt($troco) }} Kz</td>
  </tr>
  @endif
</table>
@endif

@if(isset($carteira) && $carteira)
<div class="sec-title">Saldo da Carteira</div>
<table class="carteira">
  <tr>
    <td><span class="cart-label">Total Pago</span><span class="cart-value cart-pago">{{ $fmt($carteira['total_pago'] ?? 0) }} Kz</span></td>
    <td class="col-mid"><span class="cart-label">Pendente</span><span class="cart-value cart-pend">{{ $fmt($carteira['total_pendente'] ?? 0) }} Kz</span></td>
    <td><span class="cart-label">Saldo Final</span><span class="cart-value {{ ($carteira['saldo'] ?? 0) >= 0 ? 'cart-saldo-pos' : 'cart-saldo-neg' }}">{{ $fmt($carteira['saldo'] ?? 0) }} Kz</span></td>
  </tr>
</table>
@if(isset($carteira['saldo_anterior']))
<table class="carteira" style="margin-top:6px;">
  <tr>
    <td><span class="cart-label">Saldo Anterior</span><span class="cart-value {{ ($carteira['saldo_anterior'] ?? 0) >= 0 ? 'cart-saldo-pos' : 'cart-saldo-neg' }}">{{ $fmt($carteira['saldo_anterior'] ?? 0) }} Kz</span></td>
    <td class="col-mid"><span class="cart-label">Pago Agora</span><span class="cart-value cart-pago">{{ $fmt($total) }} Kz</span></td>
    <td><span class="cart-label">Saldo Actual</span><span class="cart-value {{ ($carteira['saldo_actual'] ?? 0) >= 0 ? 'cart-saldo-pos' : 'cart-saldo-neg' }}">{{ $fmt($carteira['saldo_actual'] ?? 0) }} Kz</span></td>
  </tr>
</table>
@endif
@endif

@php
  $codigoEsc = $escola['codigo'] ?? 'esc';
  $refRec    = $primeiro->referencia ?: ('PAG-' . $primeiro->id);
  $hash      = $primeiro->hash_factura ? '?h=' . $primeiro->hash_factura : '';
  $qrData    = url('/verificar-recibo/' . $codigoEsc . '/' . rawurlencode($refRec)) . $hash . '&lote=' . urlencode($lote_id);
  $qrUrl     = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&qzone=2&data=' . urlencode($qrData);
@endphp
<table class="assinaturas" style="width:100%;">
  <tr>
    <td style="width:38%; vertical-align:bottom;"><div class="ass-linha"></div><div class="ass-label">Tesoureiro(a)</div></td>
    <td style="width:38%; vertical-align:bottom;"><div class="ass-linha"></div><div class="ass-label">Encarregado de Educação / Aluno</div></td>
    <td style="width:24%; text-align:center; vertical-align:bottom;">
      <img src="{{ $qrUrl }}" alt="QR" style="width:80px;height:80px;border:1px solid #e5e7eb;padding:3px;border-radius:4px;background:#fff;"/>
      <div style="font-size:8px;color:#94a3b8;margin-top:2px;">Lote {{ $lote_id }}</div>
    </td>
  </tr>
</table>

@if($primeiro->hash_factura)
<div style="margin: 6px 16px 0; padding: 6px 8px; border-top: 1px dashed #cbd5e1; font-size: 9px; color: #64748b; font-family: 'Courier', monospace;">
  Hash: <strong style="color:#1e293b;">{{ $primeiro->hash_factura }}</strong>
  &nbsp;·&nbsp; Documento processado por software certificado · Lote {{ $lote_id }}
</div>
@endif

<div class="rodape">Documento emitido electronicamente pelo sistema Educajá &nbsp;·&nbsp; {{ now()->format('d/m/Y H:i') }}</div>

</body>
</html>
