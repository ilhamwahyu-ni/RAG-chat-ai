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

// --- Bulk Upload Tests ---

it('can bulk upload multiple files', function () {
    $user = User::factory()->create();
    $files = [
        UploadedFile::fake()->image('photo1.png'),
        UploadedFile::fake()->image('photo2.jpg'),
        UploadedFile::fake()->create('report.pdf', 100, 'application/pdf'),
    ];

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'files' => $files,
            'notes' => 'Batch upload notes',
        ])
        ->assertRedirect(route('research.index'))
        ->assertSessionHas('success', '3 items captured! Analysis in progress...');

    expect(ResearchItem::where('user_id', $user->id)->count())->toBe(3);
    expect(ResearchItem::where('user_id', $user->id)->where('type', 'image')->count())->toBe(2);
    expect(ResearchItem::where('user_id', $user->id)->where('type', 'document')->count())->toBe(1);

    Queue::assertPushed(AnalyzeResearchItem::class, 3);
});

it('can bulk upload URLs', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'urls' => "https://example.com/article-1\nhttps://example.com/article-2\nhttps://example.com/article-3",
        ])
        ->assertRedirect(route('research.index'))
        ->assertSessionHas('success', '3 items captured! Analysis in progress...');

    expect(ResearchItem::where('user_id', $user->id)->where('type', 'url')->count())->toBe(3);
    Queue::assertPushed(AnalyzeResearchItem::class, 3);
});

it('requires at least one file or URL for bulk upload', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [])
        ->assertSessionHasErrors(['files']);
});

it('applies batch notes to all bulk uploaded items', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('research.bulk-store'), [
            'urls' => 'https://example.com/article',
            'notes' => 'Shared batch notes',
        ])
        ->assertRedirect(route('research.index'));

    $item = ResearchItem::where('user_id', $user->id)->first();
    expect($item->user_notes)->toBe('Shared batch notes');
});

// --- Show & Update Tests ---

it('displays the research item show page', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('research.show', $item))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('research/show')
            ->has('item')
        );
});

it('cannot view another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->get(route('research.show', $item))
        ->assertForbidden();
});

it('can update a research items title and notes', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->put(route('research.update', $item), [
            'title' => 'Updated Title',
            'user_notes' => 'Updated notes here',
        ])
        ->assertRedirect(route('research.show', $item))
        ->assertSessionHas('success', 'Item updated.');

    $item->refresh();
    expect($item->title)->toBe('Updated Title');
    expect($item->user_notes)->toBe('Updated notes here');
});

it('cannot update another users research item', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->for($otherUser)->create();

    $this->actingAs($user)
        ->put(route('research.update', $item), [
            'title' => 'Hacked Title',
        ])
        ->assertForbidden();
});

it('validates title is required when updating', function () {
    $user = User::factory()->create();
    $item = ResearchItem::factory()->for($user)->create();

    $this->actingAs($user)
        ->put(route('research.update', $item), [
            'title' => '',
        ])
        ->assertSessionHasErrors(['title']);
});

// --- Serve File Tests ---

it('can serve an image file', function () {
    $user = User::factory()->create();

    $file = UploadedFile::fake()->image('test.png');
    $path = $file->store('research/'.$user->id, 'local');

    $item = ResearchItem::factory()->image()->for($user)->create([
        'file_path' => $path,
        'metadata' => [
            'original_name' => 'test.png',
            'mime_type' => 'image/png',
            'size' => $file->getSize(),
        ],
    ]);

    $this->actingAs($user)
        ->get(route('research.serve-file', $item))
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'image/png');
});

it('cannot serve another users file', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $item = ResearchItem::factory()->image()->for($otherUser)->create();

    $this->actingAs($user)
        ->get(route('research.serve-file', $item))
        ->assertForbidden();
});
