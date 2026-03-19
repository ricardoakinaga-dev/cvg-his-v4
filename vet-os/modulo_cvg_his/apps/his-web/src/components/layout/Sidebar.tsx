'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { theme, px, col, row } from '../../lib/theme';
import { Can } from '../auth/Can';
import { NAVIGATION_CONFIG } from '../../config/navigation';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname() ?? '';

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                onClick={onClose}
            />
            <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
                <div style={{ padding: px(theme.spacing.lg), borderBottom: `1px solid ${theme.colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: px(theme.typography.titleFontSize), color: theme.colors.primary }}>
                            CVG HIS
                        </h1>
                        <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>v2.0 Enterprise</span>
                    </div>
                </div>

                <nav style={{ ...col(0), padding: px(theme.spacing.md), flex: 1, overflowY: 'auto' }}>
                    {NAVIGATION_CONFIG.map((section, idx) => (
                        <div key={section.title} style={{ marginBottom: idx < NAVIGATION_CONFIG.length - 1 ? px(24) : 0 }}>
                            <div style={{
                                padding: `0 ${px(12)}`,
                                marginBottom: px(8),
                                fontSize: px(11),
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                color: theme.colors.textSecondary,
                            }}>
                                {section.title}
                            </div>
                            <div style={col(4)}>
                                {section.items.map((item) => {
                                    const isActive = item.href === '/'
                                        ? pathname === '/'
                                        : pathname.startsWith(item.href);

                                    const linkProps = {
                                        href: item.href,
                                        style: {
                                            display: 'block',
                                            padding: `${px(8)} ${px(12)}`,
                                            borderRadius: px(theme.radius.sm),
                                            fontSize: px(14),
                                            fontWeight: 500,
                                            textDecoration: 'none',
                                            color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                                            backgroundColor: isActive ? '#f1f5f9' : 'transparent',
                                            transition: 'background-color 0.2s',
                                        }
                                    };

                                    const linkElement = (
                                        <Link key={item.href} {...linkProps}>
                                            {item.label}
                                        </Link>
                                    );

                                    if (item.permission) {
                                        return (
                                            <Can key={item.href} permission={item.permission}>
                                                {linkElement}
                                            </Can>
                                        );
                                    }

                                    return linkElement;
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div style={{ padding: px(theme.spacing.md), borderTop: `1px solid ${theme.colors.border}` }}>
                    <div style={row(8, 'center')}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: theme.colors.primary }} />
                        <div style={col(0)}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Usuário</span>
                            <span style={{ fontSize: 11, color: theme.colors.textSecondary }}>Veterinário</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
