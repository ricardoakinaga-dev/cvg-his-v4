'use client';

import { CSSProperties, ReactNode } from 'react';
import { theme, px, col } from '../../lib/theme';

interface EmptyStateProps {
    title: string;
    description?: string;
    action?: ReactNode;
    icon?: ReactNode;
    style?: CSSProperties;
}

export function EmptyState({ title, description, action, icon, style }: EmptyStateProps) {
    return (
        <div
            style={{
                ...col(16, 'center'),
                padding: px(48),
                border: `2px dashed ${theme.colors.border}`,
                borderRadius: px(theme.radius.md),
                backgroundColor: '#f8fafc',
                textAlign: 'center',
                ...style
            }}
        >
            {icon && (
                <div
                    style={{
                        fontSize: px(32),
                        color: theme.colors.textSecondary,
                        opacity: 0.5
                    }}
                >
                    {icon}
                </div>
            )}
            <div>
                <h4 style={{ margin: 0, fontSize: px(16), fontWeight: 600, color: theme.colors.textPrimary }}>
                    {title}
                </h4>
                {description && (
                    <p style={{ margin: `${px(4)} 0 0`, fontSize: px(14), color: theme.colors.textSecondary }}>
                        {description}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}
