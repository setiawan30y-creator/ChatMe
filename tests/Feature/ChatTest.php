<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_direct_chat_send_read_and_sync(): void
    {
        [$a, $b] = User::factory()->count(2)->create();

        $conv = $this->asDevice($a)->postJson('/api/v1/conversations', ['type' => 'direct', 'user_id' => $b->id])
            ->assertCreated()->json('conversation');
        // Membuka lagi percakapan yang sama tidak membuat duplikat.
        $this->postJson('/api/v1/conversations', ['type' => 'direct', 'user_id' => $b->id])->assertOk()->assertJsonPath('conversation.id', $conv['id']);

        $uuid = (string) Str::uuid();
        $msg = $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'Halo', 'client_uuid' => $uuid])
            ->assertCreated()->json('message');
        // Idempoten: kirim ulang dengan client_uuid yang sama tidak menggandakan.
        $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'Halo', 'client_uuid' => $uuid])
            ->assertOk()->assertJsonPath('message.id', $msg['id']);
        $this->assertSame(1, \App\Models\Message::count());

        $this->asDevice($b)->getJson('/api/v1/conversations')->assertOk()
            ->assertJsonPath('data.0.unread_count', 1)->assertJsonPath('data.0.title', $a->name);
        $this->getJson('/api/v1/sync?after=0')->assertOk()->assertJsonPath('messages.0.body', 'Halo')->assertJsonPath('cursor', $msg['id']);
        $this->postJson("/api/v1/conversations/{$conv['id']}/receipt", ['read_up_to' => $msg['id']])->assertOk()
            ->assertJson(['last_read_message_id' => $msg['id'], 'last_delivered_message_id' => $msg['id']]);
        $this->getJson('/api/v1/conversations')->assertJsonPath('data.0.unread_count', 0);
    }

    public function test_outsider_cannot_read_or_write(): void
    {
        [$a, $b, $c] = User::factory()->count(3)->create();
        $conv = $this->asDevice($a)->postJson('/api/v1/conversations', ['type' => 'direct', 'user_id' => $b->id])->json('conversation');
        $msg = $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'Rahasia'])->json('message');

        $this->asDevice($c);
        $this->getJson("/api/v1/conversations/{$conv['id']}/messages")->assertNotFound();
        $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'x'])->assertNotFound();
        $this->deleteJson("/api/v1/messages/{$msg['id']}")->assertNotFound();
        $this->getJson('/api/v1/sync?after=0')->assertJsonCount(0, 'messages');
    }

    public function test_edit_delete_and_react(): void
    {
        [$a, $b] = User::factory()->count(2)->create();
        $conv = $this->asDevice($a)->postJson('/api/v1/conversations', ['type' => 'direct', 'user_id' => $b->id])->json('conversation');
        $msg = $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'Salah ketik'])->json('message');

        $this->patchJson("/api/v1/messages/{$msg['id']}", ['body' => 'Benar'])->assertOk()->assertJsonPath('message.edited', true);
        $this->postJson("/api/v1/messages/{$msg['id']}/reactions", ['emoji' => '👍'])->assertJsonPath('message.reactions.0.count', 1);

        $this->asDevice($b);
        $this->patchJson("/api/v1/messages/{$msg['id']}", ['body' => 'Hack'])->assertForbidden();
        $this->deleteJson("/api/v1/messages/{$msg['id']}")->assertForbidden();

        $this->asDevice($a);
        $this->deleteJson("/api/v1/messages/{$msg['id']}")->assertOk()->assertJsonPath('message.deleted', true)->assertJsonPath('message.body', null);
    }

    public function test_group_lifecycle_and_send_policy(): void
    {
        [$owner, $m1, $m2, $late] = User::factory()->count(4)->create();
        $conv = $this->asDevice($owner)->postJson('/api/v1/conversations', ['type' => 'group', 'name' => 'Tim', 'member_ids' => [$m1->id, $m2->id]])
            ->assertCreated()->assertJsonPath('conversation.role', 'owner')->json('conversation');
        $this->assertCount(3, $conv['members']);

        $this->patchJson("/api/v1/conversations/{$conv['id']}", ['send_policy' => 'admins'])->assertOk();

        $this->asDevice($m1);
        $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'boleh?'])->assertForbidden();
        $this->patchJson("/api/v1/conversations/{$conv['id']}", ['name' => 'X'])->assertForbidden();

        $this->asDevice($owner);
        $this->patchJson("/api/v1/conversations/{$conv['id']}/members/{$m1->id}", ['role' => 'admin'])->assertOk();
        $this->postJson("/api/v1/conversations/{$conv['id']}/members", ['user_ids' => [$late->id]])->assertOk();
        $this->deleteJson("/api/v1/conversations/{$conv['id']}/members/{$m2->id}")->assertOk();

        $this->asDevice($m1);
        $this->postJson("/api/v1/conversations/{$conv['id']}/messages", ['body' => 'Admin bisa'])->assertCreated();

        $this->asDevice($m2);
        $this->getJson("/api/v1/conversations/{$conv['id']}")->assertNotFound();

        $this->asDevice($owner);
        $this->postJson("/api/v1/conversations/{$conv['id']}/leave")->assertOk();
        $this->assertSame('owner', Conversation::find($conv['id'])->membershipFor($m1)->role);
    }

    public function test_attachments_are_private(): void
    {
        Storage::fake('local');
        [$a, $b, $c] = User::factory()->count(3)->create();
        $conv = $this->asDevice($a)->postJson('/api/v1/conversations', ['type' => 'direct', 'user_id' => $b->id])->json('conversation');
        $msg = $this->post("/api/v1/conversations/{$conv['id']}/messages", [
            'files' => [UploadedFile::fake()->image('foto.jpg', 40, 40)],
        ], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('message.type', 'image')->json('message');

        $id = $msg['attachments'][0]['id'];
        $this->asDevice($b)->get("/api/v1/attachments/{$id}")->assertOk();
        $this->asDevice($c)->getJson("/api/v1/attachments/{$id}")->assertNotFound();
    }

    public function test_user_search_by_exact_phone_only(): void
    {
        $me = User::factory()->create();
        User::factory()->create(['phone' => '6281299990000', 'name' => 'Kontak Kerja']);
        $this->asDevice($me);
        $this->getJson('/api/v1/users/search?q=081299990000')->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/users/search?q=8129999')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/users/search?q=kontak')->assertJsonCount(1, 'data');
    }
}
