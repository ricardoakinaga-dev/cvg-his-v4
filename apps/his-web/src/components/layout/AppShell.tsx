'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { theme } from '../../lib/theme';
import { isValidSession } from '../../lib/auth';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        // Guard: Proteger rotas que não são de login
        if (!isLoginPage && !isValidSession()) {
            // Encode current path to redirect back after login
            const next = encodeURIComponent(pathname);
            router.replace(`/login?next=${next}`);
        }
    }, [pathname, isLoginPage, router]);

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div
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
