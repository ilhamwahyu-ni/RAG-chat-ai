import { useForm } from '@inertiajs/react';
import { FileText, Globe, ImageIcon, Loader2, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import research from '@/routes/research';

type CaptureType = 'image' | 'document' | 'url';

export function CaptureForm() {
    const [activeTab, setActiveTab] = useState<CaptureType>('image');
    const [isDragOver, setIsDragOver] = useState(false);

    const { data, setData, post, processing, reset, errors } = useForm<{
        type: CaptureType;
        file: File | null;
        url: string;
        notes: string;
    }>({
        type: 'image',
        file: null,
        url: '',
        notes: '',
    });

    const handleTabChange = (type: CaptureType) => {
        setActiveTab(type);
        setData({ type, file: null, url: '', notes: '' });
    };

    const handleFileChange = useCallback(
        (file: File | null) => {
            setData('file', file);
        },
        [setData],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) {
                handleFileChange(file);
            }
        },
        [handleFileChange],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(research.store().url, {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    const tabs = [
        { type: 'image' as const, label: 'Image', icon: ImageIcon },
        { type: 'document' as const, label: 'Document', icon: FileText },
        { type: 'url' as const, label: 'URL', icon: Globe },
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 shadow-lg">
            {/* Tab Navigation */}
            <div className="flex border-b border-border/50 bg-muted/30">
                {tabs.map(({ type, label, icon: Icon }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => handleTabChange(type)}
                        className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                            activeTab === type
                                ? 'border-b-2 border-primary bg-background/50 text-foreground'
                                : 'text-muted-foreground hover:bg-background/30 hover:text-foreground'
                        }`}
                    >
                        <Icon className="size-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-6">
                {activeTab !== 'url' ? (
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                            isDragOver
                                ? 'border-primary bg-primary/5'
                                : data.file
                                  ? 'border-green-500/50 bg-green-500/5'
                                  : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/30'
                        }`}
                    >
                        <input
                            type="file"
                            accept={
                                activeTab === 'image'
                                    ? 'image/*'
                                    : '.pdf,.doc,.docx,.txt'
                            }
                            onChange={(e) =>
                                handleFileChange(e.target.files?.[0] || null)
                            }
                            className="absolute inset-0 cursor-pointer opacity-0"
                        />

                        {data.file ? (
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-green-500/10">
                                    {activeTab === 'image' ? (
                                        <ImageIcon className="size-7 text-green-500" />
                                    ) : (
                                        <FileText className="size-7 text-green-500" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {data.file.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {(data.file.size / 1024 / 1024).toFixed(
                                            2,
                                        )}{' '}
                                        MB
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <Upload className="size-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        Drop your {activeTab} here or click to
                                        browse
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {activeTab === 'image'
                                            ? 'PNG, JPG, GIF up to 20MB'
                                            : 'PDF, DOC, TXT up to 20MB'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="relative">
                            <Globe className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="url"
                                placeholder="https://example.com/article"
                                value={data.url}
                                onChange={(e) => setData('url', e.target.value)}
                                className="h-12 pl-10 text-base"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Enter a URL to capture and analyze its content
                        </p>
                    </div>
                )}

                {errors.file && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.file}
                    </p>
                )}
                {errors.url && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.url}
                    </p>
                )}

                {/* Notes field */}
                <div className="mt-4">
                    <label
                        htmlFor="notes"
                        className="mb-2 block text-sm font-medium text-foreground"
                    >
                        Notes{' '}
                        <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                        id="notes"
                        placeholder="Add context or notes about this item..."
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows={3}
                        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        Your notes are included in semantic search for better
                        retrieval
                    </p>
                </div>
                {errors.notes && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.notes}
                    </p>
                )}

                <Button
                    type="submit"
                    disabled={processing}
                    className="mt-6 w-full"
                    size="lg"
                >
                    {processing ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Upload className="size-4" />
                            Capture & Analyze
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
