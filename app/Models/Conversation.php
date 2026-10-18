<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Percakapan pribadi (direct) atau grup.
 * @2026-Alifiandra
 */
class Conversation extends Model
{
    public const DIRECT = 'direct';

    public const GROUP = 'group';

    protected $fillable = ['type', 'direct_key', 'name', 'description', 'avatar_path', 'send_policy', 'created_by', 'last_message_id', 'last_message_at'];

    protected function casts(): array
    {
        return ['last_message_at' => 'datetime'];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(ConversationMember::class);
    }

    public function activeMemberships(): HasMany
    {
        return $this->hasMany(ConversationMember::class)->whereNull('left_at');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'conversation_members')
            ->using(ConversationMember::class)
            ->withPivot(['id', 'role', 'last_read_message_id', 'last_delivered_message_id', 'muted_until', 'pinned_at', 'archived_at', 'left_at'])
            ->wherePivotNull('left_at');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->whereHas('memberships', fn ($q) => $q->where('user_id', $user->id)->whereNull('left_at'));
    }

    public function isGroup(): bool
    {
        return $this->type === self::GROUP;
    }

    public function membershipFor(User|int $user): ?ConversationMember
    {
        $id = $user instanceof User ? $user->id : $user;

        return $this->activeMemberships()->where('user_id', $id)->first();
    }

    /** @return array<int,int> */
    public function memberIds(): array
    {
        return $this->activeMemberships()->pluck('user_id')->all();
    }

    public static function directKey(int $a, int $b): string
    {
        return min($a, $b).':'.max($a, $b);
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? url('/api/v1/avatars/group/'.$this->id.'?v='.substr(md5($this->avatar_path), 0, 8)) : null;
    }
}
