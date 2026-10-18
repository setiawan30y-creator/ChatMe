<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_link_new_device_with_code(): void
    {
        $user = User::factory()->create();

        $link = $this->postJson('/api/v1/devices/link-requests', ['device_name' => 'Laptop kantor'])->assertCreated()->json();
        $this->assertStringContainsString('<svg', $link['qr_svg']);
        $this->getJson("/api/v1/devices/link-requests/{$link['id']}?secret={$link['secret']}")->assertJson(['status' => 'pending']);
        $this->getJson("/api/v1/devices/link-requests/{$link['id']}?secret=salah")->assertNotFound();

        $this->asDevice($user);
        $this->postJson('/api/v1/devices/link/preview', ['code' => 'chatme-link:'.$link['code']])->assertOk()->assertJsonPath('link.device_name', 'Laptop kantor');
        $this->postJson('/api/v1/devices/link/approve', ['code' => strtolower(str_replace('-', '', $link['code']))])->assertOk();

        $this->app['auth']->forgetGuards();
        $res = $this->withToken('')->getJson("/api/v1/devices/link-requests/{$link['id']}?secret={$link['secret']}&mode=token")
            ->assertJson(['status' => 'linked'])->json();
        $this->assertNotEmpty($res['token']);
        // Sekali pakai
        $this->getJson("/api/v1/devices/link-requests/{$link['id']}?secret={$link['secret']}&mode=token")->assertJson(['status' => 'consumed']);

        $this->app['auth']->forgetGuards();
        $this->withToken($res['token'])->getJson('/api/v1/devices')->assertJsonCount(2, 'data');

        // Pencabutan jarak jauh
        $this->app['auth']->forgetGuards();
        $this->asDevice($user, $main)->deleteJson('/api/v1/devices/'.$res['device']['id'])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($res['token'])->getJson('/api/v1/me')->assertStatus(401);
    }

    public function test_device_limit_revokes_oldest(): void
    {
        config(['chatme.devices.max_active' => 2]);
        $user = User::factory()->create();
        $this->asDevice($user, $d1);
        $d1->update(['last_active_at' => now()->subDay()]);
        app(\App\Services\DeviceManager::class)->start($user, request());
        app(\App\Services\DeviceManager::class)->start($user, request());
        $this->assertNotNull($d1->fresh()->revoked_at);
        $this->assertSame(2, $user->devices()->whereNull('revoked_at')->count());
    }
}
