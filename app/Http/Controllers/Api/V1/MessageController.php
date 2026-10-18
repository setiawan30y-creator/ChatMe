<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\MessageAttachment;
use App\Services\ChatService;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pesan: riwayat berbasis cursor, kirim (idempoten), edit, hapus untuk semua, reaksi, lampiran.
 * @2026-Alifiandra
 */
class MessageController extends Controller
{
    public function __construct(protected ChatService $chat) {}

    public function index(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        $request->validate([
            'before' => ['nullable', 'integer'],
            'after' => ['nullable', 'integer'],
            'q' => ['nullable', 'string', 'max:100'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $limit = (int) $request->input('limit', 50);

        $query = Message::where('conversation_id', $conversation->id)
            ->with(['sender', 'attachments', 'reactions.user', 'replyTo.sender']);

        // Anggota yang baru ditambahkan tidak melihat riwayat sebelum bergabung.
        if ($conversation->isGroup() && $member->joined_at) {
            $query->where('created_at', '>=', $member->joined_at->copy()->subSecond());
        }

        if ($q = $request->input('q')) {
            $query->whereNull('deleted_at')->where('type', '!=', 'system')
                ->where('body', 'like', '%'.str_replace(['%', '_'], ['\%', '\_'], $q).'%');
        }

        if ($after = $request->input('after')) {
            $messages = $query->where('id', '>', $after)->orderBy('id')->limit($limit)->get();
        } else {
            if ($before = $request->input('before')) {
                $query->where('id', '<', $before);
            }
            $messages = $query->orderByDesc('id')->limit($limit)->get()->reverse()->values();
        }

        return response()->json([
            'data' => $messages->map(fn ($m) => Present::message($m, $me))->values(),
            'has_more' => $messages->count() === $limit,
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);

        if ($conversation->isGroup() && $conversation->send_policy === 'admins' && ! $member->isAdmin()) {
            abort(403, 'Hanya admin yang dapat mengirim pesan di grup ini.');
        }

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:8000', 'required_without:files'],
            'client_uuid' => ['nullable', 'uuid'],
            'reply_to_id' => ['nullable', 'integer'],
            'kind' => ['nullable', 'in:voice'],
            'duration' => ['nullable', 'integer', 'min:0', 'max:3600'],
            'files' => ['nullable', 'array', 'max:10'],
            'files.*' => ['file', 'max:'.config('chatme.uploads.max_kb'), 'mimetypes:image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,video/ogg,application/pdf,application/zip,application/x-zip-compressed,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/octet-stream'],
        ], [
            'files.*.max' => 'Ukuran file maksimal '.round(config('chatme.uploads.max_kb') / 1024).' MB.',
            'files.*.mimetypes' => 'Jenis file ini tidak didukung.',
            'body.required_without' => 'Pesan tidak boleh kosong.',
        ]);

        if (! empty($data['reply_to_id'])) {
            $exists = Message::where('id', $data['reply_to_id'])->where('conversation_id', $conversation->id)->exists();
            if (! $exists) {
                $data['reply_to_id'] = null;
            }
        }

        $files = $request->file('files', []);
        $message = $this->chat->send($conversation, $me, $data, is_array($files) ? array_values($files) : [$files]);

        return response()->json(['message' => Present::message($message->fresh(), $me)], $message->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, Message $message): JsonResponse
    {
        $me = $this->me($request);
        $this->membership($message->conversation, $me);
        abort_unless($message->user_id === $me->id, 403, 'Anda hanya dapat mengedit pesan sendiri.');
        abort_if($message->isDeleted(), 422, 'Pesan sudah dihapus.');
        abort_if($message->created_at->lt(now()->subMinutes(Message::EDIT_WINDOW_MINUTES)), 422, 'Pesan hanya dapat diedit dalam '.Message::EDIT_WINDOW_MINUTES.' menit.');
        abort_unless(in_array($message->type, ['text', 'image', 'video', 'file'], true), 422, 'Pesan ini tidak dapat diedit.');

        $data = $request->validate(['body' => ['required', 'string', 'max:8000']]);
        $meta = $message->meta ?? [];
        $meta['history'] = array_slice(array_merge($meta['history'] ?? [], [['body' => $message->body, 'at' => now()->toIso8601String()]]), -10);

        $message->update(['body' => trim($data['body']), 'edited_at' => now(), 'meta' => $meta]);
        $this->chat->publishUpdated($message);

        return response()->json(['message' => Present::message($message->fresh(), $me)]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($message->conversation, $me);
        $isOwner = $message->user_id === $me->id;
        abort_unless($isOwner || ($message->conversation->isGroup() && $member->isAdmin() && $message->type !== 'system'), 403, 'Anda tidak dapat menghapus pesan ini.');

        if (! $message->isDeleted()) {
            foreach ($message->attachments as $a) {
                Storage::disk($a->disk)->delete($a->path);
            }
            $message->attachments()->delete();
            $message->reactions()->delete();
            $message->update([
                'body' => null,
                'deleted_at' => now(),
                'meta' => ['deleted_by' => $me->id, 'by_admin' => ! $isOwner],
            ]);
            $this->chat->publishUpdated($message);
        }

        return response()->json(['message' => Present::message($message->fresh(), $me)]);
    }

    public function react(Request $request, Message $message): JsonResponse
    {
        $me = $this->me($request);
        $this->membership($message->conversation, $me);
        abort_if($message->isDeleted() || $message->type === 'system', 422);
        $data = $request->validate(['emoji' => ['required', 'string', 'max:16']]);

        $existing = $message->reactions()->where('user_id', $me->id)->first();
        if ($existing && $existing->emoji === $data['emoji']) {
            $existing->delete();
        } else {
            $message->reactions()->updateOrCreate(['user_id' => $me->id], ['emoji' => $data['emoji']]);
        }
        $this->chat->publishUpdated($message);

        return response()->json(['message' => Present::message($message->fresh(), $me)]);
    }

    public function attachment(Request $request, MessageAttachment $attachment): Response
    {
        $me = $this->me($request);
        $message = $attachment->message;
        $this->membership($message->conversation, $me);
        abort_if($message->isDeleted() || ! Storage::disk($attachment->disk)->exists($attachment->path), 404);

        $inline = $request->boolean('download') ? 'attachment' : 'inline';
        $safeInline = preg_match('#^(image/(jpeg|png|gif|webp)|video/|audio/|application/pdf)#', $attachment->mime);

        return Storage::disk($attachment->disk)->response($attachment->path, $attachment->original_name, [
            'Content-Type' => $attachment->mime,
            'Cache-Control' => 'private, max-age=604800',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'",
        ], $safeInline ? $inline : 'attachment');
    }

    /** Sinkronisasi setelah offline / fallback ketika WebSocket tidak tersedia. */
    public function sync(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $request->validate(['after' => ['required', 'integer', 'min:0']]);
        $after = (int) $request->input('after');

        $conversationIds = Conversation::forUser($me)->pluck('id');
        $messages = Message::whereIn('conversation_id', $conversationIds)
            ->where('id', '>', $after)
            ->with(['sender', 'attachments', 'reactions.user', 'replyTo.sender'])
            ->orderBy('id')->limit(300)->get();

        return response()->json([
            'messages' => $messages->map(fn ($m) => Present::message($m, $me))->values(),
            'cursor' => (int) ($messages->max('id') ?? $after),
            'max_id' => (int) Message::whereIn('conversation_id', $conversationIds)->max('id'),
            'has_more' => $messages->count() === 300,
        ]);
    }
}
