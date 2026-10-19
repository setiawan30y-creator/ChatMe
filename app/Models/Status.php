<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * Status (cerita) yang hilang otomatis setelah 24 jam.
 * @2026-Alifiandra
 */
class Status extends Model
{
    public const TTL_HOURS = 24;

    protected $fillable = ['user_id', 'type', 'body', 'meta', 'media_path', 'media_mime', 'media_size', 'audience', 'expires_at'];

    protected $hidden = ['media_path'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recipients(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'status_recipients');
    }

    public function views(): HasMany
    {
        return $this->hasMany(StatusView::class);
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('expires_at', '>', now());
    }

    /** Status yang boleh dilihat pengguna ini (miliknya sendiri atau ia termasuk penerima). */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        return $q->where(function ($w) use ($user) {
            $w->where('user_id', $user->id)
                ->orWhereExists(fn ($e) => $e->selectRaw('1')->from('status_recipients')
                    ->whereColumn('status_recipients.status_id', 'statuses.id')
                    ->where('status_recipients.user_id', $user->id));
        });
    }

    public function canBeSeenBy(User $user): bool
    {
        if ($this->expires_at->isPast()) {
            return false;
        }

        return $this->user_id === $user->id
            || $this->recipients()->whereKey($user->id)->exists();
    }

    public function mediaUrl(): ?string
    {
        return $this->media_path ? url('/api/v1/statuses/'.$this->id.'/media') : null;
    }

    public function preview(): string
    {
        return match ($this->type) {
            'image' => '📷 '.($this->body ?: 'Foto'),
            'video' => '🎬 '.($this->body ?: 'Video'),
            default => (string) $this->body,
        };
    }

    public function deleteMedia(): void
    {
        if ($this->media_path) {
            Storage::disk('local')->delete($this->media_path);
        }
    }
}
