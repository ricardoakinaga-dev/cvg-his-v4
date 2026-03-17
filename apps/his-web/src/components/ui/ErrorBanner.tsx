'use client';

import { CSSProperties, ReactNode } from 'react';
import { theme, px, row, col } from '../../lib/theme';
import { Button } from './Button';

interface ErrorBannerProps {
    title?: string;
    message: string;
    requestId?: string | null;
    onRetry?: () => void;
    retryText?: string;
    variant?: 'error' | 'warning' | 'info';
    action?: ReactNode;
    style?: CSSProperties;
}

/**
 * ErrorBanner - Standardized error display component
 * 
 * Usage:
 * - Use for API errors, form submission errors
 * - Display at the top of content areas
 * 
 * Accessibility:
 * - Uses role="alert" for immediate screen reader announcement
 * - Includes aria-live="assertive" for critical errors
 */
export function ErrorBanner({
    title = 'Erro',
    message,
    requestId,
    onRetry,
    retryText = 'Tentar Novamente',
    variant = 'error',
    action,
    style
}: ErrorBannerProps) {
    const getVariantStyles = (): { bg: string; border: string; color: string; iconColor: string } => {
        switch (variant) {
            case 'warning':
                return {
                    bg: theme.colors.warningBg,
                    border: theme.colors.warning,
                    color: theme.colors.warning,
                    iconColor: theme.colors.warning
                };
            case 'info':
                return {
                    bg: theme.colors.infoBg,
                    border: theme.colors.info,
                    color: theme.colors.info,
                    iconColor: theme.colors.info
                };
            case 'error':
            default:
                return {
                    bg: theme.colors.dangerBg,
                    border: theme.colors.danger,
                    color: theme.colors.danger,
                    iconColor: theme.colors.danger
                };
        }
    };

    const variantStyles = getVariantStyles();

    const iconMap = {
        error: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
        ),
        warning: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
        ),
        info: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
        )
    };

    return (
        <div
            role="alert"
            aria-live="assertive"
            style={{
                ...col(12),
                padding: px(theme.spacing.md),
                backgroundColor: variantStyles.bg,
                border: `1px solid ${variantStyles.border}`,
                borderRadius: px(theme.radius.sm),
                borderLeft: `4px solid ${variantStyles.border}`,
                ...style
            }}
        >
            <div style={row(12, 'flex-start')}>
                <div style={{ 
                    color: variantStyles.iconColor, 
                    flexShrink: 0,
                    marginTop: px(2)
                }}>
                    {iconMap[variant]}
                </div>
                <div style={{ flex: 1, ...col(4) }}>
                    <strong style={{
                        fontSize: px(14),
                        fontWeight: 600,
                        color: variantStyles.color
                    }}>
                        {title}
                    </strong>
                    <p style={{
                        margin: 0,
                        fontSize: px(14),
                        color: theme.colors.textPrimary
                    }}>
                        {message}
                    </p>
                    {requestId && (
                        <code style={{
                            fontSize: px(11),
                            color: theme.colors.textSecondary,
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            padding: `${px(2)} ${px(6)}`,
                            borderRadius: px(4),
                            fontFamily: theme.typography.mono
                        }}>
                            Request ID: {requestId}
                        </code>
                    )}
                </div>
            </div>
            
            {(onRetry || action) && (
                <div style={{ 
                    ...row(8, 'center'), 
                    justifyContent: 'flex-end',
                    marginTop: px(8) 
                }}>
                    {action}
                    {onRetry && (
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={onRetry}
                        >
                            {retryText}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * InlineError - Compact error display for form fields
 */
export function InlineError({ 
    message, 
    style 
}: { 
    message: string; 
    style?: CSSProperties 
}) {
    return (
        <div
            role="alert"
            style={{
                ...row(4, 'center'),
                color: theme.colors.danger,
                fontSize: px(12),
                ...style
            }}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{message}</span>
        </div>
    );
}
