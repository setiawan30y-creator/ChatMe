<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Keanggotaan percakapan beserta status baca, terima, bisu, dan sematan.
 * @2026-Alifiandra
 */
class ConversationMember extends Pivot
{
    protected $table = 'conversation_members';

    public $incrementing = true;

    protected $fillable = ['conversation_id', 'user_id', 'role', 'last_read_message_id', 'last_delivered_message_id', 'muted_until', 'pinned_at', 'archived_at', 'joined_at', 'left_at'];

    protected function casts(): array
    {
        return [
            'muted_until' => 'datetime',
            'pinned_at' => 'datetime',
            'archived_at' => 'datetime',
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
            'last_read_message_id' => 'integer',
            'last_delivered_message_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['owner', 'admin'], true);
    }

    public function isMuted(): bool
    {
        return $this->muted_until !== null && $this->muted_until->isFuture();
    }
}
