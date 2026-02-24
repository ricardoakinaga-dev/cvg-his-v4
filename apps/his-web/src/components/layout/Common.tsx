'use client';

import { CSSProperties, ReactNode } from 'react';
import { theme, px, row } from '../../lib/theme';

interface ContainerProps {
    children: ReactNode;
    style?: CSSProperties;
    maxWidth?: number | string;
}

export function Container({ children, style, maxWidth = 1200 }: ContainerProps) {
    return (
        <div
            style={{
                width: '100%',
                maxWidth: typeof maxWidth === 'number' ? px(maxWidth) : maxWidth,
                margin: '0 auto',
                padding: px(24),
                ...style
            }}
        >
            {children}
        </div>
    );
}

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    style?: CSSProperties;
}

export function PageHeader({ title, subtitle, actions, style }: PageHeaderProps) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: px(theme.spacing.xl),
                ...style
            }}
        >
            <div>
                <h2 style={{ margin: 0, fontSize: px(24), fontWeight: 700, color: theme.colors.textPrimary }}>
                    {title}
                </h2>
                {subtitle && (
                    <p style={{ margin: `${px(4)} 0 0`, color: theme.colors.textSecondary, fontSize: px(14) }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div style={row(12)}>
                    {actions}
                </div>
            )}
        </div>
    );
}
