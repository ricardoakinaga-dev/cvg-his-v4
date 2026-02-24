'use client';

import { CSSProperties } from 'react';
import { theme, px, col } from '../../lib/theme';
import { Spinner } from './Primitives';

interface LoadingStateProps {
    message?: string;
    size?: number;
    style?: CSSProperties;
}

/**
 * LoadingState - Standardized loading indicator for pages and sections
 * 
 * Usage:
 * - Use for full-page loading states
 * - Use within cards or containers for partial loading
 * 
 * Accessibility:
 * - Uses role="status" for screen readers
 * - Includes aria-live="polite" for announcements
 */
export function LoadingState({ 
    message = 'Carregando...', 
    size = 48,
    style 
}: LoadingStateProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={message}
            style={{
                ...col(16, 'center'),
                padding: px(48),
                textAlign: 'center',
                ...style
            }}
        >
            <Spinner size={size} />
            <span style={{
                fontSize: px(14),
                color: theme.colors.textSecondary,
                fontWeight: 500
            }}>
                {message}
            </span>
        </div>
    );
}

/**
 * LoadingOverlay - Full-screen loading overlay for blocking interactions
 */
export function LoadingOverlay({ message = 'Processando...' }: { message?: string }) {
    return (
        <div
            role="alert"
            aria-busy="true"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                ...col(16, 'center')
            }}
        >
            <Spinner size={64} />
            <span style={{
                fontSize: px(16),
                color: theme.colors.textPrimary,
                fontWeight: 600
            }}>
                {message}
            </span>
        </div>
    );
}

/**
 * LoadingSkeleton - Placeholder skeleton for content loading
 */
export function LoadingSkeleton({ 
    lines = 3, 
    style 
}: { 
    lines?: number; 
    style?: CSSProperties 
}) {
    return (
        <div
            role="presentation"
            aria-hidden="true"
            style={{
                ...col(8),
                width: '100%',
                ...style
            }}
        >
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        height: i === 0 ? px(24) : px(16),
                        width: i === 0 ? '60%' : `${100 - (i * 15)}%`,
                        backgroundColor: '#e2e8f0',
                        borderRadius: px(4),
                        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`
                    }}
                />
            ))}
            <style dangerouslySetInnerHTML={{ 
                __html: `
                    @keyframes skeleton-pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                ` 
            }} />
        </div>
    );
}
