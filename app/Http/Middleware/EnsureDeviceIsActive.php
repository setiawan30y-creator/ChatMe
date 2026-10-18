<?php

namespace App\Http\Middleware;

use App\Models\Device;
use App\Services\DeviceManager;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Setiap permintaan harus berasal dari perangkat yang belum dicabut.
 * @2026-Alifiandra
 */
class EnsureDeviceIsActive
{
    public function __construct(protected DeviceManager $devices) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return $next($request);
        }

        $token = $user->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $device = Device::where('token_id', $token->id)->first();
        } else {
            $deviceId = $request->hasSession() ? $request->session()->get('device_id') : null;
            $device = $deviceId ? Device::find($deviceId) : null;
            if (! $device && $request->hasSession()) {
                // Sesi lama tanpa catatan perangkat: daftarkan sebagai perangkat baru.
                $device = $this->devices->start($user, $request, 'otp');
                $request->session()->put('device_id', $device->id);
            }
        }

        if (! $device || $device->user_id !== $user->id || $device->revoked_at) {
            if ($request->hasSession()) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            return response()->json(['message' => 'Perangkat ini sudah tidak tertaut. Masuk kembali.', 'code' => 'device_revoked'], 401);
        }

        if (! $device->last_active_at || $device->last_active_at->lt(now()->subMinute())) {
            $device->forceFill(['last_active_at' => now(), 'ip_address' => $request->ip()])->save();
            $user->forceFill(['last_seen_at' => now()])->save();
        }

        $request->attributes->set('device', $device);

        return $next($request);
    }
}
