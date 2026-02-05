<?php

namespace App\Jobs;

use App\Agents\AnalysisAgent;
use App\Models\ResearchItem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Laravel\Ai\Files;
use Laravel\Ai\Files\LocalImage;
use Laravel\Ai\Stores;

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

        $this->item->update([
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
        ]);

        $this->addToVectorStore($summary);
    }

    protected function analyzeDocument(): void
    {
        $path = Storage::disk('local')->path($this->item->file_path);

        $file = Files::putFromPath($path, provider: 'openai');

        $store = Stores::get($this->item->user->vector_store_id, provider: 'openai');
        $store->add($file);

        $this->item->update([
            'provider_file_id' => $file->id,
            'ai_summary' => 'Document uploaded to knowledge base. Contents are searchable.',
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

        $this->item->update([
            'ai_summary' => $summary,
            'title' => $this->generateTitle($summary),
        ]);

        $this->addToVectorStore("URL: {$url}\n\n{$summary}\n\nOriginal content:\n{$content}");
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
        $title = substr($summary, 0, 80);

        if (strlen($summary) > 80) {
            $title = substr($title, 0, strrpos($title, ' ')).'...';
        }

        return $title;
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
