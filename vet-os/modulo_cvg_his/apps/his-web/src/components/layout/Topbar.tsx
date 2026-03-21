'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { clearAuthSession } from '../../lib/auth';
import { Can } from '../auth/Can';
import { PERMISSIONS } from '../../lib/rbac';
import { theme, px } from '../../lib/theme';
import { SearchBar } from '../SearchBar';
import { Button } from '../ui/Button';
import styles from './Sidebar.module.css';

export function Topbar({ onToggleMenu }: { onToggleMenu?: () => void }): JSX.Element | null {
    const pathname = usePathname() ?? '';
    const router = useRouter();

    // If login, don't show (although AppShell usually handles this, double safety)
    if (pathname.startsWith('/login')) {
        return null;
    }

    const handleLogout = async () => {
        await clearAuthSession();
        router.replace('/login');
    };

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                borderBottom: `1px solid ${theme.colors.border}`,
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(8px)',
                height: px(64),
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${px(theme.spacing.lg)}`
            }}
        >
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                <button
                    onClick={onToggleMenu}
                    className={styles.menuButton}
                    aria-label="Menu"
                    type="button"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <SearchBar />
            </div>

            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: px(4),
                    marginLeft: px(theme.spacing.md),
                    marginRight: px(theme.spacing.md)
                }}
            >
                <span style={{ fontSize: px(11), color: theme.colors.textSecondary, fontWeight: 600 }}>
                    Cadastros
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
                    <Can permission={PERMISSIONS.OWNER_READ}>
                        <Link
                            href="/owners"
                            style={{
                                textDecoration: 'none',
                                fontSize: px(13),
                                fontWeight: 600,
                                color: pathname.startsWith('/owners') ? theme.colors.primary : theme.colors.textSecondary
                            }}
                        >
                            Tutores
                        </Link>
                    </Can>
                    <Can permission={PERMISSIONS.PATIENT_READ}>
                        <Link
                            href="/patients"
                            style={{
                                textDecoration: 'none',
                                fontSize: px(13),
                                fontWeight: 600,
                                color: pathname.startsWith('/patients') ? theme.colors.primary : theme.colors.textSecondary
                            }}
                        >
                            Pacientes
                        </Link>
                    </Can>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: px(theme.spacing.sm) }}>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    aria-label="Sair do sistema"
                >
                    Sair
                </Button>
            </div>
        </header>
    );
}
