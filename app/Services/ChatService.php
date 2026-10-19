<?php

namespace App\Services;

use App\Events\ChatEvent;
use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Message;
use App\Models\User;
use App\Support\Present;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Alur pesan sesuai blueprint: validasi → simpan di MySQL → publikasikan event.
 * @2026-Alifiandra
 */
class ChatService
{
    public function findOrCreateDirect(User $me, User $other): Conversation
    {
        $key = Conversation::directKey($me->id, $other->id);

        return DB::transaction(function () use ($key, $me, $other) {
            $conversation = Conversation::where('direct_key', $key)->lockForUpdate()->first();
            if ($conversation) {
                // Bergabung kembali jika sebelumnya keluar dari percakapan.
                foreach ([$me, $other] as $u) {
                    ConversationMember::updateOrCreate(
                        ['conversation_id' => $conversation->id, 'user_id' => $u->id],
                        ['left_at' => null]
                    );
                }

                return $conversation;
            }

            $conversation = Conversation::create([
                'type' => Conversation::DIRECT,
                'direct_key' => $key,
                'created_by' => $me->id,
            ]);
            foreach (array_unique([$me->id, $other->id]) as $id) {
                ConversationMember::create(['conversation_id' => $conversation->id, 'user_id' => $id, 'role' => 'member', 'joined_at' => now()]);
            }

            return $conversation;
        });
    }

    /** @param array<int,int> $memberIds */
    public function createGroup(User $owner, string $name, array $memberIds, ?string $description = null): Conversation
    {
        $conversation = DB::transaction(function () use ($owner, $name, $memberIds, $description) {
            $conversation = Conversation::create([
                'type' => Conversation::GROUP,
                'name' => $name,
                'description' => $description,
                'created_by' => $owner->id,
            ]);
            ConversationMember::create(['conversation_id' => $conversation->id, 'user_id' => $owner->id, 'role' => 'owner', 'joined_at' => now()]);
            foreach (array_unique($memberIds) as $id) {
                if ($id !== $owner->id) {
                    ConversationMember::create(['conversation_id' => $conversation->id, 'user_id' => $id, 'role' => 'member', 'joined_at' => now()]);
                }
            }

            return $conversation;
        });

        $this->system($conversation, $owner, 'created', ['name' => $name]);

        return $conversation;
    }

    /**
     * @param array<int,UploadedFile> $files
     */
    public function send(Conversation $conversation, User $sender, array $data, array $files = []): Message
    {
        $clientUuid = $data['client_uuid'] ?? null;
        if ($clientUuid && ($existing = Message::where('user_id', $sender->id)->where('client_uuid', $clientUuid)->first())) {
            return $existing; // idempotensi: kirim ulang tidak menggandakan pesan
        }

        $message = DB::transaction(function () use ($conversation, $sender, $data, $files, $clientUuid) {
            $type = 'text';
            $meta = $data['meta'] ?? [];
            if ($files) {
                $first = $files[0];
                $mime = (string) $first->getMimeType();
                $type = match (true) {
                    ($data['kind'] ?? null) === 'voice' || str_starts_with($mime, 'audio/') => 'audio',
                    str_starts_with($mime, 'image/') && $mime !== 'image/svg+xml' => 'image',
                    str_starts_with($mime, 'video/') => 'video',
                    default => 'file',
                };
                $meta['file_name'] = $first->getClientOriginalName();
            }

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'user_id' => $sender->id,
                'client_uuid' => $clientUuid ?: (string) Str::uuid(),
                'type' => $type,
                'body' => isset($data['body']) ? trim((string) $data['body']) ?: null : null,
                'reply_to_id' => $data['reply_to_id'] ?? null,
                'meta' => $meta ?: null,
            ]);

            foreach ($files as $file) {
                $path = $file->store('attachments/'.now()->format('Y/m'), 'local');
                $message->attachments()->create([
                    'disk' => 'local',
                    'path' => $path,
                    'original_name' => mb_substr($file->getClientOriginalName(), 0, 200),
                    'mime' => (string) $file->getMimeType(),
                    'size' => (int) $file->getSize(),
                    'duration' => isset($data['duration']) ? (int) $data['duration'] : null,
                ]);
            }

            $conversation->update(['last_message_id' => $message->id, 'last_message_at' => $message->created_at]);
            ConversationMember::where('conversation_id', $conversation->id)->where('user_id', $sender->id)
                ->update(['last_read_message_id' => $message->id, 'last_delivered_message_id' => $message->id]);
            // Percakapan yang diarsipkan muncul kembali ketika ada pesan baru.
            ConversationMember::where('conversation_id', $conversation->id)->whereNull('left_at')->update(['archived_at' => null]);

            return $message;
        });

        $this->publishNew($conversation, $message);

        return $message;
    }

    public function system(Conversation $conversation, ?User $actor, string $action, array $meta = []): Message
    {
        $message = Message::create([
            'conversation_id' => $conversation->id,
            'user_id' => null,
            'type' => 'system',
            'body' => $this->systemText($actor, $action, $meta),
            'meta' => array_merge(['action' => $action, 'actor_id' => $actor?->id], $meta),
        ]);
        $conversation->update(['last_message_id' => $message->id, 'last_message_at' => $message->created_at]);
        $this->publishNew($conversation, $message);

        return $message;
    }

    protected function systemText(?User $actor, string $action, array $meta): string
    {
        $who = $actor?->displayName() ?? 'Seseorang';

        return match ($action) {
            'created' => "{$who} membuat grup \"{$meta['name']}\"",
            'added' => "{$who} menambahkan {$meta['names']}",
            'removed' => "{$who} mengeluarkan {$meta['names']}",
            'left' => "{$who} keluar dari grup",
            'renamed' => "{$who} mengganti nama grup menjadi \"{$meta['name']}\"",
            'promoted' => "{$who} menjadikan {$meta['names']} admin",
            'demoted' => "{$who} mencabut status admin {$meta['names']}",
            'policy' => $meta['policy'] === 'admins' ? "{$who} mengatur agar hanya admin yang dapat mengirim pesan" : "{$who} mengizinkan semua anggota mengirim pesan",
            default => $who.' memperbarui grup',
        };
    }

    public function publishNew(Conversation $conversation, Message $message): void
    {
        $message->load(['sender', 'attachments', 'reactions.user', 'replyTo.sender']);
        foreach ($conversation->memberIds() as $userId) {
            $viewer = new User;
            $viewer->id = $userId;
            ChatEvent::dispatchTo([$userId], 'message.new', ['message' => Present::message($message, $viewer)]);
        }
    }

    public function publishUpdated(Message $message): void
    {
        $message->refresh()->load(['sender', 'attachments', 'reactions.user', 'replyTo.sender']);
        foreach ($message->conversation->memberIds() as $userId) {
            $viewer = new User;
            $viewer->id = $userId;
            ChatEvent::dispatchTo([$userId], 'message.updated', ['message' => Present::message($message, $viewer)]);
        }
    }

    public function publishConversation(Conversation $conversation, array $extraUserIds = []): void
    {
        $conversation->refresh();
        $ids = array_unique(array_merge($conversation->memberIds(), $extraUserIds));
        foreach ($ids as $userId) {
            $user = User::find($userId);
            if (! $user) {
                continue;
            }
            $isMember = $conversation->membershipFor($user) !== null;
            ChatEvent::dispatchTo([$userId], $isMember ? 'conversation.updated' : 'conversation.removed',
                $isMember ? ['conversation' => Present::conversation($conversation->fresh(), $user)] : ['conversation_id' => $conversation->id]);
        }
    }
}
