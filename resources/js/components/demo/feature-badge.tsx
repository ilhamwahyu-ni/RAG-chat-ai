import { Code2, Info } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FeatureType =
    | 'streaming'
    | 'agent'
    | 'file-search'
    | 'web-search'
    | 'vector-store'
    | 'conversation'
    | 'middleware'
    | 'vision';

interface FeatureInfo {
    label: string;
    description: string;
    code: string;
    docs?: string;
}

const featureDetails: Record<FeatureType, FeatureInfo> = {
    streaming: {
        label: 'Streaming',
        description:
            'Real-time token streaming via Server-Sent Events. The StreamableAgentResponse implements Responsable, so you can return it directly from controllers.',
        code: `// Just return the stream - Laravel handles SSE
return $agent->stream($message);`,
        docs: 'StreamableAgentResponse',
    },
    agent: {
        label: 'Agent',
        description:
            'Agents encapsulate AI behavior with instructions, tools, and conversation handling. Use attributes for configuration.',
        code: `#[Provider('openai')]
#[Temperature(0.7)]
class ResearchAgent implements Agent, HasTools
{
    use Promptable;

    public function instructions(): string { ... }
    public function tools(): iterable { ... }
}`,
        docs: 'Agent Interface',
    },
    'file-search': {
        label: 'FileSearch',
        description:
            "OpenAI's built-in semantic search over your vector store. The AI automatically decides when to search based on the query.",
        code: `public function tools(): iterable
{
    return [
        new FileSearch([$this->user->vector_store_id]),
    ];
}`,
        docs: 'FileSearch Provider Tool',
    },
    'web-search': {
        label: 'WebSearch',
        description:
            'AI-powered web search. The agent autonomously searches the web when it needs more information beyond the knowledge base.',
        code: `public function tools(): iterable
{
    return [
        new WebSearch(),
    ];
}`,
        docs: 'WebSearch Provider Tool',
    },
    'vector-store': {
        label: 'Vector Store',
        description:
            "OpenAI's managed vector storage. Files are automatically chunked, embedded, and indexed. No pgvector setup required.",
        code: `// Create a store for the user
$store = Stores::create("user-{$user->id}");
$user->update(['vector_store_id' => $store->id]);

// Upload and index a file
$file = Files::put($document);
$store->add($file->id);`,
        docs: 'Stores & Files',
    },
    conversation: {
        label: 'Conversational',
        description:
            'Automatic conversation history management. The RemembersConversations trait handles loading previous messages into context.',
        code: `class ResearchAgent implements Conversational
{
    use RemembersConversations;
}

// Continue existing conversation
$agent->continue($conversationId, $user);

// Or start new
$agent->forUser($user);`,
        docs: 'Conversational Interface',
    },
    middleware: {
        label: 'Middleware',
        description:
            'Agent middleware runs before/after prompts. RememberConversation automatically persists messages to the database.',
        code: `class ResearchAgent implements HasMiddleware
{
    public function middleware(): array
    {
        return [
            RememberConversation::class,
        ];
    }
}`,
        docs: 'Agent Middleware',
    },
    vision: {
        label: 'Vision',
        description:
            'Multi-modal support for image analysis. Pass images as attachments and the AI can describe, analyze, or extract text.',
        code: `// Analyze an image
$response = $agent->prompt(
    'Describe this image',
    attachments: [new LocalImage($path)]
);`,
        docs: 'Vision & Attachments',
    },
};

interface FeatureBadgeProps {
    feature: FeatureType;
    className?: string;
    showLabel?: boolean;
}

export function FeatureBadge({ feature, className, showLabel = true }: FeatureBadgeProps) {
    const [showCode, setShowCode] = useState(false);
    const info = featureDetails[feature];

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-400',
                        className,
                    )}
                >
                    <Info className="size-3" />
                    {showLabel && <span>Laravel AI: {info.label}</span>}
                </button>
            </TooltipTrigger>
            <TooltipContent
                className="max-w-md bg-zinc-900 p-0 text-zinc-100"
                side="bottom"
                align="start"
            >
                <div className="p-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-violet-400">{info.label}</h4>
                        <button
                            type="button"
                            onClick={() => setShowCode(!showCode)}
                            className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-200"
                        >
                            <Code2 className="size-3" />
                            {showCode ? 'Hide' : 'Show'} Code
                        </button>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-300">{info.description}</p>
                    {showCode && (
                        <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-950 p-3 text-xs">
                            <code className="text-emerald-400">{info.code}</code>
                        </pre>
                    )}
                    {info.docs && (
                        <p className="mt-2 text-xs text-zinc-500">
                            📚 {info.docs}
                        </p>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

interface FeatureBadgeGroupProps {
    features: FeatureType[];
    className?: string;
}

export function FeatureBadgeGroup({ features, className }: FeatureBadgeGroupProps) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className="text-xs text-muted-foreground">Powered by:</span>
            {features.map((feature) => (
                <FeatureBadge key={feature} feature={feature} />
            ))}
        </div>
    );
}
