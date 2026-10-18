<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Conversation;
use App\Models\User;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Profil, preferensi, dan foto profil.
 * @2026-Alifiandra
 */
class MeController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => Present::me($this->me($request)),
            'device' => ($d = $this->device($request)) ? Present::device($d, $d->id) : null,
            'app' => ['name' => config('chatme.name'), 'signature' => config('chatme.signature')],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $this->me($request);
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'min:2', 'max:80'],
            'about' => ['sometimes', 'nullable', 'string', 'max:140'],
            'locale' => ['sometimes', 'in:id,en,ja,zh,ko,ar,es,fr,de,ru'],
            'settings' => ['sometimes', 'array'],
            'settings.notify_mode' => ['sometimes', 'in:normal,sound,silent,private'],
            'settings.notify_preview' => ['sometimes', 'boolean'],
            'settings.read_receipts' => ['sometimes', 'boolean'],
            'settings.theme' => ['sometimes', 'in:system,light,dark'],
            'settings.enter_to_send' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['settings'])) {
            $data['settings'] = array_intersect_key(array_merge($user->allSettings(), $data['settings']), User::DEFAULT_SETTINGS);
        }

        $user->update($data);

        return response()->json(['user' => Present::me($user->fresh())]);
    }

    public function avatar(Request $request): JsonResponse
    {
        $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.config('chatme.uploads.avatar_max_kb')]]);
        $user = $this->me($request);
        $user->deleteAvatarFile();
        $user->update(['avatar_path' => $request->file('avatar')->store('avatars', 'local')]);

        return response()->json(['user' => Present::me($user->fresh())]);
    }

    public function removeAvatar(Request $request): JsonResponse
    {
        $user = $this->me($request);
        $user->deleteAvatarFile();
        $user->update(['avatar_path' => null]);

        return response()->json(['user' => Present::me($user->fresh())]);
    }

    public function userAvatar(User $user): Response
    {
        abort_unless($user->avatar_path && Storage::disk('local')->exists($user->avatar_path), 404);

        return Storage::disk('local')->response($user->avatar_path, null, ['Cache-Control' => 'private, max-age=86400']);
    }

    public function groupAvatar(Request $request, Conversation $conversation): Response
    {
        $this->membership($conversation, $this->me($request));
        abort_unless($conversation->avatar_path && Storage::disk('local')->exists($conversation->avatar_path), 404);

        return Storage::disk('local')->response($conversation->avatar_path, null, ['Cache-Control' => 'private, max-age=86400']);
    }
}
