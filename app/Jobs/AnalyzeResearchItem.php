<?php

namespace App\Jobs;

use App\Agents\AnalysisAgent;
use App\Enums\ResearchCategory;
use App\Events\ResearchItemAnalyzed;
use App\Models\ResearchItem;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Files;
use Laravel\Ai\Files\Document;
use Laravel\Ai\Files\LocalImage;
use Laravel\Ai\Stores;

use function Laravel\Ai\agent;

class AnalyzeResearchItem implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(
        public ResearchItem $item,
    ) {}

    public function handle(): void
    {
        $user = $this->item->user;

        $this->ensureUserHasVectorStore($user);

        match ($this->item->type) {
            'image' => $this->analyzeImage(),
            'document' => $this->analyzeDocument(),
            'url' => $this->analyzeUrl(),
        };

        $this->item->refresh();
        ResearchItemAnalyzed::dispatch($this->item);
    }

    protected function ensureUserHasVectorStore($user): void
    {
        if ($user->hasVectorStore()) {
            return;
        }

        $store = Stores::create(
            name: "user-{$user->id}-research",
            description: "Personal research knowledge base for user {$user->id}",
            provider: 'openai'
        );

        $user->update(['vector_store_id' => $store->id]);
    }

    protected function analyzeImage(): void
    {
        $path = Storage::disk('local')->path($this->item->file_path);
        $mimeType = $this->item->metadata['mime_type'] ?? 'image/jpeg';

        $agent = AnalysisAgent::forImage();

        $response = $agent->prompt(
            'Analyze this image and provide a detailed description.',
            attachments: [
                new LocalImage($path, $mimeType),
            ]
        );

        $summary = $response->text;
        $category = $this->categorize($summary);

        $this->item->update([
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
            'metadata' => array_merge($this->item->metadata ?? [], ['category' => $category]),
        ]);

        $this->addToVectorStore($summary);
    }

    protected function analyzeDocument(): void
    {
        $path = Storage::disk('local')->path($this->item->file_path);

        $file = Files::putFromPath($path, provider: 'openai');

        $store = Stores::get($this->item->user->vector_store_id, provider: 'openai');
        $store->add($file);

        $agent = AnalysisAgent::forDocument();
        $response = $agent->prompt(
            'Analyze and summarize this document.',
            attachments: [
                Document::fromPath($path),
            ]
        );

        $summary = $response->text;
        $category = $this->categorize($summary);

        $this->item->update([
            'provider_file_id' => $file->id,
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
            'metadata' => array_merge($this->item->metadata ?? [], ['category' => $category]),
        ]);
    }

    protected function analyzeUrl(): void
    {
        $url = $this->item->original_url;

        try {
            $response = Http::timeout(30)->get($url);
            $content = $this->extractTextFromHtml($response->body());
        } catch (\Exception $e) {
            $content = "Failed to fetch URL: {$url}";
        }

        $agent = AnalysisAgent::forUrl();

        $response = $agent->prompt(
            "Summarize this webpage content from {$url}:\n\n{$content}"
        );

        $summary = $response->text;
        $category = $this->categorize($summary);

        $this->item->update([
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
            'metadata' => array_merge($this->item->metadata ?? [], ['category' => $category]),
        ]);

        $this->addToVectorStore("URL: {$url}\n\n{$summary}\n\nOriginal content:\n{$content}");
    }

    protected function categorize(string $content): string
    {
        $response = agent(
            instructions: 'You are a content categorizer. Categorize the following content into the single most appropriate category.',
            schema: fn (JsonSchema $schema) => [
                'category' => $schema->string()->enum(ResearchCategory::class)->required(),
            ],
        )->prompt($content);

        return ResearchCategory::tryFrom($response['category'])?->value
            ?? ResearchCategory::Other->value;
    }

    protected function addToVectorStore(string $content): void
    {
        $user = $this->item->user;

        // Include user notes as additional context for search
        if ($this->item->user_notes) {
            $content .= "\n\nUser notes: {$this->item->user_notes}";
        }

        $file = Files::put(
            $content,
            mime: 'text/plain',
            name: "research-{$this->item->id}.txt",
            provider: 'openai'
        );

        $store = Stores::get($user->vector_store_id, provider: 'openai');
        $store->add($file, metadata: [
            'research_item_id' => $this->item->id,
            'type' => $this->item->type,
        ]);

        $this->item->update(['provider_file_id' => $file->id]);
    }

    protected function generateTitle(string $summary): string
    {
        $response = agent(
            instructions: 'Generate a short, descriptive title (max 60 characters) for the following content. The title should capture the core subject clearly and concisely. Do not use quotes around the title.',
            schema: fn (JsonSchema $schema) => [
                'title' => $schema->string()->required(),
            ],
        )->prompt($summary);

        return substr($response['title'], 0, 100);
    }

    protected function extractTextFromHtml(string $html): string
    {
        $html = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
        $html = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', $html);
        $html = preg_replace('/<[^>]+>/', ' ', $html);
        $html = html_entity_decode($html);
        $html = preg_replace('/\s+/', ' ', $html);

        return trim(substr($html, 0, 15000));
    }
}
