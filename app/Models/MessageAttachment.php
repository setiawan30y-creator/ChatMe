<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Lampiran pesan — disimpan privat, diakses lewat pemeriksaan keanggotaan.
 * @2026-Alifiandra
 */
class MessageAttachment extends Model
{
    protected $fillable = ['message_id', 'disk', 'path', 'original_name', 'mime', 'size', 'duration'];

    protected $hidden = ['path', 'disk'];

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function url(): string
    {
        return url('/api/v1/attachments/'.$this->id);
    }
}
