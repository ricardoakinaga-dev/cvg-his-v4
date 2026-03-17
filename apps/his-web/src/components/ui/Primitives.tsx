'use client';

import { CSSProperties } from 'react';
import { theme, px } from '../../lib/theme';

/**
 * BADGE
 */
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    style?: CSSProperties;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
    const getPalette = () => {
        switch (variant) {
            case 'success': return { bg: theme.colors.successBg, color: theme.colors.success, border: theme.colors.successBg };
            case 'warning': return { bg: theme.colors.warningBg, color: theme.colors.warning, border: theme.colors.warningBg };
            case 'danger': return { bg: theme.colors.dangerBg, color: theme.colors.danger, border: theme.colors.dangerBg };
            case 'info': return { bg: theme.colors.infoBg, color: theme.colors.info, border: theme.colors.infoBg };
            default: return { bg: '#f1f5f9', color: theme.colors.textSecondary, border: theme.colors.border };
        }
    };

    const palette = getPalette();

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 10px',
                borderRadius: px(theme.radius.full),
                fontSize: px(12),
                fontWeight: 600,
                backgroundColor: palette.bg,
                color: palette.color,
                border: `1px solid ${palette.border}`,
                ...style
            }}
        >
            {label}
        </span>
    );
}

/**
 * DIVIDER
 */
export function Divider({ style }: { style?: CSSProperties }) {
    return (
        <hr
            style={{
                width: '100%',
                height: 1,
                border: 'none',
                backgroundColor: theme.colors.border,
                margin: `${px(theme.spacing.md)} 0`,
                ...style
            }}
        />
    );
}

/**
 * SPINNER
 */
export function Spinner({ size = 24, color }: { size?: number; color?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ animation: 'spin-global 1s linear infinite' }}
        >
            <style dangerouslySetInnerHTML={{ __html: '@keyframes spin-global { 100% { transform: rotate(360deg); } }' }} />
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke={color || theme.colors.primary}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeOpacity={0.4}
            />
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke={color || theme.colors.primary}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="32"
            />
        </svg>
    );
}
