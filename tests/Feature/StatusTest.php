<?php

namespace Tests\Feature;

use App\Models\Status;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * @2026-Alifiandra
 */
class StatusTest extends TestCase
{
    use RefreshDatabase;

    /** Buat "kontak": percakapan pribadi di mana $a pernah mengirim pesan ke $b. */
    protected function befriend(User $a, User $b): void
    {
        $chat = app(ChatService::class);
        $conv = $chat->findOrCreateDirect($a, $b);
        $chat->send($conv, $a, ['body' => 'Halo']);
        $chat->send($conv, $b, ['body' => 'Hai']);
    }

    public function test_text_status_visible_to_contacts_only(): void
    {
        [$me, $friend, $stranger] = User::factory()->count(3)->create();
        $this->befriend($me, $friend);

        $res = $this->asDevice($me)->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'Selamat pagi', 'color' => '#2F7D6D', 'font' => 'serif'])
            ->assertCreated()->assertJsonPath('recipients', 1)->json('status');

        $this->getJson('/api/v1/statuses')->assertJsonCount(1, 'mine')->assertJsonPath('mine.0.view_count', 0);

        $this->asDevice($friend)->getJson('/api/v1/statuses')
            ->assertJsonCount(1, 'contacts')
            ->assertJsonPath('contacts.0.user.id', $me->id)
            ->assertJsonPath('contacts.0.statuses.0.body', 'Selamat pagi')
            ->assertJsonPath('contacts.0.all_viewed', false);

        $this->asDevice($stranger)->getJson('/api/v1/statuses')->assertJsonCount(0, 'contacts');
        $this->postJson("/api/v1/statuses/{$res['id']}/view")->assertNotFound();
    }

    public function test_stranger_who_only_messaged_me_does_not_see_my_status(): void
    {
        [$me, $stranger] = User::factory()->count(2)->create();
        $chat = app(ChatService::class);
        $chat->send($chat->findOrCreateDirect($stranger, $me), $stranger, ['body' => 'Halo, kenalan?']);

        $this->asDevice($me)->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'Status saya'])->assertJsonPath('recipients', 0);
        $this->asDevice($stranger)->getJson('/api/v1/statuses')->assertJsonCount(0, 'contacts');
    }

    public function test_views_are_recorded_once_and_visible_to_owner(): void
    {
        [$me, $friend] = User::factory()->count(2)->create();
        $this->befriend($me, $friend);
        $id = $this->asDevice($me)->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'Tes'])->json('status.id');

        $this->asDevice($friend);
        $this->postJson("/api/v1/statuses/{$id}/view")->assertOk();
        $this->postJson("/api/v1/statuses/{$id}/view")->assertOk();
        $this->getJson('/api/v1/statuses')->assertJsonPath('contacts.0.all_viewed', true);
        $this->getJson("/api/v1/statuses/{$id}/viewers")->assertNotFound();

        $this->asDevice($me);
        $this->getJson("/api/v1/statuses/{$id}/viewers")->assertJsonCount(1, 'data')->assertJsonPath('data.0.user.id', $friend->id);
        $this->getJson('/api/v1/statuses')->assertJsonPath('mine.0.view_count', 1);
    }

    public function test_privacy_except_and_only(): void
    {
        [$me, $a, $b] = User::factory()->count(3)->create();
        $this->befriend($me, $a);
        $this->befriend($me, $b);

        $this->asDevice($me)->patchJson('/api/v1/me', ['settings' => ['status_privacy' => 'except', 'status_list' => [$a->id]]])->assertOk();
        $this->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'Bukan untuk A'])->assertJsonPath('recipients', 1);

        $this->patchJson('/api/v1/me', ['settings' => ['status_privacy' => 'only', 'status_list' => [$a->id]]])->assertOk();
        $this->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'Hanya untuk A'])->assertJsonPath('recipients', 1);

        $this->asDevice($a)->getJson('/api/v1/statuses')->assertJsonCount(1, 'contacts.0.statuses')->assertJsonPath('contacts.0.statuses.0.body', 'Hanya untuk A');
        $this->asDevice($b)->getJson('/api/v1/statuses')->assertJsonCount(1, 'contacts.0.statuses')->assertJsonPath('contacts.0.statuses.0.body', 'Bukan untuk A');
    }

    public function test_media_status_is_private_and_expires(): void
    {
        Storage::fake('local');
        [$me, $friend, $stranger] = User::factory()->count(3)->create();
        $this->befriend($me, $friend);

        $s = $this->asDevice($me)->post('/api/v1/statuses', ['type' => 'image', 'body' => 'Pemandangan', 'file' => UploadedFile::fake()->image('a.jpg', 60, 60)], ['Accept' => 'application/json'])
            ->assertCreated()->json('status');

        $this->asDevice($friend)->get("/api/v1/statuses/{$s['id']}/media")->assertOk();
        $this->asDevice($stranger)->getJson("/api/v1/statuses/{$s['id']}/media")->assertNotFound();

        $this->travel(25)->hours();
        $this->asDevice($friend)->getJson("/api/v1/statuses/{$s['id']}/media")->assertNotFound();
        $this->getJson('/api/v1/statuses')->assertJsonCount(0, 'contacts');

        $this->artisan('chatme:prune-statuses')->assertSuccessful();
        $this->assertSame(0, Status::count());
        $this->assertSame([], Storage::disk('local')->allFiles('statuses'));
    }

    public function test_reply_creates_chat_message_with_status_quote(): void
    {
        [$me, $friend] = User::factory()->count(2)->create();
        $this->befriend($me, $friend);
        $id = $this->asDevice($me)->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'Siapa mau kopi?'])->json('status.id');

        $res = $this->asDevice($friend)->postJson("/api/v1/statuses/{$id}/reply", ['body' => 'Saya!'])
            ->assertCreated()
            ->assertJsonPath('message.body', 'Saya!')
            ->assertJsonPath('message.meta.status_reply.status_id', $id)
            ->assertJsonPath('message.meta.status_reply.preview', 'Siapa mau kopi?')
            ->json();

        $this->asDevice($me)->getJson("/api/v1/conversations/{$res['conversation_id']}/messages")
            ->assertJsonPath('data.2.meta.status_reply.owner_id', $me->id);
    }

    public function test_only_owner_can_delete_and_mute_hides_flag(): void
    {
        [$me, $friend] = User::factory()->count(2)->create();
        $this->befriend($me, $friend);
        $id = $this->asDevice($me)->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'X'])->json('status.id');

        $this->asDevice($friend);
        $this->deleteJson("/api/v1/statuses/{$id}")->assertNotFound();
        $this->postJson("/api/v1/status-mutes/{$me->id}", ['muted' => true])->assertOk();
        $this->getJson('/api/v1/statuses')->assertJsonPath('contacts.0.muted', true);

        $this->asDevice($me)->deleteJson("/api/v1/statuses/{$id}")->assertOk();
        $this->assertSame(0, Status::count());
    }

    public function test_text_status_requires_body_and_media_requires_file(): void
    {
        $me = User::factory()->create();
        $this->asDevice($me);
        $this->postJson('/api/v1/statuses', ['type' => 'text', 'body' => ''])->assertJsonValidationErrors('body');
        $this->postJson('/api/v1/statuses', ['type' => 'image'])->assertJsonValidationErrors('file');
        $this->postJson('/api/v1/statuses', ['type' => 'text', 'body' => 'x', 'color' => '#000000'])->assertJsonValidationErrors('color');
    }
}
