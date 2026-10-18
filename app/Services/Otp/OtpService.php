<?php

namespace App\Services\Otp;

use App\Models\PhoneVerification;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Penerbitan dan verifikasi OTP: masa berlaku, batas percobaan, dan jeda kirim ulang.
 * @2026-Alifiandra
 */
class OtpService
{
    /** @return array{verification: PhoneVerification, code: string, resend_in: int} */
    public function issue(string $phone, ?string $ip = null): array
    {
        $cfg = config('chatme.otp');

        $recent = PhoneVerification::where('phone', $phone)
            ->whereNull('consumed_at')
            ->where('created_at', '>', now()->subSeconds($cfg['resend_seconds']))
            ->latest('id')->first();

        if ($recent) {
            $wait = $cfg['resend_seconds'] - (int) $recent->created_at->diffInSeconds(now());
            throw ValidationException::withMessages([
                'phone' => "Tunggu {$wait} detik sebelum meminta kode baru.",
            ])->status(429);
        }

        $code = str_pad((string) random_int(0, 10 ** $cfg['length'] - 1), $cfg['length'], '0', STR_PAD_LEFT);

        PhoneVerification::where('phone', $phone)->whereNull('consumed_at')->update(['consumed_at' => now()]);

        $verification = PhoneVerification::create([
            'phone' => $phone,
            'code_hash' => Hash::make($code),
            'ip_address' => $ip,
            'expires_at' => now()->addMinutes($cfg['ttl_minutes']),
        ]);

        $this->deliver($phone, $code);

        return ['verification' => $verification, 'code' => $code, 'resend_in' => $cfg['resend_seconds']];
    }

    public function verify(string $phone, string $code): bool
    {
        $verification = PhoneVerification::where('phone', $phone)
            ->whereNull('consumed_at')
            ->latest('id')->first();

        if (! $verification || $verification->expires_at->isPast()) {
            throw ValidationException::withMessages(['code' => 'Kode sudah kedaluwarsa. Minta kode baru.']);
        }

        if ($verification->attempts >= config('chatme.otp.max_attempts')) {
            $verification->update(['consumed_at' => now()]);
            throw ValidationException::withMessages(['code' => 'Terlalu banyak percobaan. Minta kode baru.']);
        }

        if (! Hash::check($code, $verification->code_hash)) {
            $verification->increment('attempts');
            $left = config('chatme.otp.max_attempts') - $verification->attempts;
            throw ValidationException::withMessages(['code' => "Kode salah. Sisa percobaan: {$left}."]);
        }

        $verification->update(['consumed_at' => now()]);

        return true;
    }

    protected function deliver(string $phone, string $code): void
    {
        $cfg = config('chatme.otp');

        if ($cfg['driver'] === 'http' && $cfg['http']['url']) {
            $message = strtr($cfg['http']['message'], [':code' => $code, ':minutes' => $cfg['ttl_minutes']]);
            try {
                Http::timeout(10)
                    ->withToken((string) $cfg['http']['token'])
                    ->acceptJson()
                    ->post($cfg['http']['url'], ['phone' => $phone, 'message' => $message, 'code' => $code])
                    ->throw();

                return;
            } catch (\Throwable $e) {
                Log::error('OTP gateway gagal', ['phone' => $phone, 'error' => $e->getMessage()]);
                throw ValidationException::withMessages(['phone' => 'Kode tidak dapat dikirim saat ini. Coba lagi sebentar.']);
            }
        }

        Log::info("[ChatMe OTP] +{$phone} => {$code}");
    }
}
