<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Perangkat tertaut — setiap perangkat punya sesi sendiri dan dapat dicabut dari jarak jauh.
 * @2026-Alifiandra
 */
class Device extends Model
{
    protected $fillable = ['user_id', 'name', 'platform', 'browser', 'user_agent', 'ip_address', 'linked_via', 'token_id', 'last_active_at', 'revoked_at'];

    protected function casts(): array
    {
        return [
            'last_active_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->revoked_at === null;
    }
}
