<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\User;
use App\Support\PhoneNumber;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pencarian kontak berdasarkan nomor HP atau nama.
 * @2026-Alifiandra
 */
class UserController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:2', 'max:60']]);
        $me = $this->me($request);
        $q = trim($request->string('q'));

        $query = User::query()->whereKeyNot($me->id)->whereNotNull('name');

        $digits = preg_replace('/\D+/', '', $q);
        if (strlen($digits) >= 4 && strlen($digits) >= strlen(preg_replace('/[\s+\-()]/', '', $q))) {
            // Privasi: nomor hanya ditemukan dengan pencocokan penuh, bukan sebagian.
            $query->where('phone', PhoneNumber::normalize($q) ?? '-');
        } else {
            $query->where('name', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $q).'%');
        }

        return response()->json([
            'data' => $query->orderBy('name')->limit(20)->get()->map(fn ($u) => Present::user($u))->values(),
        ]);
    }
}
