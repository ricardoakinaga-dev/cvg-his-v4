'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { theme } from '../../lib/theme';
import { getAuthProfilePolicy, isValidSession, syncAuthSessionFromServer } from '../../lib/auth';
import { formatBuildStamp } from '../../lib/buildStamp';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
    children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const router = useRouter();
    const pathname = usePathname() ?? '';
    const isLoginPage = pathname === '/login' || pathname.startsWith('/login/');
    const isProfilePage = pathname === '/settings/profile' || pathname.startsWith('/settings/profile/');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [authReady, setAuthReady] = useState(isLoginPage);
    const [authRevision, setAuthRevision] = useState(0);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        let cancelled = false;

        async function ensureSession() {
            if (isLoginPage) {
                if (!cancelled) {
                    setAuthReady(true);
                }
                return;
            }

            if (isValidSession()) {
                try {
                    const profilePolicy = await getAuthProfilePolicy();
                    if (!cancelled && profilePolicy?.mustChangePassword && !isProfilePage) {
                        router.replace(`/settings/profile?forcePasswordChange=1&next=${encodeURIComponent(pathname)}`);
                        return;
                    }
                } catch (error) {
                    if (process.env.NODE_ENV !== 'production') {
                        console.warn('[his-web][auth] failed to load profile policy', error);
                    }
                }

                if (!cancelled) {
                    setAuthReady(true);
                }
                return;
            }

            try {
                const synced = await syncAuthSessionFromServer();
                if (cancelled) {
                    return;
                }

                if (synced) {
                    try {
                        const profilePolicy = await getAuthProfilePolicy();
                        if (!cancelled && profilePolicy?.mustChangePassword && !isProfilePage) {
                            router.replace(`/settings/profile?forcePasswordChange=1&next=${encodeURIComponent(pathname)}`);
                            return;
                        }
                    } catch (error) {
                        if (process.env.NODE_ENV !== 'production') {
                            console.warn('[his-web][auth] failed to load profile policy', error);
                        }
                    }

                    setAuthRevision((current) => current + 1);
                    setAuthReady(true);
                    return;
                }
            } catch (error) {
                if (process.env.NODE_ENV !== 'production') {
                    console.warn('[his-web][auth] failed to sync session from backend', error);
                }
            }

            if (!cancelled) {
                setAuthReady(false);
                const next = encodeURIComponent(pathname);
                router.replace(`/login?next=${next}`);
            }
        }

        setAuthReady(isLoginPage);
        void ensureSession();

        return () => {
            cancelled = true;
        };
    }, [pathname, isLoginPage, isProfilePage, router]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    if (!authReady) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'grid',
                    placeItems: 'center',
                    backgroundColor: theme.colors.pageBg,
                    color: theme.colors.textSecondary
                }}
            >
                Validando sessao...
            </div>
        );
    }

    return (
        <div
            key={authRevision}
            style={{
                display: 'flex',
                minHeight: '100vh',
                backgroundColor: theme.colors.pageBg
            }}
        >
            <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Topbar onToggleMenu={() => setIsMobileMenuOpen(prev => !prev)} />
                <main style={{ flex: 1, position: 'relative' }}>
                    {children}
                </main>
                {/* Build Stamp Footer */}
                <footer
                    style={{
                        padding: '8px 16px',
                        textAlign: 'right',
                        fontSize: '11px',
                        color: theme.colors.textSecondary,
                        backgroundColor: theme.colors.surface,
                        borderTop: `1px solid ${theme.colors.border}`,
                        fontFamily: 'monospace',
                    }}
                >
                    {formatBuildStamp()}
                </footer>
            </div>
        </div>
    );
}
