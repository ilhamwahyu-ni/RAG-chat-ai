import { router } from '@inertiajs/react';
import { Loader2, Search, Send, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import research from '@/routes/research';
import { Message } from './message';

interface MessageData {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    toolCalls?: string[];
}

interface StreamEvent {
    type: string;
    delta?: string;
    tool_name?: string;
    invocation_id?: string;
    [key: string]: unknown;
}

interface ChatInterfaceProps {
    initialMessages?: MessageData[];
    conversationId?: string | null;
    onConversationCreated?: (id: string) => void;
}

export function ChatInterface({
    initialMessages = [],
    conversationId: initialConversationId = null,
    onConversationCreated,
}: ChatInterfaceProps) {
    const [messages, setMessages] = useState<MessageData[]>(initialMessages);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [activeTools, setActiveTools] = useState<string[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(initialConversationId);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent, scrollToBottom]);

    const getToolDisplayName = (toolName: string): string => {
        const names: Record<string, string> = {
            file_search: 'Searching knowledge base',
            web_search: 'Searching the web',
        };
        return names[toolName] || `Using ${toolName}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isStreaming) return;

        const userMessage: MessageData = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');
        setActiveTools([]);

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;

            const response = await fetch(research.message().url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                    'X-CSRF-TOKEN': csrfToken || '',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    conversation_id: conversationId,
                }),
            });

            if (!response.ok) throw new Error('Failed to send message');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';
            const toolsUsed: string[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();

                            if (data === '[DONE]') {
                                // Stream complete - refresh to get conversation ID if new
                                if (!conversationId) {
                                    router.reload({ only: ['conversations', 'currentConversation'] });
                                }
                                continue;
                            }

                            try {
                                const event: StreamEvent = JSON.parse(data);

                                switch (event.type) {
                                    case 'text_delta':
                                        if (event.delta) {
                                            fullContent += event.delta;
                                            setStreamingContent(fullContent);
                                        }
                                        break;

                                    case 'tool_call':
                                        if (event.tool_name && !toolsUsed.includes(event.tool_name)) {
                                            toolsUsed.push(event.tool_name);
                                            setActiveTools([...toolsUsed]);
                                        }
                                        break;

                                    case 'tool_result':
                                        // Tool finished, could update UI here
                                        break;

                                    case 'stream_end':
                                        // Stream finished
                                        break;
                                }
                            } catch {
                                // Ignore parse errors for incomplete JSON
                            }
                        }
                    }
                }
            }

            const assistantMessage: MessageData = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: fullContent,
                toolCalls: toolsUsed,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage: MessageData = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.',
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsStreaming(false);
            setStreamingContent('');
            setActiveTools([]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 && !isStreaming ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-indigo-600/20">
                            <Sparkles className="size-8 text-violet-500" />
                        </div>
                        <h3 className="mt-4 text-xl font-semibold text-foreground">Start a conversation</h3>
                        <p className="mt-2 max-w-sm text-muted-foreground">
                            Ask questions about your saved research. I'll search your knowledge base and the web to
                            find answers.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-2">
                            {['What have I saved about AI?', 'Summarize my recent research', 'Find connections in my notes'].map(
                                (suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setInput(suggestion)}
                                        className="rounded-full border border-border/50 bg-muted/30 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
                                    >
                                        {suggestion}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto max-w-3xl space-y-6">
                        {messages.map((message) => (
                            <Message
                                key={message.id}
                                role={message.role}
                                content={message.content}
                                toolCalls={message.toolCalls}
                            />
                        ))}
                        {isStreaming && (
                            <>
                                {activeTools.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {activeTools.map((tool) => (
                                            <div
                                                key={tool}
                                                className="flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-sm text-violet-600 dark:text-violet-400"
                                            >
                                                <Search className="size-3.5 animate-pulse" />
                                                {getToolDisplayName(tool)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {streamingContent ? (
                                    <Message role="assistant" content={streamingContent} isStreaming />
                                ) : (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Loader2 className="size-5 animate-spin" />
                                        <span>Thinking...</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-border/50 bg-background/80 p-4 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
                    <div className="relative flex items-end gap-3 rounded-2xl border border-border/50 bg-muted/30 p-2 transition-colors focus-within:border-border focus-within:bg-muted/50">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your research..."
                            rows={1}
                            className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none"
                            style={{
                                height: 'auto',
                                minHeight: '40px',
                            }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
                            }}
                        />
                        <Button type="submit" size="icon" disabled={!input.trim() || isStreaming} className="size-10 shrink-0 rounded-xl">
                            {isStreaming ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        </Button>
                    </div>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                        AI searches your knowledge base and the web to answer questions
                    </p>
                </form>
            </div>
        </div>
    );
}
