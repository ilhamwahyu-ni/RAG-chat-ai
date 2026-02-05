import { Head, router, usePage } from '@inertiajs/react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { ChatInterface } from '@/components/chat/chat-interface';
import {
    FeatureBadge,
    FeatureBadgeGroup,
} from '@/components/demo/feature-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import research from '@/routes/research';
import type { BreadcrumbItem } from '@/types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    tool_calls: string;
    created_at: string;
}

interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    conversations: Conversation[];
    currentConversation: Conversation | null;
    messages: Message[];
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Research',
        href: research.index().url,
    },
    {
        title: 'Chat',
        href: research.chat().url,
    },
];

export default function ResearchChat() {
    const { conversations, currentConversation, messages, flash } =
        usePage<PageProps>().props;

    const handleNewChat = () => {
        router.visit(research.chat().url);
    };

    const handleSelectConversation = (conversationId: string) => {
        router.visit(
            research.chat({ mergeQuery: { conversation: conversationId } }).url,
        );
    };

    const handleDeleteConversation = (
        e: React.MouseEvent,
        conversationId: string,
    ) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;
        router.delete(research.chat.destroy(conversationId).url, {
            preserveScroll: true,
        });
    };

    // Parse tool_calls JSON from stored messages
    const parsedMessages = messages.map((m) => {
        let toolCalls: string[] = [];
        try {
            const parsed = JSON.parse(m.tool_calls || '[]');
            toolCalls = parsed
                .map((tc: { name?: string }) => tc.name)
                .filter(Boolean);
        } catch {
            // Ignore parse errors
        }
        return {
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            toolCalls,
        };
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Research Chat" />

            <div className="flex h-[calc(100vh-120px)] overflow-hidden">
                {/* Sidebar - Conversation List */}
                <div className="hidden w-72 shrink-0 flex-col border-r border-border/50 bg-muted/20 md:flex">
                    <div className="border-b border-border/50 p-4">
                        <Button
                            onClick={handleNewChat}
                            className="w-full"
                            variant="outline"
                        >
                            <Plus className="size-4" />
                            New Chat
                        </Button>
                    </div>

                    {/* Conversation History Feature Badge */}
                    <div className="border-b border-border/50 px-4 py-2">
                        <FeatureBadge
                            feature="conversation"
                            className="w-full justify-center"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {conversations.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No conversations yet
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {conversations.map((conversation) => (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        onClick={() =>
                                            handleSelectConversation(
                                                conversation.id,
                                            )
                                        }
                                        className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                                            currentConversation?.id ===
                                            conversation.id
                                                ? 'bg-primary/10 text-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <MessageSquare className="mt-0.5 size-4 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {conversation.title ||
                                                    'New conversation'}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {new Date(
                                                    conversation.created_at,
                                                ).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) =>
                                                handleDeleteConversation(
                                                    e,
                                                    conversation.id,
                                                )
                                            }
                                            className="p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Middleware Feature Badge */}
                    <div className="border-t border-border/50 px-4 py-3">
                        <FeatureBadge
                            feature="middleware"
                            className="w-full justify-center"
                        />
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                            Messages auto-saved via RememberConversation
                        </p>
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex flex-1 flex-col">
                    {/* Feature Badges Header */}
                    <div className="border-b border-border/50 bg-muted/10 px-4 py-3">
                        <FeatureBadgeGroup
                            features={[
                                'agent',
                                'streaming',
                                'file-search',
                                'web-search',
                            ]}
                            className="justify-center"
                        />
                    </div>

                    {flash?.success && (
                        <div className="border-b border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-600 dark:text-green-400">
                            {flash.success}
                        </div>
                    )}

                    <ChatInterface
                        initialMessages={parsedMessages}
                        conversationId={currentConversation?.id || null}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
