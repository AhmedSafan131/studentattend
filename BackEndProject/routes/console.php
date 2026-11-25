<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(\App\Services\Attendance\FlexibleSessionExpiryService::class)->expireDueSessions())
    ->name('close-expired-attendance-sessions')
    ->everyMinute()
    ->withoutOverlapping();
