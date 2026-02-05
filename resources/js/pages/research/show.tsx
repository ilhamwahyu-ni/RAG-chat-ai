import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Download,
    ExternalLink,
    FileText,
    Globe,
    ImageIcon,
    Loader2,
    Save,
    Tag,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import research from '@/routes/research';
import type { BreadcrumbItem } from '@/types';

interface ResearchItem {
    id: string;
    type: 'image' | 'document' | 'url';
    title: string;
    original_url: string | null;
    file_path: string | null;
    ai_summary: string | null;
    user_notes: string | null;
    metadata: {
        original_name?: string;
        mime_type?: string;
        size?: number;
        category?: string;
    } | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    item: ResearchItem;
    flash?: { success?: string };
}

const typeConfig = {
    image: {
        icon: ImageIcon,
        color: 'bg-violet-500/10 text-violet-500',
        label: 'Image',
    },
    document: {
        icon: FileText,
        color: 'bg-blue-500/10 text-blue-500',
        label: 'Document',
    },
    url: {
        icon: Globe,
        color: 'bg-emerald-500/10 text-emerald-500',
        label: 'URL',
    },
};

export default function ResearchShow() {
    const { item, flash } = usePage<PageProps>().props;
    const config = typeConfig[item.type];
    const Icon = config.icon;

    const { data, setData, put, processing, errors } = useForm({
        title: item.title,
        user_notes: item.user_notes ?? '',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Research', href: research.index().url },
        { title: item.title, href: research.show(item.id).url },
    ];

    const [isDeleting, setIsDeleting] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(research.update(item.id).url);
    };

    const handleDelete = () => {
        if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return;

        setIsDeleting(true);
        router.delete(research.destroy(item.id).url);
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown size';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={item.title} />

            <div className="p-6">
                {flash?.success && (
                    <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {/* Back link */}
                <Link
                    href={research.index().url}
                    className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Research Library
                </Link>

                <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                    {/* Main Content */}
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="flex-1">
                                <div className="mb-2 flex items-center gap-3">
                                    <Badge
                                        variant="secondary"
                                        className={config.color}
                                    >
                                        <Icon className="mr-1 size-3" />
                                        {config.label}
                                    </Badge>
                                    {item.metadata?.category && (
                                        <Badge variant="outline" className="gap-1">
                                            <Tag className="size-3" />
                                            {item.metadata.category}
                                        </Badge>
                                    )}
                                    <time className="text-sm text-muted-foreground">
                                        {new Date(
                                            item.created_at,
                                        ).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </time>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    {item.title}
                                </h1>
                            </div>
                        </div>

                        {/* Content area based on type */}
                        {item.type === 'image' && item.file_path && (
                            <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/20">
                                <img
                                    src={research.serveFile(item.id).url}
                                    alt={item.title}
                                    className="w-full object-contain"
                                />
                            </div>
                        )}

                        {item.type === 'document' && (
                            <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-6">
                                <div className="flex size-14 items-center justify-center rounded-full bg-blue-500/10">
                                    <FileText className="size-7 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-foreground">
                                        {item.metadata?.original_name ??
                                            'Document'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatFileSize(item.metadata?.size)}
                                    </p>
                                </div>
                                <a
                                    href={research.serveFile(item.id).url}
                                    download
                                    className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <Download className="size-4" />
                                    Download
                                </a>
                            </div>
                        )}

                        {item.type === 'url' && item.original_url && (
                            <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-muted/20 p-6">
                                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
                                    <Globe className="size-7 text-emerald-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-foreground">
                                        Original URL
                                    </p>
                                    <a
                                        href={item.original_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block truncate text-sm text-primary transition-colors hover:underline"
                                    >
                                        {item.original_url}
                                    </a>
                                </div>
                                <a
                                    href={item.original_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                >
                                    <ExternalLink className="size-4" />
                                    Visit
                                </a>
                            </div>
                        )}

                        {/* AI Summary */}
                        <div className="rounded-xl border border-border/50 bg-card p-6">
                            <h2 className="mb-4 text-lg font-semibold text-foreground">
                                AI Summary
                            </h2>
                            {item.ai_summary ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                    <Markdown remarkPlugins={[remarkGfm]}>
                                        {item.ai_summary}
                                    </Markdown>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="size-4 animate-spin" />
                                    <span className="text-sm">
                                        Analysis in progress...
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Edit Form */}
                    <div className="lg:sticky lg:top-6 lg:self-start">
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-6 rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 p-6 shadow-lg"
                        >
                            <h2 className="text-lg font-semibold text-foreground">
                                Edit Details
                            </h2>

                            <div>
                                <label
                                    htmlFor="title"
                                    className="mb-2 block text-sm font-medium text-foreground"
                                >
                                    Title
                                </label>
                                <input
                                    id="title"
                                    type="text"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    maxLength={100}
                                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                                {errors.title && (
                                    <p className="mt-1.5 text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label
                                    htmlFor="user_notes"
                                    className="mb-2 block text-sm font-medium text-foreground"
                                >
                                    Notes
                                </label>
                                <textarea
                                    id="user_notes"
                                    placeholder="Add personal notes about this item..."
                                    value={data.user_notes}
                                    onChange={(e) =>
                                        setData('user_notes', e.target.value)
                                    }
                                    rows={6}
                                    className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                                {errors.user_notes && (
                                    <p className="mt-1.5 text-sm text-destructive">
                                        {errors.user_notes}
                                    </p>
                                )}
                                <p className="mt-1.5 text-xs text-muted-foreground">
                                    Notes are included in semantic search
                                </p>
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="size-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="size-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>

                            <div className="border-t border-border/50 pt-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    disabled={isDeleting}
                                    onClick={handleDelete}
                                    className="w-full text-muted-foreground hover:text-destructive"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="size-4" />
                                            Delete Item
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
