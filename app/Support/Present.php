<?php

namespace App\Support;

use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Device;
use App\Models\Message;
use App\Models\User;

/**
 * Bentuk JSON yang dipakai bersama oleh PWA dan aplikasi Flutter.
 * @2026-Alifiandra
 */
class Present
{
    public static function me(User $user): array
    {
        return [
            'id' => $user->id,
            'phone' => $user->phone,
            'name' => $user->name,
            'about' => $user->about,
            'avatar_url' => $user->avatarUrl(),
            'locale' => $user->locale,
            'settings' => $user->allSettings(),
            'needs_profile' => $user->name === null,
        ];
    }

    public static function user(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->displayName(),
            'phone' => $user->phone,
            'about' => $user->about,
            'avatar_url' => $user->avatarUrl(),
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
        ];
    }

    public static function device(Device $device, ?int $currentId = null): array
    {
        return [
            'id' => $device->id,
            'name' => $device->name,
            'platform' => $device->platform,
            'browser' => $device->browser,
            'ip_address' => $device->ip_address,
            'linked_via' => $device->linked_via,
            'linked_at' => $device->created_at?->toIso8601String(),
            'last_active_at' => $device->last_active_at?->toIso8601String(),
            'is_current' => $currentId !== null && $device->id === $currentId,
        ];
    }

    public static function conversation(Conversation $c, User $viewer): array
    {
        $c->loadMissing(['activeMemberships.user', 'lastMessage.sender']);
        /** @var ConversationMember|null $mine */
        $mine = $c->activeMemberships->firstWhere('user_id', $viewer->id);
        $others = $c->activeMemberships->where('user_id', '!=', $viewer->id);

        if ($c->isGroup()) {
            $title = $c->name;
            $avatar = $c->avatarUrl();
            $peer = null;
        } else {
            $peerUser = $others->first()?->user;
            $title = $peerUser?->displayName() ?? 'Akun dihapus';
            $avatar = $peerUser?->avatarUrl();
            $peer = $peerUser ? self::user($peerUser) : null;
        }

        $unread = $mine ? Message::where('conversation_id', $c->id)
            ->where('id', '>', $mine->last_read_message_id)
            ->where('user_id', '!=', $viewer->id)
            ->where('type', '!=', 'system')
            ->whereNull('deleted_at')
            ->count() : 0;

        return [
            'id' => $c->id,
            'type' => $c->type,
            'title' => $title,
            'description' => $c->description,
            'avatar_url' => $avatar,
            'peer' => $peer,
            'send_policy' => $c->send_policy,
            'role' => $mine?->role,
            'muted' => (bool) $mine?->isMuted(),
            'muted_until' => $mine?->muted_until?->toIso8601String(),
            'pinned' => $mine?->pinned_at !== null,
            'archived' => $mine?->archived_at !== null,
            'unread_count' => $unread,
            'last_read_message_id' => $mine?->last_read_message_id ?? 0,
            'last_message' => $c->lastMessage ? self::message($c->lastMessage, $viewer, true) : null,
            'last_message_at' => ($c->last_message_at ?? $c->created_at)?->toIso8601String(),
            'members' => $c->activeMemberships->map(fn (ConversationMember $m) => [
                'user' => $m->user ? self::user($m->user) : null,
                'role' => $m->role,
                'last_read_message_id' => $m->user?->setting('read_receipts') === false ? null : $m->last_read_message_id,
                'last_delivered_message_id' => $m->last_delivered_message_id,
            ])->values()->all(),
            'created_at' => $c->created_at?->toIso8601String(),
        ];
    }

    public static function message(Message $m, ?User $viewer = null, bool $compact = false): array
    {
        $deleted = $m->isDeleted();
        $data = [
            'id' => $m->id,
            'conversation_id' => $m->conversation_id,
            'client_uuid' => $m->client_uuid,
            'type' => $m->type,
            'body' => $deleted ? null : $m->body,
            'preview' => $m->preview(),
            'sender' => $m->sender ? ['id' => $m->sender->id, 'name' => $m->sender->displayName(), 'avatar_url' => $m->sender->avatarUrl()] : null,
            'is_mine' => $viewer && $m->user_id === $viewer->id,
            'edited' => $m->edited_at !== null,
            'deleted' => $deleted,
            'meta' => $deleted ? null : $m->meta,
            'created_at' => $m->created_at?->toIso8601String(),
        ];

        if ($compact) {
            return $data;
        }

        $m->loadMissing(['attachments', 'reactions.user', 'replyTo.sender']);

        $data['attachments'] = $deleted ? [] : $m->attachments->map(fn ($a) => [
            'id' => $a->id,
            'url' => $a->url(),
            'name' => $a->original_name,
            'mime' => $a->mime,
            'size' => $a->size,
            'duration' => $a->duration,
        ])->values()->all();

        $data['reactions'] = $m->reactions->groupBy('emoji')->map(fn ($group, $emoji) => [
            'emoji' => $emoji,
            'count' => $group->count(),
            'mine' => $viewer ? $group->contains('user_id', $viewer->id) : false,
            'users' => $group->map(fn ($r) => $r->user?->displayName())->filter()->values()->all(),
        ])->values()->all();

        $data['reply_to'] = $m->replyTo ? [
            'id' => $m->replyTo->id,
            'sender_name' => $m->replyTo->sender?->displayName(),
            'preview' => $m->replyTo->preview(),
        ] : null;

        return $data;
    }
}
