import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';
import type { SharedData } from '@/types';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Larrykonn" />

            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
                <div className="flex flex-col items-center gap-8">
                    <AppLogoIcon size={80} />

                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Larrykonn
                    </h1>

                    <div className="flex gap-3">
                        {auth.user ? (
                            <Button asChild>
                                <Link href={dashboard()}>Dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                {canRegister && (
                                    <Button asChild>
                                        <Link href={register()}>Register</Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
