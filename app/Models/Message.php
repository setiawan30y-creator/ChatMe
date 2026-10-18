<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Pesan. Penghapusan "untuk semua" mengosongkan isi dan menandai deleted_at secara transparan.
 * @2026-Alifiandra
 */
class Message extends Model
{
    public const EDIT_WINDOW_MINUTES = 15;

    protected $fillable = ['conversation_id', 'user_id', 'client_uuid', 'type', 'body', 'reply_to_id', 'meta', 'edited_at', 'deleted_at'];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'edited_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function replyTo(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'reply_to_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MessageAttachment::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(MessageReaction::class);
    }

    public function isDeleted(): bool
    {
        return $this->deleted_at !== null;
    }

    public function preview(): string
    {
        if ($this->isDeleted()) {
            return 'Pesan ini telah dihapus';
        }

        return match ($this->type) {
            'image' => '📷 '.($this->body ?: 'Foto'),
            'video' => '🎬 '.($this->body ?: 'Video'),
            'audio' => '🎤 Pesan suara',
            'file' => '📎 '.($this->body ?: ($this->meta['file_name'] ?? 'Dokumen')),
            default => (string) $this->body,
        };
    }
}
