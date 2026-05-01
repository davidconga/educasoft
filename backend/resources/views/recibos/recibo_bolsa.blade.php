<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Recibo de Bolsa {{ $recibo->referencia }}</title>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1e293b; margin: 0; }
  table { border-collapse: collapse; width: 100%; }

  .header { background: #15803d; color: #fff; padding: 14px 16px; }
  .header td { color: #fff; vertical-align: middle; }
  .escola-nome { font-size: 16px; font-weight: 700; }
  .escola-sub  { font-size: 10px; opacity: .85; margin-top: 2px; }
  .doc-label   { font-size: 13px; font-weight: 700; text-align: right; }
  .doc-ref     { font-size: 10px; opacity: .85; text-align: right; margin-top: 2px; font-family: 'Courier', monospace; }
  .logo-box    { width: 44px; height: 44px; background: rgba(255,255,255,.2); text-align: center; vertical-align: middle; font-size: 18px; font-weight: 800; color: #fff; line-height: 44px; border-radius: 4px; }

  .nao-fiscal { background: #fef3c7; color: #92400e; text-align: center; font-size: 10px; padding: 5px; font-weight: 700; letter-spacing: .04em; }

  .meta { background: #f8fafc; padding: 10px 16px; border-bottom: 1px solid #e2e8f0; }
  .meta td { width: 33.33%; padding: 4px 8px; vertical-align: top; }
  .meta-label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: .06em; display: block; }
  .meta-value { font-size: 11px; font-weight: 600; color: #1e293b; display: block; margin-top: 2px; }

  .sec-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #64748b; padding: 12px 16px 4px; }
  .partes-box { padding: 0 16px 8px; }
  .partes-row td { padding: 4px 0; border-bottom: 1px dashed #f1f5f9; vertical-align: top; }
  .partes-row td:first-child { color: #64748b; width: 160px; }
  .partes-row td:last-child  { font-weight: 600; }

  .items { margin: 4px 16px 12px; }
  .items th { background: #15803d; color: #fff; padding: 7px 10px; text-align: left; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .items td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .items .right { text-align: right; }
  .items tfoot td { border-top: 2px solid #cbd5e1; padding-top: 10px; border-bottom: none; }
  .tf-label { text-align: right; font-weight: 700; color: #334155; font-size: 11px; }
  .tf-valor { text-align: right; font-size: 14px; font-weight: 800; color: #15803d; }

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
  $financiador = $recibo->financiador;
  $aluno       = $recibo->aluno;
  $userNome    = $aluno?->user?->nome ?? '—';
  $numAluno    = $aluno?->numero_aluno ?? '';
  $bolsa       = $recibo->bolsa;
  $bolsaDesc   = $bolsa
    ? ($bolsa->tipo === 'percentagem' ? rtrim(rtrim(number_format($bolsa->valor, 2, ',', ''), '0'), ',').'%' : $fmt($bolsa->valor).' AOA fixos')
    : '—';
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
      <div class="escola-nome">{{ $escola['nome'] ?? '—' }}</div>
      <div class="escola-sub">
        @if($escola['nif'] ?? null) NIF: {{ $escola['nif'] }} · @endif
        {{ $escola['email'] ?? '' }} {{ $escola['telefone'] ? ' · '.$escola['telefone'] : '' }}
      </div>
    </td>
    <td style="width:200px;">
      <div class="doc-label">RECIBO DE BOLSA</div>
      <div class="doc-ref">{{ $recibo->referencia }}</div>
    </td>
  </tr>
</table>

<div class="nao-fiscal">DOCUMENTO NÃO FISCAL — COMPROVATIVO DE CONTRIBUIÇÃO</div>

<table class="meta">
  <tr>
    <td>
      <span class="meta-label">Data de Emissão</span>
      <span class="meta-value">{{ \Illuminate\Support\Carbon::parse($recibo->data_emissao)->format('d/m/Y') }}</span>
    </td>
    <td>
      <span class="meta-label">Tipo de Bolsa</span>
      <span class="meta-value">{{ $bolsaDesc }}</span>
    </td>
    <td>
      <span class="meta-label">Pagamentos cobertos</span>
      <span class="meta-value">{{ $recibo->pagamentos->count() }}</span>
    </td>
  </tr>
</table>

<div class="sec-title">Financiador</div>
<div class="partes-box">
  <table>
    <tr class="partes-row"><td>Nome</td>           <td>{{ $financiador->nome }}</td></tr>
    <tr class="partes-row"><td>Tipo</td>           <td>{{ ucfirst($financiador->tipo) }}</td></tr>
    @if($financiador->nif)
      <tr class="partes-row"><td>NIF</td>          <td>{{ $financiador->nif }}</td></tr>
    @endif
    @if($financiador->contacto_responsavel)
      <tr class="partes-row"><td>Contacto</td>     <td>{{ $financiador->contacto_responsavel }}</td></tr>
    @endif
    @if($financiador->email)
      <tr class="partes-row"><td>Email</td>        <td>{{ $financiador->email }}</td></tr>
    @endif
    @if($financiador->telefone)
      <tr class="partes-row"><td>Telefone</td>     <td>{{ $financiador->telefone }}</td></tr>
    @endif
    @if($financiador->endereco)
      <tr class="partes-row"><td>Endereço</td>     <td>{{ $financiador->endereco }}</td></tr>
    @endif
  </table>
</div>

<div class="sec-title">Beneficiário (aluno)</div>
<div class="partes-box">
  <table>
    <tr class="partes-row"><td>Nome do Aluno</td>  <td>{{ $userNome }}</td></tr>
    @if($numAluno)
      <tr class="partes-row"><td>Nº de Aluno</td>  <td>{{ $numAluno }}</td></tr>
    @endif
  </table>
</div>

<div class="sec-title">Pagamentos cobertos pela bolsa</div>
<table class="items">
  <thead>
    <tr>
      <th>Data</th>
      <th>Referência</th>
      <th>Descrição</th>
      <th class="right">Valor cheio</th>
      <th class="right">Bolsa</th>
    </tr>
  </thead>
  <tbody>
    @foreach($recibo->pagamentos as $p)
      @php
        $desc = $p->propina?->nome ?? $p->emolumento?->nome ?? ($tipoLabels[$p->tipo] ?? $p->tipo);
        if ($p->mes_referencia) $desc .= ' — '.$p->mes_referencia;
      @endphp
      <tr>
        <td>{{ optional($p->data_pagamento)->format('d/m/Y') }}</td>
        <td style="font-family:'Courier',monospace;">{{ $p->referencia }}</td>
        <td>{{ $desc }}</td>
        <td class="right">{{ $fmt((float)$p->valor + (float)($p->multa_valor ?? 0)) }}</td>
        <td class="right" style="color:#15803d;font-weight:700;">{{ $fmt($p->bolsa_valor) }}</td>
      </tr>
    @endforeach
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4" class="tf-label">TOTAL FINANCIADO</td>
      <td class="tf-valor">{{ $fmt($recibo->valor_total) }} AOA</td>
    </tr>
  </tfoot>
</table>

@if($recibo->observacoes)
  <div class="sec-title">Observações</div>
  <div style="padding:0 16px 8px;font-size:11px;">{{ $recibo->observacoes }}</div>
@endif

<table class="assinaturas">
  <tr>
    <td>
      <div class="ass-linha"></div>
      <div class="ass-label">Pelo Financiador</div>
    </td>
    <td>
      <div class="ass-linha"></div>
      <div class="ass-label">Pela {{ $escola['nome'] ?? 'Escola' }}</div>
    </td>
  </tr>
</table>

<div class="rodape">
  Documento gerado pelo sistema Educajá em {{ now()->format('d/m/Y H:i') }} — {{ $escola['nome'] ?? 'Escola' }}
</div>

</body>
</html>
