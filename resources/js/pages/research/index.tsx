import { Head, usePage } from '@inertiajs/react';
import { FileText, Globe, ImageIcon, Search } from 'lucide-react';
import {
    FeatureBadge,
    FeatureBadgeGroup,
} from '@/components/demo/feature-badge';
import { CaptureForm } from '@/components/research/capture-form';
import { ItemCard } from '@/components/research/item-card';
import AppLayout from '@/layouts/app-layout';
import research from '@/routes/research';
import type { BreadcrumbItem } from '@/types';

interface ResearchItem {
    id: string;
    type: 'image' | 'document' | 'url';
    title: string;
    original_url: string | null;
    ai_summary: string | null;
    created_at: string;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface PageProps {
    items: PaginatedData<ResearchItem>;
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Research',
        href: research.index().url,
    },
];

export default function ResearchIndex() {
    const { items, flash } = usePage<PageProps>().props;

    const stats = {
        total: items.total,
        images: items.data.filter((i) => i.type === 'image').length,
        documents: items.data.filter((i) => i.type === 'document').length,
        urls: items.data.filter((i) => i.type === 'url').length,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Research" />

            <div className="p-6">
                {/* Success Flash Message */}
                {flash?.success && (
                    <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                    {/* Main Content */}
                    <div>
                        {/* Header */}
                        <div className="mb-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                        Research Library
                                    </h1>
                                    <p className="mt-1 text-muted-foreground">
                                        Capture and organize your research. AI
                                        analyzes everything for easy retrieval.
                                    </p>
                                </div>
                            </div>

                            {/* Feature Badges */}
                            <div className="mt-4">
                                <FeatureBadgeGroup
                                    features={['vector-store', 'vision']}
                                />
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                {
                                    label: 'Total Items',
                                    value: stats.total,
                                    icon: Search,
                                },
                                {
                                    label: 'Images',
                                    value: stats.images,
                                    icon: ImageIcon,
                                },
                                {
                                    label: 'Documents',
                                    value: stats.documents,
                                    icon: FileText,
                                },
                                {
                                    label: 'URLs',
                                    value: stats.urls,
                                    icon: Globe,
                                },
                            ].map(({ label, value, icon: Icon }) => (
                                <div
                                    key={label}
                                    className="rounded-xl border border-border/50 bg-card/50 p-4"
                                >
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Icon className="size-4" />
                                        <span className="text-sm">{label}</span>
                                    </div>
                                    <p className="mt-1 text-2xl font-semibold text-foreground">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Items Grid */}
                        {items.data.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {items.data.map((item) => (
                                    <ItemCard key={item.id} item={item} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 py-16 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <Search className="size-7 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">
                                    No research items yet
                                </h3>
                                <p className="mt-1 max-w-sm text-muted-foreground">
                                    Start capturing images, documents, or URLs
                                    to build your personal knowledge base.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar - Capture Form */}
                    <div className="lg:sticky lg:top-6 lg:self-start">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">
                                Capture Content
                            </h2>
                        </div>

                        {/* How it works */}
                        <div className="mb-4 rounded-lg border border-border/50 bg-muted/20 p-4">
                            <h3 className="text-sm font-medium text-foreground">
                                How it works
                            </h3>
                            <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-600 dark:text-violet-400">
                                        1
                                    </span>
                                    <span>
                                        Upload an image, document, or paste a
                                        URL
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-600 dark:text-violet-400">
                                        2
                                    </span>
                                    <span>
                                        AI analyzes content using{' '}
                                        <FeatureBadge
                                            feature="vision"
                                            showLabel={false}
                                            className="inline-flex"
                                        />
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-600 dark:text-violet-400">
                                        3
                                    </span>
                                    <span>
                                        Stored in{' '}
                                        <FeatureBadge
                                            feature="vector-store"
                                            showLabel={false}
                                            className="inline-flex"
                                        />{' '}
                                        for semantic search
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-medium text-violet-600 dark:text-violet-400">
                                        4
                                    </span>
                                    <span>
                                        Query via chat using{' '}
                                        <FeatureBadge
                                            feature="file-search"
                                            showLabel={false}
                                            className="inline-flex"
                                        />
                                    </span>
                                </li>
                            </ol>
                        </div>

                        <CaptureForm />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
