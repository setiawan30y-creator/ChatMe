<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChatEvent;
use App\Models\Status;
use App\Models\User;
use App\Services\ChatService;
use App\Services\StatusService;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Status 24 jam — semua akses diperiksa di server.
 * @2026-Alifiandra
 */
class StatusController extends Controller
{
    public const COLORS = ['#4A2D6E', '#2F7D6D', '#A23E5C', '#3E6AA8', '#9A5B2E', '#7C6A1E', '#1F1A2E', '#C2622F'];

    public const FONTS = ['sans', 'serif', 'mono', 'script'];

    public function __construct(protected StatusService $statuses, protected ChatService $chat) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->statuses->feed($this->me($request)));
    }

    public function store(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $data = $request->validate([
            'type' => ['required', 'in:text,image,video'],
            'body' => ['nullable', 'string', 'max:700', 'required_if:type,text'],
            'color' => ['nullable', 'in:'.implode(',', self::COLORS)],
            'font' => ['nullable', 'in:'.implode(',', self::FONTS)],
            'file' => ['required_unless:type,text', 'file', 'max:'.config('chatme.uploads.max_kb'),
                'mimetypes:image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime'],
        ], [
            'body.required_if' => 'Tulis sesuatu untuk status Anda.',
            'file.required_unless' => 'Pilih foto atau video.',
            'file.mimetypes' => 'Status hanya mendukung foto atau video.',
        ]);

        $this->statuses->prune(50);

        $status = DB::transaction(function () use ($me, $data, $request) {
            $attrs = [
                'user_id' => $me->id,
                'type' => $data['type'],
                'body' => isset($data['body']) ? trim($data['body']) ?: null : null,
                'audience' => $me->setting('status_privacy') ?: 'contacts',
                'expires_at' => now()->addHours(Status::TTL_HOURS),
            ];

            if ($data['type'] === 'text') {
                $attrs['meta'] = ['color' => $data['color'] ?? self::COLORS[0], 'font' => $data['font'] ?? 'sans'];
            } else {
                $file = $request->file('file');
                $mime = (string) $file->getMimeType();
                abort_unless(str_starts_with($mime, $data['type'].'/'), 422, 'Jenis file tidak sesuai.');
                $attrs['media_path'] = $file->store('statuses/'.now()->format('Y/m'), 'local');
                $attrs['media_mime'] = $mime;
                $attrs['media_size'] = (int) $file->getSize();
            }

            $status = Status::create($attrs);
            $status->recipients()->sync($this->statuses->audienceFor($me));

            return $status;
        });

        $this->statuses->publish($status);

        return response()->json([
            'status' => $this->statuses->present($status->loadCount('views'), $me),
            'recipients' => $status->recipients()->count(),
        ], 201);
    }

    public function destroy(Request $request, Status $status): JsonResponse
    {
        $me = $this->me($request);
        abort_unless($status->user_id === $me->id, 404);

        $recipientIds = $status->recipients()->pluck('users.id')->all();
        $status->deleteMedia();
        $status->delete();
        ChatEvent::dispatchTo(array_merge($recipientIds, [$me->id]), 'status.deleted', ['status_id' => $status->id, 'user_id' => $me->id]);

        return response()->json(['message' => 'Status dihapus.']);
    }

    public function view(Request $request, Status $status): JsonResponse
    {
        $me = $this->me($request);
        abort_unless($status->canBeSeenBy($me), 404, 'Status tidak tersedia.');
        $this->statuses->recordView($status, $me);

        return response()->json(['ok' => true]);
    }

    public function viewers(Request $request, Status $status): JsonResponse
    {
        $me = $this->me($request);
        abort_unless($status->user_id === $me->id, 404);

        $views = $status->views()->with('user')->orderByDesc('viewed_at')->get();

        return response()->json(['data' => $views->map(fn ($v) => [
            'user' => $v->user ? Present::user($v->user) : null,
            'viewed_at' => $v->viewed_at->toIso8601String(),
        ])->values()]);
    }

    public function media(Request $request, Status $status): Response
    {
        $me = $this->me($request);
        abort_unless($status->media_path && $status->canBeSeenBy($me), 404);
        abort_unless(Storage::disk('local')->exists($status->media_path), 404);

        return Storage::disk('local')->response($status->media_path, null, [
            'Content-Type' => $status->media_mime,
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Balasan status dikirim sebagai pesan chat pribadi dengan kutipan status. */
    public function reply(Request $request, Status $status): JsonResponse
    {
        $me = $this->me($request);
        abort_unless($status->canBeSeenBy($me), 404, 'Status tidak tersedia.');
        abort_if($status->user_id === $me->id, 422, 'Tidak dapat membalas status sendiri.');
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'client_uuid' => ['nullable', 'uuid'],
        ]);

        $owner = $status->user;
        $conversation = $this->chat->findOrCreateDirect($me, $owner);
        $message = $this->chat->send($conversation, $me, [
            'body' => $data['body'],
            'client_uuid' => $data['client_uuid'] ?? null,
            'meta' => ['status_reply' => [
                'status_id' => $status->id,
                'type' => $status->type,
                'preview' => $status->preview(),
                'owner_id' => $owner->id,
                'owner_name' => $owner->displayName(),
                'color' => $status->meta['color'] ?? null,
                'thumb' => $status->type === 'image' ? $status->mediaUrl() : null,
            ]],
        ]);
        $this->chat->publishConversation($conversation);

        return response()->json([
            'message' => Present::message($message->fresh(), $me),
            'conversation_id' => $conversation->id,
        ], 201);
    }

    /** Bisukan / bunyikan status dari pengguna tertentu. */
    public function mute(Request $request, User $user): JsonResponse
    {
        $me = $this->me($request);
        $data = $request->validate(['muted' => ['required', 'boolean']]);
        $list = array_map('intval', $me->setting('status_muted') ?? []);
        $list = $data['muted'] ? array_values(array_unique([...$list, $user->id])) : array_values(array_diff($list, [$user->id]));
        $me->update(['settings' => array_merge($me->allSettings(), ['status_muted' => $list])]);

        return response()->json(['user' => Present::me($me->fresh())]);
    }
}
