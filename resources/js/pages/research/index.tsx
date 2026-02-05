import { Head, InfiniteScroll, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { ChevronDown, FileText, Globe, ImageIcon, Search, Tag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
    FeatureBadge,
    FeatureBadgeGroup,
} from '@/components/demo/feature-badge';
import { CaptureForm } from '@/components/research/capture-form';
import { ItemCard } from '@/components/research/item-card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import AppLayout from '@/layouts/app-layout';
import research from '@/routes/research';
import type { BreadcrumbItem, SharedData } from '@/types';

interface ResearchItem {
    id: string;
    type: 'image' | 'document' | 'url';
    title: string;
    original_url: string | null;
    ai_summary: string | null;
    metadata?: { category?: string } | null;
    created_at: string;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Stats {
    total: number;
    images: number;
    documents: number;
    urls: number;
}

interface PageProps {
    items: PaginatedData<ResearchItem>;
    filters: { search: string; category: string };
    stats: Stats;
    categories?: Record<string, number>;
    flash?: { success?: string };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Research',
        href: research.index().url,
    },
];

export default function ResearchIndex() {
    const { items, filters, stats, categories, flash } = usePage<PageProps>().props;
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    // Debounced search
    useEffect(() => {
        if (search === filters.search) {
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.get(
                research.index().url,
                { search: search || undefined, category: filters.category || undefined },
                { preserveState: true, replace: true, only: ['items', 'categories'], reset: ['items'] },
            );
        }, 300);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [search, filters.search, filters.category]);

    // Real-time updates via Reverb (debounced for bulk uploads)
    const reloadRef = useRef<ReturnType<typeof setTimeout>>(null);

    useEcho(`App.Models.User.${auth.user.id}`, 'ResearchItemAnalyzed', () => {
        if (reloadRef.current) {
            clearTimeout(reloadRef.current);
        }
        reloadRef.current = setTimeout(() => {
            router.reload({ only: ['items', 'stats', 'categories'], reset: ['items'] });
        }, 500);
    });

    const handleCategoryFilter = (category: string) => {
        router.get(
            research.index().url,
            {
                search: filters.search || undefined,
                category: category || undefined,
            },
            { preserveState: true, replace: true, only: ['items', 'categories'], reset: ['items'] },
        );
    };

    const statItems = [
        { label: 'Total Items', value: stats.total, icon: Search },
        { label: 'Images', value: stats.images, icon: ImageIcon },
        { label: 'Documents', value: stats.documents, icon: FileText },
        { label: 'URLs', value: stats.urls, icon: Globe },
    ];

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
                                    features={['vector-store', 'vision', 'broadcasting', 'categorization']}
                                />
                            </div>
                        </div>

                        {/* Stats (collapsible) */}
                        <Collapsible className="mb-6">
                            <CollapsibleTrigger className="group flex w-full items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                                <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
                                <span>Library stats</span>
                                <span className="text-xs text-muted-foreground/60">
                                    {stats.total} items
                                </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {statItems.map(({ label, value, icon: Icon }) => (
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
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by title, summary, notes, or category..."
                                className="w-full rounded-lg border border-border/50 bg-card/50 py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>

                        {/* Category Filter Chips */}
                        {categories && Object.keys(categories).length > 0 && (
                            <div className="mb-6 flex flex-wrap items-center gap-2">
                                <Tag className="size-3.5 text-muted-foreground" />
                                <button
                                    type="button"
                                    onClick={() => handleCategoryFilter('')}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                        !filters.category
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                >
                                    All
                                </button>
                                {Object.entries(categories)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([cat, count]) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => handleCategoryFilter(cat)}
                                            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                                filters.category === cat
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            {cat}
                                            <span className="ml-1 opacity-60">{count}</span>
                                        </button>
                                    ))}
                            </div>
                        )}

                        {/* Items Grid */}
                        {items.data.length > 0 ? (
                            <InfiniteScroll data="items" preserveUrl>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {items.data.map((item) => (
                                        <ItemCard key={item.id} item={item} />
                                    ))}
                                </div>
                            </InfiniteScroll>
                        ) : (
                            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/20 py-16 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <Search className="size-7 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-foreground">
                                    {search || filters.category
                                        ? 'No results found'
                                        : 'No research items yet'}
                                </h3>
                                <p className="mt-1 max-w-sm text-muted-foreground">
                                    {search || filters.category
                                        ? 'Try a different search term or category.'
                                        : 'Start capturing images, documents, or URLs to build your personal knowledge base.'}
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
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                        1
                                    </span>
                                    <span>
                                        Upload an image, document, or paste a
                                        URL
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                        2
                                    </span>
                                    <span>
                                        AI analyzes content using{' '}
                                        <FeatureBadge
                                            feature="vision"
                                            className="inline-flex align-middle"
                                        />
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                        3
                                    </span>
                                    <span>
                                        Stored in{' '}
                                        <FeatureBadge
                                            feature="vector-store"
                                            className="inline-flex align-middle"
                                        />
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                        4
                                    </span>
                                    <span>
                                        Query via{' '}
                                        <FeatureBadge
                                            feature="file-search"
                                            className="inline-flex align-middle"
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
