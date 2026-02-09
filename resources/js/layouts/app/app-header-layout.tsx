import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>{children}</AppContent>
            <footer className="shrink-0 border-t border-border/50 px-6 py-4 text-center text-xs text-muted-foreground">
                Built with Laravel & Laravel AI SDK. Deployed on Laravel Cloud.
            </footer>
        </AppShell>
    );
}
