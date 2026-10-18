<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

/**
 * Akun Almara Chat. Satu nomor HP terverifikasi = satu akun.
 * @2026-Alifiandra
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    public const DEFAULT_SETTINGS = [
        'notify_mode' => 'normal',   // normal | sound | silent | private
        'notify_preview' => true,
        'read_receipts' => true,
        'theme' => 'system',         // system | light | dark
        'enter_to_send' => true,
    ];

    protected $fillable = ['phone', 'name', 'about', 'avatar_path', 'locale', 'settings', 'phone_verified_at', 'last_seen_at'];

    protected $hidden = ['remember_token'];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'phone_verified_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function conversations(): BelongsToMany
    {
        return $this->belongsToMany(Conversation::class, 'conversation_members')
            ->using(ConversationMember::class)
            ->withPivot(['id', 'role', 'last_read_message_id', 'last_delivered_message_id', 'muted_until', 'pinned_at', 'archived_at', 'left_at'])
            ->wherePivotNull('left_at')
            ->withTimestamps();
    }

    public function setting(string $key): mixed
    {
        return ($this->settings ?? [])[$key] ?? self::DEFAULT_SETTINGS[$key] ?? null;
    }

    public function allSettings(): array
    {
        return array_merge(self::DEFAULT_SETTINGS, array_intersect_key($this->settings ?? [], self::DEFAULT_SETTINGS));
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? url('/api/v1/avatars/user/'.$this->id.'?v='.substr(md5($this->avatar_path), 0, 8)) : null;
    }

    public function displayName(): string
    {
        return $this->name ?: '+'.$this->phone;
    }

    public function maskedPhone(): string
    {
        return '+'.$this->phone;
    }

    public function deleteAvatarFile(): void
    {
        if ($this->avatar_path) {
            Storage::disk('local')->delete($this->avatar_path);
        }
    }
}
