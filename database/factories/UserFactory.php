<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'phone' => '628'.fake()->unique()->numerify('##########'),
            'name' => fake()->name(),
            'about' => null,
            'locale' => 'id',
            'phone_verified_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }
}
