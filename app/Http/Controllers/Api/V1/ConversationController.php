<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChatEvent;
use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Message;
use App\Models\User;
use App\Services\ChatService;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Percakapan pribadi dan grup: daftar, buat, kelola anggota, preferensi, dan tanda baca.
 * @2026-Alifiandra
 */
class ConversationController extends Controller
{
    public function __construct(protected ChatService $chat) {}

    public function index(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $items = Conversation::forUser($me)
            ->with(['activeMemberships.user', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')->orderByDesc('id')
            ->limit(300)->get()
            ->map(fn ($c) => Present::conversation($c, $me))
            ->sortByDesc(fn ($c) => [$c['pinned'] ? 1 : 0, $c['last_message_at']])
            ->values();

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $me = $this->me($request);
        $data = $request->validate([
            'type' => ['required', 'in:direct,group'],
            'user_id' => ['required_if:type,direct', 'integer', 'exists:users,id'],
            'name' => ['required_if:type,group', 'nullable', 'string', 'min:1', 'max:80'],
            'description' => ['nullable', 'string', 'max:300'],
            'member_ids' => ['array', 'max:'.(config('chatme.groups.max_members') - 1)],
            'member_ids.*' => ['integer', 'exists:users,id'],
        ]);

        if ($data['type'] === 'direct') {
            $other = User::findOrFail($data['user_id']);
            $conversation = $this->chat->findOrCreateDirect($me, $other);
            $status = $conversation->wasRecentlyCreated ? 201 : 200;
        } else {
            $conversation = $this->chat->createGroup($me, trim($data['name']), array_map('intval', $data['member_ids'] ?? []), $data['description'] ?? null);
            $this->chat->publishConversation($conversation);
            $status = 201;
        }

        return response()->json(['conversation' => Present::conversation($conversation->fresh(), $me)], $status);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $this->membership($conversation, $me);

        return response()->json(['conversation' => Present::conversation($conversation, $me)]);
    }

    public function update(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        abort_unless($conversation->isGroup(), 422, 'Hanya grup yang dapat diubah.');
        $this->requireAdmin($member);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:300'],
            'send_policy' => ['sometimes', 'in:all,admins'],
        ]);

        $old = $conversation->only(['name', 'send_policy']);
        $conversation->update($data);

        if (isset($data['name']) && $data['name'] !== $old['name']) {
            $this->chat->system($conversation, $me, 'renamed', ['name' => $data['name']]);
        }
        if (isset($data['send_policy']) && $data['send_policy'] !== $old['send_policy']) {
            $this->chat->system($conversation, $me, 'policy', ['policy' => $data['send_policy']]);
        }
        $this->chat->publishConversation($conversation);

        return response()->json(['conversation' => Present::conversation($conversation->fresh(), $me)]);
    }

    public function avatar(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        abort_unless($conversation->isGroup(), 422);
        $this->requireAdmin($member);
        $request->validate(['avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:'.config('chatme.uploads.avatar_max_kb')]]);

        if ($conversation->avatar_path) {
            \Illuminate\Support\Facades\Storage::disk('local')->delete($conversation->avatar_path);
        }
        $conversation->update(['avatar_path' => $request->file('avatar')->store('group-avatars', 'local')]);
        $this->chat->publishConversation($conversation);

        return response()->json(['conversation' => Present::conversation($conversation->fresh(), $me)]);
    }

    public function addMembers(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        abort_unless($conversation->isGroup(), 422);
        $this->requireAdmin($member);
        $data = $request->validate(['user_ids' => ['required', 'array', 'min:1'], 'user_ids.*' => ['integer', 'exists:users,id']]);

        $current = count($conversation->memberIds());
        abort_if($current + count($data['user_ids']) > config('chatme.groups.max_members'), 422, 'Jumlah anggota grup melebihi batas.');

        $added = [];
        foreach (array_unique($data['user_ids']) as $id) {
            $row = ConversationMember::firstOrNew(['conversation_id' => $conversation->id, 'user_id' => $id]);
            if ($row->exists && $row->left_at === null) {
                continue;
            }
            $row->fill(['role' => 'member', 'left_at' => null, 'joined_at' => now(), 'last_read_message_id' => (int) $conversation->last_message_id])->save();
            $added[] = $id;
        }

        if ($added) {
            $names = User::whereIn('id', $added)->get()->map->displayName()->join(', ');
            $this->chat->system($conversation, $me, 'added', ['names' => $names, 'user_ids' => $added]);
            $this->chat->publishConversation($conversation);
        }

        return response()->json(['conversation' => Present::conversation($conversation->fresh(), $me)]);
    }

    public function removeMember(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        abort_unless($conversation->isGroup(), 422);
        $this->requireAdmin($member);
        $target = $this->membership($conversation, $user);
        abort_if($target->role === 'owner', 403, 'Pemilik grup tidak dapat dikeluarkan.');

        $target->update(['left_at' => now(), 'role' => 'member']);
        $this->chat->system($conversation, $me, 'removed', ['names' => $user->displayName(), 'user_ids' => [$user->id]]);
        $this->chat->publishConversation($conversation, [$user->id]);

        return response()->json(['conversation' => Present::conversation($conversation->fresh(), $me)]);
    }

    public function setRole(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        abort_unless($conversation->isGroup(), 422);
        $this->requireAdmin($member);
        $data = $request->validate(['role' => ['required', Rule::in(['admin', 'member'])]]);
        $target = $this->membership($conversation, $user);
        abort_if($target->role === 'owner', 403, 'Peran pemilik grup tidak dapat diubah.');

        if ($target->role !== $data['role']) {
            $target->update(['role' => $data['role']]);
            $this->chat->system($conversation, $me, $data['role'] === 'admin' ? 'promoted' : 'demoted', ['names' => $user->displayName()]);
            $this->chat->publishConversation($conversation);
        }

        return response()->json(['conversation' => Present::conversation($conversation->fresh(), $me)]);
    }

    public function leave(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);

        if ($conversation->isGroup()) {
            // Jika pemilik keluar, kepemilikan diturunkan ke admin/anggota paling lama.
            if ($member->role === 'owner') {
                $heir = $conversation->activeMemberships()->where('user_id', '!=', $me->id)
                    ->orderByRaw("CASE role WHEN 'admin' THEN 0 ELSE 1 END")->orderBy('id')->first();
                $heir?->update(['role' => 'owner']);
            }
            $member->update(['left_at' => now(), 'role' => 'member']);
            $this->chat->system($conversation, $me, 'left');
            $this->chat->publishConversation($conversation, [$me->id]);
        } else {
            // Chat pribadi: hanya disembunyikan dari daftar milik pengguna.
            $member->update(['archived_at' => now()]);
            ChatEvent::dispatchTo([$me->id], 'conversation.updated', ['conversation' => Present::conversation($conversation->fresh(), $me)]);
        }

        return response()->json(['message' => 'OK']);
    }

    public function preferences(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        $data = $request->validate([
            'mute_minutes' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:5256000'],
            'pinned' => ['sometimes', 'boolean'],
            'archived' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('mute_minutes', $data)) {
            $member->muted_until = $data['mute_minutes'] ? now()->addMinutes($data['mute_minutes']) : null;
        }
        if (array_key_exists('pinned', $data)) {
            $member->pinned_at = $data['pinned'] ? now() : null;
        }
        if (array_key_exists('archived', $data)) {
            $member->archived_at = $data['archived'] ? now() : null;
        }
        $member->save();

        $payload = Present::conversation($conversation->fresh(), $me);
        ChatEvent::dispatchTo([$me->id], 'conversation.updated', ['conversation' => $payload]);

        return response()->json(['conversation' => $payload]);
    }

    /** Tanda diterima/dibaca. Dibaca hanya dibagikan jika pengguna mengaktifkannya. */
    public function receipt(Request $request, Conversation $conversation): JsonResponse
    {
        $me = $this->me($request);
        $member = $this->membership($conversation, $me);
        $data = $request->validate([
            'read_up_to' => ['nullable', 'integer', 'min:0'],
            'delivered_up_to' => ['nullable', 'integer', 'min:0'],
        ]);

        $max = (int) Message::where('conversation_id', $conversation->id)->max('id');
        $changed = false;
        if (isset($data['read_up_to'])) {
            $read = min($max, (int) $data['read_up_to']);
            if ($read > $member->last_read_message_id) {
                $member->last_read_message_id = $read;
                $changed = true;
            }
        }
        $delivered = max((int) ($data['delivered_up_to'] ?? 0), $member->last_read_message_id);
        if (min($max, $delivered) > $member->last_delivered_message_id) {
            $member->last_delivered_message_id = min($max, $delivered);
            $changed = true;
        }

        if ($changed) {
            $member->save();
            $shareRead = $me->setting('read_receipts') !== false;
            ChatEvent::dispatchTo($conversation->memberIds(), 'receipt', [
                'conversation_id' => $conversation->id,
                'user_id' => $me->id,
                'last_read_message_id' => $shareRead ? $member->last_read_message_id : null,
                'own_last_read_message_id' => $member->last_read_message_id,
                'last_delivered_message_id' => $member->last_delivered_message_id,
            ]);
        }

        return response()->json([
            'last_read_message_id' => $member->last_read_message_id,
            'last_delivered_message_id' => $member->last_delivered_message_id,
        ]);
    }
}
