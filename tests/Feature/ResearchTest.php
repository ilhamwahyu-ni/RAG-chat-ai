<?php

use App\Jobs\AnalyzeResearchItem;
use App\Models\ResearchItem;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Queue::fake();
});

it('displays the research index page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('research.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('research/index'));
});

it('displays saved research items', function () {
    $user = User::factory()->create();
    $items = ResearchItem::factory(3)->for($user)->create();

    $this->actingAs($user)
        ->get(route('research.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/index')
            ->has('items.data', 3)
        );
});

it('can upload an image for analysis', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->image('screenshot.png');

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'image',
            'file' => $file,
        ])
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseHas('research_items', [
        'user_id' => $user->id,
        'type' => 'image',
    ]);

    Queue::assertPushed(AnalyzeResearchItem::class);
});

it('can upload a document for analysis', function () {
    $user = User::factory()->create();
    $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'document',
            'file' => $file,
        ])
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseHas('research_items', [
        'user_id' => $user->id,
        'type' => 'document',
    ]);

    Queue::assertPushed(AnalyzeResearchItem::class);
});

it('can capture a URL for analysis', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'url',
            'url' => 'https://example.com/article',
        ])
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseHas('research_items', [
        'user_id' => $user->id,
        'type' => 'url',
        'original_url' => 'https://example.com/article',
    ]);

    Queue::assertPushed(AnalyzeResearchItem::class);
});

it('validates required fields for upload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'image',
        ])
        ->assertSessionHasErrors(['file']);
});

it('validates required fields for URL capture', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.store'), [
            'type' => 'url',
        ])
        ->assertSessionHasErrors(['url']);
});

it('can delete a research item', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('research.destroy', $item))
        ->assertRedirect(route('research.index'));

    $this->assertDatabaseMissing('research_items', [
        'id' => $item->id,
    ]);
});

it('cannot delete another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->delete(route('research.destroy', $item))
        ->assertForbidden();
});

it('requires authentication to access research pages', function () {
    $this->get(route('research.index'))
        ->assertRedirect(route('login'));
});
