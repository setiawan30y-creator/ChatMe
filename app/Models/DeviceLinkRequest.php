<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Permintaan penautan perangkat baru (QR / kode). Sekali pakai, masa berlaku singkat.
 * @2026-Alifiandra
 */
class DeviceLinkRequest extends Model
{
    protected $fillable = ['code', 'secret_hash', 'device_name', 'platform', 'browser', 'user_agent', 'ip_address', 'status', 'approved_by', 'device_id', 'expires_at'];

    protected $hidden = ['secret_hash'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
