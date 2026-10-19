<?php

namespace App\Services;

use App\Events\ChatEvent;
use App\Models\Status;
use App\Models\StatusView;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Status 24 jam: siapa kontak, siapa boleh melihat, feed, dan pembersihan otomatis.
 * @2026-Alifiandra
 */
class StatusService
{
    /**
     * Kontak = lawan chat pribadi yang pernah Anda kirimi pesan.
     * Orang asing yang hanya mengirim pesan ke Anda tidak otomatis melihat status Anda.
     *
     * @return array<int,int>
     */
    public function contactIds(User $user): array
    {
        return DB::table('conversation_members as me')
            ->join('conversations as c', 'c.id', '=', 'me.conversation_id')
            ->join('conversation_members as other', function ($j) {
                $j->on('other.conversation_id', '=', 'c.id')->on('other.user_id', '!=', 'me.user_id');
            })
            ->where('c.type', 'direct')
            ->where('me.user_id', $user->id)
            ->whereNull('me.left_at')
            ->whereNull('other.left_at')
            ->whereExists(fn ($q) => $q->selectRaw('1')->from('messages')
                ->whereColumn('messages.conversation_id', 'c.id')
                ->where('messages.user_id', $user->id))
            ->distinct()
            ->pluck('other.user_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /** @return array<int,int> penerima sesuai pengaturan privasi status saat ini */
    public function audienceFor(User $user): array
    {
        $contacts = $this->contactIds($user);
        $list = array_map('intval', $user->setting('status_list') ?? []);

        return array_values(match ($user->setting('status_privacy')) {
            'except' => array_diff($contacts, $list),
            'only' => array_intersect($contacts, $list),
            default => $contacts,
        });
    }

    public function publish(Status $status): void
    {
        $ids = $status->recipients()->pluck('users.id')->all();
        ChatEvent::dispatchTo(array_merge($ids, [$status->user_id]), 'status.new', [
            'user_id' => $status->user_id,
            'status_id' => $status->id,
        ]);
    }

    public function recordView(Status $status, User $viewer): bool
    {
        if ($status->user_id === $viewer->id) {
            return false;
        }

        $view = StatusView::firstOrCreate(
            ['status_id' => $status->id, 'user_id' => $viewer->id],
            ['viewed_at' => now()]
        );

        if ($view->wasRecentlyCreated) {
            ChatEvent::dispatchTo([$status->user_id], 'status.viewed', [
                'status_id' => $status->id,
                'view_count' => $status->views()->count(),
            ]);
        }

        return $view->wasRecentlyCreated;
    }

    /** Hapus status kedaluwarsa beserta filenya. */
    public function prune(int $limit = 500): int
    {
        $count = 0;
        Status::where('expires_at', '<=', now())->orderBy('id')->limit($limit)->get()
            ->each(function (Status $s) use (&$count) {
                $s->deleteMedia();
                $s->delete();
                $count++;
            });

        return $count;
    }

    /** Feed status: milik sendiri + kontak yang membagikan status ke saya. */
    public function feed(User $me): array
    {
        $statuses = Status::active()->visibleTo($me)
            ->with('user')
            ->withCount('views')
            ->orderBy('id')
            ->get();

        $viewed = StatusView::where('user_id', $me->id)
            ->whereIn('status_id', $statuses->pluck('id'))
            ->pluck('status_id')->flip();

        $muted = array_map('intval', $me->setting('status_muted') ?? []);

        $mine = $statuses->where('user_id', $me->id)->values();
        $others = $statuses->where('user_id', '!=', $me->id)->groupBy('user_id');

        $groups = $others->map(function (Collection $items) use ($viewed, $muted, $me) {
            $user = $items->first()->user;
            $list = $items->map(fn ($s) => $this->present($s, $me, $viewed->has($s->id)))->values();

            return [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->displayName(),
                    'avatar_url' => $user->avatarUrl(),
                ],
                'statuses' => $list,
                'all_viewed' => $list->every(fn ($s) => $s['viewed']),
                'muted' => in_array($user->id, $muted, true),
                'last_at' => $list->last()['created_at'],
            ];
        })->sortByDesc('last_at')->values();

        return [
            'mine' => $mine->map(fn ($s) => $this->present($s, $me, true))->values(),
            'contacts' => $groups,
            'privacy' => [
                'mode' => $me->setting('status_privacy'),
                'list' => $me->setting('status_list'),
            ],
        ];
    }

    public function present(Status $s, User $viewer, bool $viewed = false): array
    {
        $data = [
            'id' => $s->id,
            'user_id' => $s->user_id,
            'type' => $s->type,
            'body' => $s->body,
            'meta' => $s->meta,
            'media_url' => $s->mediaUrl(),
            'media_mime' => $s->media_mime,
            'preview' => $s->preview(),
            'viewed' => $viewed,
            'created_at' => $s->created_at?->toIso8601String(),
            'expires_at' => $s->expires_at?->toIso8601String(),
        ];

        if ($s->user_id === $viewer->id) {
            $data['view_count'] = $s->views_count ?? $s->views()->count();
            $data['audience'] = $s->audience;
        }

        return $data;
    }
}
