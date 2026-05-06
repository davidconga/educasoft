<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<title>Recibo de Salário — {{ $folha->referencia }}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Helvetica',Arial,sans-serif;font-size:12px;color:#1e293b;}
  .doc{max-width:780px;margin:0 auto;padding:20px;}
  .header{display:flex;border-bottom:2px solid #1d4ed8;padding-bottom:12px;margin-bottom:14px;}
  .header td{padding:0;}
  .logo{width:54px;height:54px;border-radius:8px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#1d4ed8;}
  .escola-info{padding-left:14px;flex:1;}
  .escola-nome{font-size:16px;font-weight:700;color:#1d4ed8;}
  .escola-sub{font-size:10px;color:#64748b;margin-top:2px;}
  .doc-type{text-align:right;}
  .doc-label{font-size:14px;font-weight:700;color:#1e293b;}
  .doc-ref{font-size:10px;color:#64748b;margin-top:2px;font-family:monospace;}

  .meta-row{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px;margin-bottom:14px;display:table;width:100%;}
  .meta-cell{display:table-cell;width:25%;padding:0 6px;}
  .meta-label{font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;}
  .meta-value{font-size:11px;font-weight:600;color:#1e293b;margin-top:2px;}

  .sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#64748b;margin-top:14px;margin-bottom:6px;}
  .info-grid{border:1px solid #e2e8f0;border-radius:6px;padding:10px;display:table;width:100%;}
  .info-row{display:table-row;}
  .info-cell{display:table-cell;padding:3px 8px;font-size:11px;}
  .info-cell-label{color:#64748b;width:30%;}
  .info-cell-val{font-weight:600;}

  table.calc{width:100%;border-collapse:collapse;margin-top:6px;}
  table.calc th{background:#1d4ed8;color:#fff;padding:6px 10px;text-align:left;font-size:10px;font-weight:600;text-transform:uppercase;}
  table.calc td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:11px;}
  table.calc td.right{text-align:right;font-weight:600;}
  table.calc tr.total td{border-top:2px solid #1d4ed8;font-weight:700;background:#eff6ff;}
  table.calc tr.liquido td{background:#dcfce7;color:#166534;font-weight:800;font-size:14px;}

  .footer{margin-top:30px;display:table;width:100%;}
  .ass{display:table-cell;width:50%;text-align:center;padding-top:30px;}
  .ass-line{border-top:1px solid #94a3b8;margin:0 20px 4px;}
  .ass-label{font-size:10px;color:#64748b;}
  .rodape{margin-top:20px;text-align:center;font-size:9px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:10px;}
</style>
</head>
<body>
@php
  $func = $folha->funcionario;
  $fmt = fn($v) => number_format((float)$v, 2, ',', '.') . ' Kz';
@endphp

<div class="doc">
  <table class="header" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:60px;">
        @if(!empty($escola['logo']))
          <img src="{{ public_path('storage/' . $escola['logo']) }}" style="width:54px;height:54px;border-radius:8px;object-fit:contain;"/>
        @else
          <div class="logo">{{ strtoupper(substr($escola['nome'] ?? 'E', 0, 1)) }}</div>
        @endif
      </td>
      <td class="escola-info">
        <div class="escola-nome">{{ $escola['nome'] }}</div>
        <div class="escola-sub">
          {{ $escola['endereco'] ?? '' }}
          @if(!empty($escola['nif'])) · NIF {{ $escola['nif'] }} @endif
          @if(!empty($escola['telefone'])) · {{ $escola['telefone'] }} @endif
        </div>
      </td>
      <td class="doc-type">
        <div class="doc-label">RECIBO DE SALÁRIO</div>
        <div class="doc-ref">Nº {{ $folha->referencia }}</div>
        <div class="doc-ref">{{ $mesNome }} {{ $folha->ano }}</div>
      </td>
    </tr>
  </table>

  <div class="meta-row">
    <div class="meta-cell">
      <div class="meta-label">Período</div>
      <div class="meta-value">{{ $mesNome }} {{ $folha->ano }}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Estado</div>
      <div class="meta-value">{{ ucfirst($folha->estado) }}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Data Pagamento</div>
      <div class="meta-value">{{ $folha->data_pagamento ? \Carbon\Carbon::parse($folha->data_pagamento)->format('d/m/Y') : '—' }}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Método</div>
      <div class="meta-value">{{ $folha->metodo ? ucfirst($folha->metodo) : '—' }}</div>
    </div>
  </div>

  <div class="sec-title">Funcionário</div>
  <div class="info-grid">
    <div class="info-row">
      <div class="info-cell info-cell-label">Nome</div>
      <div class="info-cell info-cell-val">{{ $func->nome }}</div>
      <div class="info-cell info-cell-label">BI</div>
      <div class="info-cell info-cell-val">{{ $func->bi ?? '—' }}</div>
    </div>
    <div class="info-row">
      <div class="info-cell info-cell-label">Cargo</div>
      <div class="info-cell info-cell-val">{{ $func->cargo }}</div>
      <div class="info-cell info-cell-label">Departamento</div>
      <div class="info-cell info-cell-val">{{ $func->departamento ?? '—' }}</div>
    </div>
    <div class="info-row">
      <div class="info-cell info-cell-label">Tipo Contrato</div>
      <div class="info-cell info-cell-val">{{ ucfirst($func->tipo_contrato ?? '—') }}</div>
      <div class="info-cell info-cell-label">Admissão</div>
      <div class="info-cell info-cell-val">{{ $func->data_admissao ? \Carbon\Carbon::parse($func->data_admissao)->format('d/m/Y') : '—' }}</div>
    </div>
    @if($func->iban)
    <div class="info-row">
      <div class="info-cell info-cell-label">IBAN</div>
      <div class="info-cell info-cell-val">{{ $func->iban }}</div>
      <div class="info-cell info-cell-label">Banco</div>
      <div class="info-cell info-cell-val">{{ $func->banco ?? '—' }}</div>
    </div>
    @endif
  </div>

  <div class="sec-title">Apuramento</div>
  <table class="calc">
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:right;width:140px;">Valor</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Salário base</td>
        <td class="right">{{ $fmt($folha->salario_base) }}</td>
      </tr>
      @foreach(($folha->subsidios ?? []) as $s)
        <tr>
          <td style="color:#16a34a;">+ {{ $s['nome'] ?? 'Subsídio' }}</td>
          <td class="right" style="color:#16a34a;">{{ $fmt($s['valor'] ?? 0) }}</td>
        </tr>
      @endforeach
      @foreach(($folha->descontos ?? []) as $d)
        <tr>
          <td style="color:#dc2626;">− {{ $d['nome'] ?? 'Desconto' }}</td>
          <td class="right" style="color:#dc2626;">{{ $fmt($d['valor'] ?? 0) }}</td>
        </tr>
      @endforeach
      <tr class="total">
        <td>Total subsídios</td>
        <td class="right">{{ $fmt($folha->total_subsidios) }}</td>
      </tr>
      <tr class="total">
        <td>Total descontos</td>
        <td class="right">{{ $fmt($folha->total_descontos) }}</td>
      </tr>
      <tr class="liquido">
        <td>LÍQUIDO A RECEBER</td>
        <td class="right">{{ $fmt($folha->liquido) }}</td>
      </tr>
    </tbody>
  </table>

  @if($folha->observacao)
    <div class="sec-title">Observações</div>
    <div style="font-size:11px;color:#475569;padding:8px;background:#f8fafc;border-radius:6px;">{{ $folha->observacao }}</div>
  @endif

  <div class="footer">
    <div class="ass">
      <div class="ass-line"></div>
      <div class="ass-label">Tesoureiro / RH</div>
    </div>
    <div class="ass">
      <div class="ass-line"></div>
      <div class="ass-label">Funcionário</div>
    </div>
  </div>

  <div class="rodape">
    Documento emitido electronicamente pelo sistema Educajá · {{ now()->format('d/m/Y H:i') }}
  </div>
</div>
</body>
</html>
