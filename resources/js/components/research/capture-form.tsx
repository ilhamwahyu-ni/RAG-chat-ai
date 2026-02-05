import { useForm } from '@inertiajs/react';
import { FileText, Globe, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import research from '@/routes/research';

type CaptureTab = 'files' | 'urls';

export function CaptureForm() {
    const [activeTab, setActiveTab] = useState<CaptureTab>('files');
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, reset, errors, clearErrors } =
        useForm<{
            files: File[];
            urls: string;
            notes: string;
        }>({
            files: [],
            urls: '',
            notes: '',
        });

    const handleTabChange = (tab: CaptureTab) => {
        setActiveTab(tab);
        setData({ files: [], urls: '', notes: '' });
        clearErrors();
    };

    const addFiles = useCallback(
        (newFiles: FileList | File[]) => {
            const arr = Array.from(newFiles);
            setData('files', [...data.files, ...arr].slice(0, 20));
        },
        [data.files, setData],
    );

    const removeFile = useCallback(
        (index: number) => {
            setData(
                'files',
                data.files.filter((_, i) => i !== index),
            );
        },
        [data.files, setData],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files.length > 0) {
                addFiles(e.dataTransfer.files);
            }
        },
        [addFiles],
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(research.bulkStore().url, {
            forceFormData: true,
            onSuccess: () => reset(),
        });
    };

    const itemCount =
        activeTab === 'files'
            ? data.files.length
            : data.urls
                  .split('\n')
                  .filter((line) => line.trim() !== '').length;

    const tabs = [
        { type: 'files' as const, label: 'Files', icon: Upload },
        { type: 'urls' as const, label: 'URLs', icon: Globe },
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
                {activeTab === 'files' ? (
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.txt"
                            onChange={(e) => {
                                if (e.target.files) {
                                    addFiles(e.target.files);
                                }
                                e.target.value = '';
                            }}
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all ${
                                isDragOver
                                    ? 'border-primary bg-primary/5'
                                    : data.files.length > 0
                                      ? 'border-green-500/50 bg-green-500/5'
                                      : 'border-border/50 bg-muted/20 hover:border-primary/50 hover:bg-muted/30'
                            }`}
                        >
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                                    <Upload className="size-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        Drop files here or click to browse
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Images, PDFs, DOC, TXT up to 20MB each
                                        (max 20 files)
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* File list */}
                        {data.files.length > 0 && (
                            <div className="mt-3 space-y-1.5">
                                {data.files.map((file, index) => (
                                    <div
                                        key={`${file.name}-${index}`}
                                        className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
                                    >
                                        {file.type.startsWith('image/') ? (
                                            <Upload className="size-3.5 shrink-0 text-violet-500" />
                                        ) : (
                                            <FileText className="size-3.5 shrink-0 text-blue-500" />
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-foreground">
                                            {file.name}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(
                                                1,
                                            )}
                                            MB
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                                        >
                                            <X className="size-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="relative">
                            <Globe className="absolute top-3 left-3 size-5 text-muted-foreground" />
                            <textarea
                                placeholder={
                                    'Paste URLs, one per line\nhttps://example.com/article-1\nhttps://example.com/article-2'
                                }
                                value={data.urls}
                                onChange={(e) => setData('urls', e.target.value)}
                                rows={6}
                                className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent py-2 pr-3 pl-10 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Enter URLs to capture and analyze their content
                        </p>
                    </div>
                )}

                {errors.files && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.files}
                    </p>
                )}
                {errors.urls && (
                    <p className="mt-2 text-sm text-destructive">
                        {errors.urls}
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
                        placeholder="Add context or notes about these items..."
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
                    disabled={processing || itemCount === 0}
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
                            {itemCount > 0
                                ? `Capture ${itemCount} item${itemCount !== 1 ? 's' : ''}`
                                : 'Capture & Analyze'}
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
