<?php

namespace App\Services;

use App\Events\ChatEvent;
use App\Models\Device;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Membuat, mendeteksi, dan mencabut sesi perangkat.
 * @2026-Alifiandra
 */
class DeviceManager
{
    /** @return array{platform: string, browser: string, name: string} */
    public static function describe(?string $ua): array
    {
        $ua = (string) $ua;
        $platform = match (true) {
            str_contains($ua, 'Android') => 'Android',
            (bool) preg_match('/iPhone|iPad|iPod/', $ua) => 'iOS',
            str_contains($ua, 'Windows') => 'Windows',
            str_contains($ua, 'Mac OS X') => 'macOS',
            str_contains($ua, 'CrOS') => 'ChromeOS',
            str_contains($ua, 'Linux') => 'Linux',
            default => 'Perangkat',
        };
        $browser = match (true) {
            str_contains($ua, 'Edg/') => 'Edge',
            str_contains($ua, 'OPR/') => 'Opera',
            str_contains($ua, 'SamsungBrowser') => 'Samsung Internet',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Chrome/') => 'Chrome',
            str_contains($ua, 'Safari/') => 'Safari',
            default => 'Browser',
        };

        return ['platform' => $platform, 'browser' => $browser, 'name' => "{$browser} di {$platform}"];
    }

    public function start(User $user, Request $request, string $via = 'otp', ?string $name = null): Device
    {
        $info = self::describe($request->userAgent());

        $device = $user->devices()->create([
            'name' => mb_substr($name ?: $info['name'], 0, 80),
            'platform' => $info['platform'],
            'browser' => $info['browser'],
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'ip_address' => $request->ip(),
            'linked_via' => $via,
            'last_active_at' => now(),
        ]);

        $this->enforceLimit($user, $device);

        return $device;
    }

    /** Login sesi web (PWA) untuk perangkat ini. */
    public function loginSession(User $user, Request $request, Device $device): void
    {
        Auth::guard('web')->login($user, true);
        if ($request->hasSession()) {
            $request->session()->regenerate();
            $request->session()->put('device_id', $device->id);
        }
    }

    /** Token API untuk aplikasi Flutter. */
    public function issueToken(User $user, Device $device): string
    {
        $token = $user->createToken('device:'.$device->id);
        $device->update(['token_id' => $token->accessToken->id]);

        return $token->plainTextToken;
    }

    public function revoke(Device $device): void
    {
        if ($device->revoked_at) {
            return;
        }
        $device->update(['revoked_at' => now()]);
        if ($device->token_id) {
            $device->user->tokens()->whereKey($device->token_id)->delete();
        }
        ChatEvent::dispatchTo([$device->user_id], 'device.revoked', ['device_id' => $device->id]);
    }

    /** Batas perangkat aktif: perangkat paling lama tidak aktif dicabut otomatis. */
    protected function enforceLimit(User $user, Device $current): void
    {
        $max = max(1, (int) config('chatme.devices.max_active'));
        $active = $user->devices()->whereNull('revoked_at')->where('id', '!=', $current->id)
            ->orderByDesc('last_active_at')->get();

        foreach ($active->slice($max - 1) as $old) {
            $this->revoke($old);
        }
    }
}
