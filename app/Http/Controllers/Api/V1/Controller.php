<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Conversation;
use App\Models\ConversationMember;
use App\Models\Device;
use App\Models\User;
use Illuminate\Http\Request;

/**
 * Basis controller API v1 — pemeriksaan keanggotaan dilakukan di server pada setiap akses.
 * @2026-Alifiandra
 */
abstract class Controller
{
    protected function me(Request $request): User
    {
        return $request->user();
    }

    protected function device(Request $request): ?Device
    {
        return $request->attributes->get('device');
    }

    /** Akses ke percakapan orang lain dijawab 404 agar keberadaannya tidak bocor. */
    protected function membership(Conversation $conversation, User $user): ConversationMember
    {
        $member = $conversation->membershipFor($user);
        abort_if(! $member, 404, 'Percakapan tidak ditemukan.');

        return $member;
    }

    protected function requireAdmin(ConversationMember $member): void
    {
        abort_unless($member->isAdmin(), 403, 'Hanya admin grup yang dapat melakukan ini.');
    }
}
