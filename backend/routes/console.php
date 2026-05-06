<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lembretes de pagamento — corre todos os dias às 08:00 (timezone do APP_TIMEZONE).
// Cada escola tem o seu próprio horário configurado em LembreteConfig — o command
// gera lembretes para hoje ± dias_antes/depois.
Schedule::command('lembretes:enviar')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->onOneServer();

// Facturação mensal Educajá — dia 1 de cada mês às 03:00.
Schedule::job(new \App\Jobs\GerarFacturasMensaisJob())
    ->monthlyOn(1, '03:00')
    ->withoutOverlapping()
    ->onOneServer();
