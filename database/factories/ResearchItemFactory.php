<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ResearchItem>
 */
class ResearchItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement(['image', 'document', 'url']),
            'title' => fake()->sentence(4),
            'ai_summary' => fake()->paragraph(),
            'metadata' => [],
        ];
    }

    public function image(): static
    {
        return $this->state(fn () => [
            'type' => 'image',
            'file_path' => 'research/'.fake()->uuid().'.jpg',
        ]);
    }

    public function document(): static
    {
        return $this->state(fn () => [
            'type' => 'document',
            'file_path' => 'research/'.fake()->uuid().'.pdf',
        ]);
    }

    public function url(): static
    {
        return $this->state(fn () => [
            'type' => 'url',
            'original_url' => fake()->url(),
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'ai_summary' => null,
            'provider_file_id' => null,
        ]);
    }
}
