<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['chatme.otp.show_in_response' => true]);
    }

    public function test_register_with_otp_and_token_mode(): void
    {
        $otp = $this->postJson('/api/v1/auth/otp', ['phone' => '0812 3456 7890'])->assertOk()
            ->assertJson(['phone' => '6281234567890', 'is_new' => true])->json();

        $this->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => '000000', 'mode' => 'token'])
            ->assertStatus(422)->assertJsonValidationErrors('code');

        $res = $this->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => $otp['debug_code'], 'mode' => 'token'])
            ->assertOk()->assertJsonPath('user.needs_profile', true)->json();

        $this->assertNotEmpty($res['token']);
        $this->app['auth']->forgetGuards();
        $this->withToken($res['token'])->patchJson('/api/v1/me', ['name' => 'Nama Lengkap'])->assertOk()
            ->assertJsonPath('user.needs_profile', false);
        $this->assertDatabaseHas('users', ['phone' => '6281234567890', 'name' => 'Nama Lengkap']);
    }

    public function test_otp_cannot_be_reused_and_resend_is_throttled(): void
    {
        $code = $this->postJson('/api/v1/auth/otp', ['phone' => '081234567890'])->json('debug_code');
        $this->postJson('/api/v1/auth/otp', ['phone' => '081234567890'])->assertStatus(429);

        $this->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => $code, 'mode' => 'token'])->assertOk();
        $this->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => $code, 'mode' => 'token'])->assertStatus(422);
    }

    public function test_otp_locks_after_max_attempts(): void
    {
        $code = $this->postJson('/api/v1/auth/otp', ['phone' => '081234567890'])->json('debug_code');
        $wrong = $code === '111111' ? '222222' : '111111';
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => $wrong, 'mode' => 'token']);
        }
        $this->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => $code, 'mode' => 'token'])->assertStatus(422);
    }

    public function test_session_login_for_pwa(): void
    {
        $code = $this->postJson('/api/v1/auth/otp', ['phone' => '081234567890'])->json('debug_code');
        $headers = ['Referer' => 'http://localhost/', 'Origin' => 'http://localhost'];
        $this->withHeaders($headers)->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\PreventRequestForgery::class)
            ->postJson('/api/v1/auth/verify', ['phone' => '081234567890', 'code' => $code])->assertOk()
            ->assertJsonMissing(['token']);
        $this->withHeaders($headers)->getJson('/api/v1/me')->assertOk()->assertJsonPath('user.phone', '6281234567890');
    }

    public function test_revoked_device_is_rejected(): void
    {
        $user = User::factory()->create();
        $this->asDevice($user, $device)->getJson('/api/v1/me')->assertOk();
        $device->update(['revoked_at' => now()]);
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/me')->assertStatus(401);
    }

    public function test_guest_cannot_access_api(): void
    {
        $this->getJson('/api/v1/conversations')->assertStatus(401);
    }
}
