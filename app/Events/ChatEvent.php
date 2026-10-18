<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Support\Facades\Log;

/**
 * Satu event real-time generik ke kanal privat setiap pengguna yang berhak.
 * Pesan sudah tersimpan di MySQL sebelum event ini dikirim; jika Reverb mati,
 * klien tetap mendapat data lewat sinkronisasi (/api/v1/sync).
 * @2026-Alifiandra
 */
class ChatEvent implements ShouldBroadcastNow
{
    /** @param array<int,int> $userIds */
    public function __construct(
        public array $userIds,
        public string $type,
        public array $payload,
    ) {}

    /** @param array<int,int> $userIds */
    public static function dispatchTo(array $userIds, string $type, array $payload): void
    {
        $userIds = array_values(array_unique(array_filter($userIds)));
        if (! $userIds || config('broadcasting.default') === 'null') {
            return;
        }

        try {
            broadcast(new self($userIds, $type, $payload));
        } catch (\Throwable $e) {
            // Real-time tidak boleh menggagalkan penyimpanan pesan.
            Log::warning('Broadcast gagal: '.$e->getMessage(), ['type' => $type]);
        }
    }

    public function broadcastOn(): array
    {
        return array_map(fn ($id) => new PrivateChannel('user.'.$id), $this->userIds);
    }

    public function broadcastAs(): string
    {
        return 'chat';
    }

    public function broadcastWith(): array
    {
        return ['type' => $this->type, 'payload' => $this->payload];
    }
}
