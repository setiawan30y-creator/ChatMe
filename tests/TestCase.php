<?php

namespace Tests;

use App\Models\Device;
use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /** Login sebagai perangkat bertoken (alur aplikasi Flutter). */
    protected function asDevice(User $user, ?Device &$device = null): static
    {
        $device = $user->devices()->create(['name' => 'Test', 'linked_via' => 'otp', 'last_active_at' => now()]);
        $token = $user->createToken('device:'.$device->id);
        $device->update(['token_id' => $token->accessToken->id]);

        $this->app['auth']->forgetGuards();

        return $this->withToken($token->plainTextToken);
    }
}
