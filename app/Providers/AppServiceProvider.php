<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

/**
 * @2026-Alifiandra
 */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Perlindungan brute force & penyalahgunaan OTP.
        RateLimiter::for('otp', fn (Request $r) => [
            Limit::perMinute(5)->by('otp-ip:'.$r->ip()),
            Limit::perHour(10)->by('otp-phone:'.preg_replace('/\D/', '', (string) $r->input('phone'))),
        ]);
        RateLimiter::for('otp-verify', fn (Request $r) => Limit::perMinute(10)->by('otpv:'.$r->ip()));
        RateLimiter::for('link', fn (Request $r) => Limit::perMinute(6)->by('link:'.$r->ip()));
        RateLimiter::for('link-poll', fn (Request $r) => Limit::perMinute(60)->by('linkp:'.$r->ip()));
        RateLimiter::for('api', fn (Request $r) => Limit::perMinute(300)->by('api:'.($r->user()?->id ?: $r->ip())));
        RateLimiter::for('send', fn (Request $r) => Limit::perMinute(60)->by('send:'.($r->user()?->id ?: $r->ip())));
    }
}
