import { ExternalLink, FileCode, Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FeatureType =
    | 'streaming'
    | 'agent'
    | 'file-search'
    | 'web-search'
    | 'vector-store'
    | 'conversation'
    | 'vision'
    | 'broadcasting'
    | 'categorization';

interface FeatureInfo {
    label: string;
    description: string;
    file: string;
    lineRange?: string;
    code: string;
    prefix?: string;
    docUrl?: string;
}

const featureDetails: Record<FeatureType, FeatureInfo> = {
    streaming: {
        label: 'Streaming',
        description:
            'Returning a StreamableAgentResponse streams tokens over SSE, with Laravel handling headers and buffering.',
        file: 'app/Http/Controllers/ConversationController.php',
        lineRange: '62-79',
        code: `public function stream(SendMessageRequest $request): StreamableAgentResponse
{
    $user = $request->user();
    $conversationId = $request->validated('conversation_id');
    $message = $request->validated('message');

    $agent = new ResearchAgent($user);

    if ($conversationId) {
        $this->authorizeConversation($conversationId, $user->id);
        $agent->continue($conversationId, as: $user);
    } else {
        $agent->forUser($user);
    }

    return $agent->stream($message);
}`,
    },
    agent: {
        label: 'Agent',
        description:
            'Agents implement interfaces defining their behavior. Attributes configure provider and temperature.',
        file: 'app/Agents/ResearchAgent.php',
        lineRange: '17-26',
        code: `#[Provider('openai')]
#[Temperature(0.7)]
class ResearchAgent implements Agent, Conversational, HasTools
{
    use Promptable;
    use RemembersConversations;

    public function __construct(protected User $user) {}
}`,
    },
    'file-search': {
        label: 'FileSearch',
        description:
            'Semantic search over vector store files. The agent decides when to retrieve relevant chunks.',
        file: 'app/Agents/ResearchAgent.php',
        lineRange: '45-57',
        code: `public function tools(): iterable
{
    $tools = [];

    if ($this->user->hasVectorStore()) {
        $tools[] = new FileSearch(stores: [$this->user->vector_store_id]);
    }

    $tools[] = new WebSearch;

    return $tools;
}`,
    },
    'web-search': {
        label: 'WebSearch',
        description:
            'AI-powered web search. The agent autonomously searches when it needs current information.',
        file: 'app/Agents/ResearchAgent.php',
        lineRange: '56',
        code: `$tools[] = new WebSearch;`,
    },
    'vector-store': {
        label: 'Vector Store',
        description:
            "OpenAI's managed vector storage. Files are auto-chunked, embedded, and indexed. No pgvector needed.",
        file: 'app/Jobs/AnalyzeResearchItem.php',
        lineRange: '54-74',
        code: `protected function ensureUserHasVectorStore($user): void
{
    if (! $user->hasVectorStore()) {
        $store = Stores::create("user-{$user->id}-research");
        $user->update(['vector_store_id' => $store->id]);
    }
}`,
    },
    conversation: {
        label: 'Conversational',
        description:
            'RemembersConversations persists and loads message history. Use continue() or forUser() to manage state.',
        file: 'app/Http/Controllers/ConversationController.php',
        lineRange: '70-77',
        code: `$agent = new ResearchAgent($user);

if ($conversationId) {
    $this->authorizeConversation($conversationId, $user->id);
    $agent->continue($conversationId, as: $user);
} else {
    $agent->forUser($user);
}

return $agent->stream($message);`,
    },
    vision: {
        label: 'Vision',
        description:
            'Multi-modal image analysis by attaching stored images to an agent prompt.',
        file: 'app/Jobs/AnalyzeResearchItem.php',
        lineRange: '77-86',
        code: `protected function analyzeImage(): void
{
    $agent = AnalysisAgent::forImage();

    $response = $agent->prompt(
        'Analyze this image and provide a detailed description.',
        attachments: [
            Image::fromStorage($this->item->file_path),
        ]
    );

    $summary = $response->text;
}`,
    },
    broadcasting: {
        label: 'Broadcasting',
        prefix: 'Laravel',
        docUrl: 'https://laravel.com/docs/12.x/broadcasting',
        description:
            'ShouldBroadcast events push real-time updates via Reverb WebSockets. The AI analysis job dispatches an event when complete — the frontend listens and auto-refreshes.',
        file: 'app/Events/ResearchItemAnalyzed.php',
        lineRange: '12-41',
        code: `class ResearchItemAnalyzed implements ShouldBroadcast
{
    public function __construct(
        public ResearchItem $item,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('App.Models.User.'.$this->item->user_id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->item->id,
            'title' => $this->item->title,
            'ai_summary' => $this->item->ai_summary,
        ];
    }
}`,
    },
    categorization: {
        label: 'Structured Output',
        description:
            'Anonymous agent() with a JSON schema constrains the AI to return a structured category. The enum() method on the schema type accepts a BackedEnum class-string directly.',
        file: 'app/Jobs/AnalyzeResearchItem.php',
        lineRange: '214-224',
        code: `protected function categorize(string $content): string
{
    $response = agent(
        instructions: 'You are a content categorizer. Categorize the following content into the single most appropriate category.',
        schema: fn (JsonSchema $schema) => [
            'category' => $schema->string()
                ->enum(ResearchCategory::class)->required(),
        ],
    )->prompt($content);

    return ResearchCategory::tryFrom($response['category'])?->value
        ?? ResearchCategory::Other->value;
}`,
    },
};

interface FeatureBadgeProps {
    feature: FeatureType;
    className?: string;
    showLabel?: boolean;
}

export function FeatureBadge({
    feature,
    className,
    showLabel = true,
}: FeatureBadgeProps) {
    const info = featureDetails[feature];

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20',
                        className,
                    )}
                >
                    <Info className="size-3" />
                    {showLabel && (
                        <span>
                            {info.prefix ?? 'AI SDK'}: {info.label}
                        </span>
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent
                className="max-w-lg bg-card p-0 text-card-foreground"
                side="bottom"
                align="start"
            >
                <div className="p-3">
                    <div className="flex items-center justify-between gap-4">
                        <h4 className="font-semibold text-primary">
                            {info.label}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <FileCode className="size-3" />
                            <span className="font-mono">{info.file}</span>
                            {info.lineRange && (
                                <span className="opacity-60">
                                    :{info.lineRange}
                                </span>
                            )}
                        </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {info.description}
                    </p>
                    <pre className="mt-3 overflow-x-auto rounded-md border border-border bg-background p-3 text-xs leading-relaxed">
                        <code className="text-primary">{info.code}</code>
                    </pre>
                    <a
                        href={
                            info.docUrl ??
                            'https://laravel.com/docs/12.x/ai-sdk'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                        <ExternalLink className="size-3" />
                        {info.docUrl
                            ? 'Laravel Documentation'
                            : 'AI SDK Documentation'}
                    </a>
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

interface FeatureBadgeGroupProps {
    features: FeatureType[];
    className?: string;
}

export function FeatureBadgeGroup({
    features,
    className,
}: FeatureBadgeGroupProps) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className="text-xs text-muted-foreground">Powered by:</span>
            {features.map((feature) => (
                <FeatureBadge key={feature} feature={feature} />
            ))}
        </div>
    );
}
