<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResearchItemRequest;
use App\Jobs\AnalyzeResearchItem;
use App\Models\ResearchItem;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ResearchController extends Controller
{
    public function index(Request $request): Response
    {
        $items = $request->user()
            ->researchItems()
            ->latest()
            ->paginate(12);

        return Inertia::render('research/index', [
            'items' => $items,
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
