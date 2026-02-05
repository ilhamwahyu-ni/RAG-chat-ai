<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkStoreResearchItemRequest;
use App\Http\Requests\StoreResearchItemRequest;
use App\Http\Requests\UpdateResearchItemRequest;
use App\Jobs\AnalyzeResearchItem;
use App\Models\ResearchItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResearchController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->query('search', '');
        $category = $request->query('category', '');

        $query = $request->user()
            ->researchItems()
            ->search($search)
            ->category($category)
            ->latest();

        return Inertia::render('research/index', [
            'items' => Inertia::scroll(fn () => $query->paginate(12)->withQueryString()),
            'filters' => [
                'search' => $search,
                'category' => $category,
            ],
            'stats' => fn () => [
                'total' => $request->user()->researchItems()->count(),
                'images' => $request->user()->researchItems()->where('type', 'image')->count(),
                'documents' => $request->user()->researchItems()->where('type', 'document')->count(),
                'urls' => $request->user()->researchItems()->where('type', 'url')->count(),
            ],
            'categories' => Inertia::lazy(fn () => $request->user()
                ->researchItems()
                ->select(DB::raw("json_extract(metadata, '$.category') as category"), DB::raw('count(*) as count'))
                ->whereNotNull(DB::raw("json_extract(metadata, '$.category')"))
                ->groupBy('category')
                ->pluck('count', 'category')
                ->toArray()),
        ]);
    }

    public function show(Request $request, ResearchItem $item): Response
    {
        abort_if($item->user_id !== $request->user()->id, 403);

        return Inertia::render('research/show', [
            'item' => $item,
        ]);
    }

    public function store(StoreResearchItemRequest $request): RedirectResponse
    {
        $user = $request->user();
        $type = $request->validated('type');

        $item = new ResearchItem([
            'user_id' => $user->id,
            'type' => $type,
            'title' => $this->generateTitle($request),
            'user_notes' => $request->validated('notes'),
        ]);

        if ($type === 'url') {
            $item->original_url = $request->validated('url');
        } else {
            $file = $request->file('file');
            $path = $file->store('research/'.$user->id, 'local');
            $item->file_path = $path;
            $item->metadata = [
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ];
        }

        $item->save();

        AnalyzeResearchItem::dispatch($item);

        return redirect()->route('research.index')
            ->with('success', 'Item captured! Analysis in progress...');
    }

    public function bulkStore(BulkStoreResearchItemRequest $request): RedirectResponse
    {
        $user = $request->user();
        $fileNotes = $request->validated('file_notes', []);
        $urlNotes = $request->validated('url_notes', []);
        $count = 0;

        foreach ($request->file('files', []) as $index => $file) {
            $type = str_starts_with($file->getMimeType(), 'image/') ? 'image' : 'document';
            $path = $file->store('research/'.$user->id, 'local');

            $item = ResearchItem::create([
                'user_id' => $user->id,
                'type' => $type,
                'title' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
                'user_notes' => $fileNotes[$index] ?? null,
                'file_path' => $path,
                'metadata' => [
                    'original_name' => $file->getClientOriginalName(),
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ],
            ]);

            AnalyzeResearchItem::dispatch($item);
            $count++;
        }

        foreach ($request->validated('urls', []) as $index => $url) {
            $parsed = parse_url($url);

            $item = ResearchItem::create([
                'user_id' => $user->id,
                'type' => 'url',
                'title' => $parsed['host'] ?? 'Web Page',
                'original_url' => $url,
                'user_notes' => $urlNotes[$index] ?? null,
            ]);

            AnalyzeResearchItem::dispatch($item);
            $count++;
        }

        return redirect()->route('research.index')
            ->with('success', "{$count} items captured! Analysis in progress...");
    }

    public function update(UpdateResearchItemRequest $request, ResearchItem $item): RedirectResponse
    {
        $item->update($request->validated());

        return redirect()->route('research.show', $item)
            ->with('success', 'Item updated.');
    }

    public function serveFile(Request $request, ResearchItem $item): StreamedResponse
    {
        abort_if($item->user_id !== $request->user()->id, 403);
        abort_unless($item->file_path && Storage::disk('local')->exists($item->file_path), 404);

        $mime = $item->metadata['mime_type'] ?? 'application/octet-stream';
        $name = $item->metadata['original_name'] ?? 'file';

        return Storage::disk('local')->response($item->file_path, $name, [
            'Content-Type' => $mime,
        ]);
    }

    public function destroy(Request $request, ResearchItem $item): RedirectResponse
    {
        if ($item->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($item->file_path) {
            Storage::disk('local')->delete($item->file_path);
        }

        $item->delete();

        return redirect()->route('research.index')
            ->with('success', 'Item deleted.');
    }

    protected function generateTitle(StoreResearchItemRequest $request): string
    {
        $type = $request->validated('type');

        if ($type === 'url') {
            $url = $request->validated('url');
            $parsed = parse_url($url);

            return $parsed['host'] ?? 'Web Page';
        }

        $file = $request->file('file');

        return pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
    }
}
