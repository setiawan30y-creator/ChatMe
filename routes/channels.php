<?php

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
| Otorisasi kanal real-time. Setiap kanal diperiksa di server.
| @2026-Alifiandra
*/

// Kanal pribadi milik satu pengguna: pesan baru, receipt, perangkat, dll.
Broadcast::channel('user.{id}', fn (User $user, int $id) => $user->id === $id);

// Kanal percakapan: indikator mengetik (client event "whisper").
Broadcast::channel('conversation.{conversation}', function (User $user, Conversation $conversation) {
    return $conversation->membershipFor($user) !== null;
});

// Kanal kehadiran global: siapa yang sedang online.
Broadcast::channel('online', fn (User $user) => ['id' => $user->id, 'name' => $user->displayName()]);
