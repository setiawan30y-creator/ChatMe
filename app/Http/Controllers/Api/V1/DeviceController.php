<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChatEvent;
use App\Models\Device;
use App\Models\DeviceLinkRequest;
use App\Models\User;
use App\Services\DeviceManager;
use App\Support\Present;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Perangkat tertaut: daftar, ganti nama, cabut, dan penautan lewat QR/kode.
 * Menautkan perangkat tidak membuka data selain yang boleh diakses akun tersebut.
 * @2026-Alifiandra
 */
class DeviceController extends Controller
{
    public function __construct(protected DeviceManager $devices) {}

    public function index(Request $request): JsonResponse
    {
        $current = $this->device($request);
        $list = $this->me($request)->devices()->whereNull('revoked_at')
            ->orderByDesc('last_active_at')->get()
            ->map(fn ($d) => Present::device($d, $current?->id))->values();

        return response()->json(['data' => $list]);
    }

    public function update(Request $request, Device $device): JsonResponse
    {
        abort_unless($device->user_id === $this->me($request)->id && ! $device->revoked_at, 404);
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);
        $device->update($data);

        return response()->json(['device' => Present::device($device, $this->device($request)?->id)]);
    }

    public function destroy(Request $request, Device $device): JsonResponse
    {
        abort_unless($device->user_id === $this->me($request)->id, 404);
        $this->devices->revoke($device);

        return response()->json(['message' => 'Perangkat telah diputus.']);
    }

    // ---- Penautan perangkat baru (tanpa login) ----

    public function createLink(Request $request): JsonResponse
    {
        $data = $request->validate(['device_name' => ['nullable', 'string', 'max:80']]);
        $info = DeviceManager::describe($request->userAgent());

        $secret = Str::random(40);
        do {
            $code = strtoupper(Str::random(4)).'-'.random_int(1000, 9999);
            $code = strtr($code, ['0' => 'Q', 'O' => 'Q', 'I' => 'J', 'L' => 'K']);
        } while (DeviceLinkRequest::where('code', $code)->exists());

        $link = DeviceLinkRequest::create([
            'code' => $code,
            'secret_hash' => Hash::make($secret),
            'device_name' => mb_substr($data['device_name'] ?? $info['name'], 0, 80),
            'platform' => $info['platform'],
            'browser' => $info['browser'],
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'ip_address' => $request->ip(),
            'expires_at' => now()->addSeconds(config('chatme.devices.link_ttl_seconds')),
        ]);

        $writer = new Writer(new ImageRenderer(new RendererStyle(280, 1), new SvgImageBackEnd));

        return response()->json([
            'id' => $link->id,
            'secret' => $secret,
            'code' => $code,
            'qr_svg' => $writer->writeString('chatme-link:'.$code),
            'expires_at' => $link->expires_at->toIso8601String(),
            'expires_in' => config('chatme.devices.link_ttl_seconds'),
        ], 201);
    }

    /** Perangkat baru menanyakan status; saat disetujui, sesi dibuat sekali saja. */
    public function linkStatus(Request $request, DeviceLinkRequest $link): JsonResponse
    {
        $data = $request->validate([
            'secret' => ['required', 'string'],
            'mode' => ['nullable', 'in:session,token'],
        ]);
        abort_unless(Hash::check($data['secret'], $link->secret_hash), 404);

        if ($link->status === 'pending' && $link->isExpired()) {
            return response()->json(['status' => 'expired']);
        }
        if ($link->status !== 'approved') {
            return response()->json(['status' => $link->status]);
        }

        $result = DB::transaction(function () use ($link, $request, $data) {
            $fresh = DeviceLinkRequest::whereKey($link->id)->lockForUpdate()->first();
            if ($fresh->status !== 'approved') {
                return null;
            }
            $user = User::findOrFail($fresh->approved_by);
            $device = $this->devices->start($user, $request, 'qr', $fresh->device_name);
            $fresh->update(['status' => 'consumed', 'device_id' => $device->id]);

            return [$user, $device];
        });

        if (! $result) {
            return response()->json(['status' => 'consumed']);
        }
        [$user, $device] = $result;

        $response = ['status' => 'linked', 'user' => Present::me($user), 'device' => Present::device($device, $device->id)];
        if (($data['mode'] ?? 'session') === 'token') {
            $response['token'] = $this->devices->issueToken($user, $device);
        } else {
            $this->devices->loginSession($user, $request, $device);
        }

        ChatEvent::dispatchTo([$user->id], 'device.linked', ['device' => Present::device($device)]);

        return response()->json($response);
    }

    // ---- Persetujuan dari perangkat yang sudah login ----

    public function previewLink(Request $request): JsonResponse
    {
        $link = $this->findPendingLink($request);

        return response()->json(['link' => [
            'code' => $link->code,
            'device_name' => $link->device_name,
            'platform' => $link->platform,
            'browser' => $link->browser,
            'ip_address' => $link->ip_address,
            'expires_at' => $link->expires_at->toIso8601String(),
        ]]);
    }

    public function approveLink(Request $request): JsonResponse
    {
        $link = $this->findPendingLink($request);
        $link->update(['status' => 'approved', 'approved_by' => $this->me($request)->id]);

        return response()->json(['message' => 'Perangkat disetujui. Perangkat baru akan masuk dalam beberapa detik.']);
    }

    protected function findPendingLink(Request $request): DeviceLinkRequest
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:40']]);
        $code = strtoupper(trim(str_replace('chatme-link:', '', $data['code'])));
        if (strlen($code) === 8 && ! str_contains($code, '-')) {
            $code = substr($code, 0, 4).'-'.substr($code, 4);
        }

        $link = DeviceLinkRequest::where('code', $code)->where('status', 'pending')->first();
        abort_if(! $link || $link->isExpired(), 422, 'Kode penautan tidak valid atau sudah kedaluwarsa.');

        return $link;
    }
}
