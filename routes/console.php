<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
| Hapus status yang sudah lebih dari 24 jam beserta filenya.
| Jalankan scheduler: php artisan schedule:work (lokal) atau cron `schedule:run` (server).
| @2026-Alifiandra
*/
Artisan::command('chatme:prune-statuses', function (\App\Services\StatusService $statuses) {
    $this->info('Status kedaluwarsa dihapus: '.$statuses->prune(5000));
})->purpose('Hapus status yang sudah kedaluwarsa (24 jam)');

\Illuminate\Support\Facades\Schedule::command('chatme:prune-statuses')->hourly();
