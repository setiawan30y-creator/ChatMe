<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Services\DeviceManager;
use App\Services\Otp\OtpService;
use App\Support\PhoneNumber;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Login/registrasi dengan nomor HP + OTP.
 * mode=session untuk PWA (cookie), mode=token untuk aplikasi Flutter (Bearer token).
 * @2026-Alifiandra
 */
class AuthController extends Controller
{
    public function __construct(protected OtpService $otp, protected DeviceManager $devices) {}

    public function requestOtp(Request $request): JsonResponse
    {
        $request->validate(['phone' => ['required', 'string', 'max:24']]);
        $phone = $this->phone($request->input('phone'));

        $issued = $this->otp->issue($phone, $request->ip());

        return response()->json([
            'phone' => $phone,
            'resend_in' => $issued['resend_in'],
            'expires_in' => config('chatme.otp.ttl_minutes') * 60,
            'is_new' => ! User::where('phone', $phone)->exists(),
            'debug_code' => config('chatme.otp.show_in_response') ? $issued['code'] : null,
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:24'],
            'code' => ['required', 'digits:'.config('chatme.otp.length')],
            'mode' => ['nullable', 'in:session,token'],
            'device_name' => ['nullable', 'string', 'max:80'],
        ]);
        $phone = $this->phone($data['phone']);

        $this->otp->verify($phone, $data['code']);

        $user = User::firstOrCreate(['phone' => $phone], ['locale' => 'id']);
        $user->forceFill(['phone_verified_at' => $user->phone_verified_at ?? now(), 'last_seen_at' => now()])->save();

        $device = $this->devices->start($user, $request, 'otp', $data['device_name'] ?? null);

        $response = ['user' => Present::me($user), 'device' => Present::device($device, $device->id)];

        if (($data['mode'] ?? 'session') === 'token') {
            $response['token'] = $this->devices->issueToken($user, $device);
        } else {
            $this->devices->loginSession($user, $request, $device);
        }

        return response()->json($response);
    }

    public function logout(Request $request): JsonResponse
    {
        if ($device = $this->device($request)) {
            $this->devices->revoke($device);
        }

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['message' => 'Anda telah keluar dari perangkat ini.']);
    }

    protected function phone(string $raw): string
    {
        $phone = PhoneNumber::normalize($raw);
        if (! $phone) {
            throw ValidationException::withMessages(['phone' => 'Nomor HP tidak valid. Contoh: 0812 3456 7890.']);
        }

        return $phone;
    }
}
