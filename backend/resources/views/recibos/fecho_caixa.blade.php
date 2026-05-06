<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>Fecho de Caixa {{ $sessao->codigo }}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1f2937; margin: 28px 32px; }
  .header { display: table; width: 100%; margin-bottom: 18px; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px; }
  .header > div { display: table-cell; vertical-align: middle; }
  .logo-cell { width: 56px; }
  .logo-box { width: 50px; height: 50px; background: #1d4ed8; color: #fff; text-align: center; vertical-align: middle; font-size: 22px; font-weight: 800; line-height: 50px; border-radius: 6px; }
  .escola-nome { font-size: 17px; font-weight: 800; color: #1e293b; }
  .escola-sub { font-size: 10px; color: #64748b; }
  .meta { text-align: right; }
  .doc-title { font-size: 22px; font-weight: 800; color: #1d4ed8; }
  .doc-sub { font-size: 10px; color: #64748b; margin-top: 2px; }

  .grid { display: table; width: 100%; margin-top: 12px; border-collapse: collapse; }
  .grid > div { display: table-cell; width: 50%; vertical-align: top; padding: 0 6px; }
  .grid > div:first-child { padding-left: 0; }
  .grid > div:last-child { padding-right: 0; }
  .label { font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 4px; }
  .box { border: 1px solid #e5e7eb; padding: 10px 12px; border-radius: 6px; background: #f8fafc; }
  .box .v { font-size: 14px; font-weight: 700; color: #0f172a; }

  .resumo { width: 100%; margin-top: 18px; border-collapse: collapse; }
  .resumo td { padding: 7px 12px; font-size: 11px; }
  .resumo tr td:first-child { color: #475569; }
  .resumo tr td:last-child { text-align: right; font-weight: 700; }
  .resumo .sep td { border-top: 1px solid #e5e7eb; }
  .resumo .total td { background: #1e40af; color: #fff; font-size: 14px; font-weight: 800; padding: 10px 12px; }

  .dif-positivo { color: #15803d; }
  .dif-negativo { color: #b91c1c; }
  .dif-zero { color: #475569; }

  table.movimentos { width: 100%; border-collapse: collapse; margin-top: 18px; }
  table.movimentos th { background: #f3f4f6; font-size: 9px; text-transform: uppercase; color: #4b5563; padding: 6px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  table.movimentos td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-size: 10px; }
  .right { text-align: right; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .b-pagamento { background: #d1fae5; color: #065f46; }
  .b-reforco { background: #dbeafe; color: #1e3a8a; }
  .b-sangria { background: #fef3c7; color: #92400e; }
  .b-despesa { background: #fee2e2; color: #991b1b; }

  .ass { display: table; width: 100%; margin-top: 32px; }
  .ass > div { display: table-cell; width: 50%; vertical-align: top; padding-right: 30px; }
  .ass-linha { border-top: 1px solid #94a3b8; margin-top: 36px; padding-top: 6px; text-align: center; font-size: 10px; color: #64748b; }

  .footer { position: fixed; bottom: 16px; left: 32px; right: 32px; padding-top: 6px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>

<div class="header">
  <div class="logo-cell">
    @php $logo = ($escola['logo'] ?? null) ? public_path('storage/' . $escola['logo']) : null; @endphp
    @if($logo && file_exists($logo))
      <img src="{{ $logo }}" style="width:50px;height:50px;border-radius:6px;object-fit:contain;border:1px solid #e5e7eb;"/>
    @else
      <div class="logo-box">{{ strtoupper(substr($escola['nome'] ?? 'E', 0, 1)) }}</div>
    @endif
  </div>
  <div>
    <div class="escola-nome">{{ $escola['nome'] ?? 'Educajá' }}</div>
    <div class="escola-sub">
      @if(!empty($escola['nif'])) NIF: {{ $escola['nif'] }} · @endif
      {{ $escola['email'] ?? '' }} {{ !empty($escola['telefone']) ? ' · ' . $escola['telefone'] : '' }}
    </div>
  </div>
  <div class="meta">
    <div class="doc-title">FECHO DE CAIXA</div>
    <div class="doc-sub">Sessão <strong>{{ $sessao->codigo }}</strong></div>
    <div class="doc-sub">Emitido em {{ now()->format('d/m/Y H:i') }}</div>
  </div>
</div>

<div class="grid">
  <div>
    <div class="label">Operador</div>
    <div class="box">
      <div class="v">{{ $sessao->operador_nome }}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">{{ $sessao->nome_caixa }}</div>
    </div>
  </div>
  <div>
    <div class="label">Período</div>
    <div class="box">
      <div style="font-size:11px"><strong>Aberta:</strong> {{ \Illuminate\Support\Carbon::parse($sessao->abriu_em)->format('d/m/Y H:i') }}</div>
      <div style="font-size:11px;margin-top:2px"><strong>Fechada:</strong>
        {{ $sessao->fechou_em ? \Illuminate\Support\Carbon::parse($sessao->fechou_em)->format('d/m/Y H:i') : '— em curso —' }}
      </div>
    </div>
  </div>
</div>

@php
  $movs = $sessao->movimentos;
  $pagamentos = $movs->where('tipo','pagamento');
  $reforcos   = $movs->where('tipo','reforco');
  $sangrias   = $movs->where('tipo','sangria');
  $despesas   = $movs->where('tipo','despesa');
  $sumPag = (float) $pagamentos->sum('valor');
  $sumRef = (float) $reforcos->sum('valor');
  $sumSan = (float) $sangrias->sum('valor');
  $sumDes = (float) $despesas->sum('valor');
  $fundo  = (float) $sessao->fundo_inicial;
  $esperado = $fundo + $sumPag + $sumRef - $sumSan - $sumDes;
  $contado = (float) ($sessao->total_contado ?? 0);
  $dif = round($contado - $esperado, 2);
  $difClass = $dif > 0.001 ? 'dif-positivo' : ($dif < -0.001 ? 'dif-negativo' : 'dif-zero');
  $difTitle = $dif > 0.001 ? 'Sobra' : ($dif < -0.001 ? 'Falta' : 'Sem diferença');
@endphp

<table class="resumo">
  <tr><td>Fundo de maneio inicial</td><td>{{ number_format($fundo, 2, ',', '.') }} Kz</td></tr>
  <tr><td>(+) Pagamentos cobrados ({{ $pagamentos->count() }})</td><td>{{ number_format($sumPag, 2, ',', '.') }} Kz</td></tr>
  <tr><td>(+) Reforços ({{ $reforcos->count() }})</td><td>{{ number_format($sumRef, 2, ',', '.') }} Kz</td></tr>
  <tr><td>(−) Sangrias ({{ $sangrias->count() }})</td><td>−{{ number_format($sumSan, 2, ',', '.') }} Kz</td></tr>
  <tr><td>(−) Despesas ({{ $despesas->count() }})</td><td>−{{ number_format($sumDes, 2, ',', '.') }} Kz</td></tr>
  <tr class="sep total"><td>Total esperado em caixa</td><td>{{ number_format($esperado, 2, ',', '.') }} Kz</td></tr>

  @if($sessao->fechou_em)
    <tr><td>Total contado (físico)</td><td>{{ number_format($contado, 2, ',', '.') }} Kz</td></tr>
    <tr class="sep"><td><strong>Diferença ({{ $difTitle }})</strong></td>
      <td class="{{ $difClass }}"><strong>{{ $dif >= 0 ? '+' : '' }}{{ number_format($dif, 2, ',', '.') }} Kz</strong></td>
    </tr>
  @endif
</table>

@if($sessao->observacoes_abertura || $sessao->observacoes_fecho)
  <div style="margin-top:14px">
    <div class="label">Observações</div>
    <div class="box" style="font-size:10px">
      @if($sessao->observacoes_abertura)
        <div><strong>Abertura:</strong> {{ $sessao->observacoes_abertura }}</div>
      @endif
      @if($sessao->observacoes_fecho)
        <div style="margin-top:4px"><strong>Fecho:</strong> {{ $sessao->observacoes_fecho }}</div>
      @endif
    </div>
  </div>
@endif

<div style="margin-top:22px">
  <div class="label">Movimentos detalhados ({{ $movs->count() }})</div>
  @if($movs->count() === 0)
    <div class="box" style="text-align:center;color:#94a3b8">Sem movimentos.</div>
  @else
    <table class="movimentos">
      <thead>
        <tr>
          <th>Hora</th>
          <th>Tipo</th>
          <th>Descrição</th>
          <th>Método</th>
          <th class="right">Valor</th>
        </tr>
      </thead>
      <tbody>
        @foreach($movs->sortBy('created_at') as $m)
          <tr>
            <td>{{ \Illuminate\Support\Carbon::parse($m->created_at)->format('H:i') }}</td>
            <td><span class="badge b-{{ $m->tipo }}">{{ ucfirst($m->tipo) }}</span></td>
            <td>{{ $m->descricao ?: '—' }}</td>
            <td>{{ $m->metodo ?: '—' }}</td>
            <td class="right" style="color: {{ $m->sentido < 0 ? '#b91c1c' : '#15803d' }}">
              {{ $m->sentido < 0 ? '−' : '+' }}{{ number_format((float) $m->valor, 2, ',', '.') }} Kz
            </td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endif
</div>

@php
  $codigoEsc = $escola['codigo'] ?? 'esc';
  $qrData    = url('/verificar-fecho-caixa/' . $codigoEsc . '/' . rawurlencode($sessao->codigo));
  $qrUrl     = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&qzone=2&data=' . urlencode($qrData);
@endphp
<table style="width:100%; margin-top:32px;">
  <tr>
    <td style="width:38%; vertical-align:bottom;">
      <div style="border-top:1px solid #94a3b8; margin-top:36px; padding-top:6px; text-align:center; font-size:10px; color:#64748b;">Tesoureiro(a) / Operador</div>
    </td>
    <td style="width:38%; vertical-align:bottom;">
      <div style="border-top:1px solid #94a3b8; margin-top:36px; padding-top:6px; text-align:center; font-size:10px; color:#64748b;">Conferido por</div>
    </td>
    <td style="width:24%; text-align:center; vertical-align:bottom;">
      <img src="{{ $qrUrl }}" alt="QR" style="width:80px;height:80px;border:1px solid #e5e7eb;padding:3px;border-radius:4px;background:#fff;"/>
      <div style="font-size:8px;color:#94a3b8;margin-top:2px;">{{ $sessao->codigo }}</div>
    </td>
  </tr>
</table>

<div class="footer">
  Documento gerado pelo sistema Educajá em {{ now()->format('d/m/Y H:i') }} — {{ $escola['nome'] ?? '' }}
</div>

</body>
</html>
