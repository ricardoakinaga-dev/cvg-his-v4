'use client';

import { CSSProperties, ReactNode, HTMLAttributes } from 'react';
import { theme, px, cardStyle } from '../../lib/theme';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: ReactNode;
    style?: CSSProperties;
}

export function Card({ children, style, ...props }: CardProps) {
    return (
        <div style={cardStyle({ padding: 0, ...style })} {...props}>
            {children}
        </div>
    );
}

/**
 * Card Header
 */
export function CardHeader({ children, style }: CardProps) {
    return (
        <div
            style={{
                padding: `${px(theme.spacing.lg)} ${px(theme.spacing.lg)} ${px(theme.spacing.sm)}`,
                ...style
            }}
        >
            {children}
        </div>
    );
}

export function CardTitle({ children }: { children: ReactNode }) {
    return (
        <h3
            style={{
                margin: 0,
                fontSize: px(18),
                fontWeight: 600,
                color: theme.colors.textPrimary
            }}
        >
            {children}
        </h3>
    );
}

/**
 * Card Body
 */
export function CardBody({ children, style }: CardProps) {
    return (
        <div
            style={{
                padding: px(theme.spacing.lg),
                ...style
            }}
        >
            {children}
        </div>
    );
}

/**
 * Card Footer
 */
export function CardFooter({ children, style }: CardProps) {
    return (
        <div
            style={{
                padding: `${px(theme.spacing.md)} ${px(theme.spacing.lg)}`,
                borderTop: `1px solid ${theme.colors.border}`,
                backgroundColor: '#f8fafc', // Slight gray
                borderBottomLeftRadius: px(theme.radius.md),
                borderBottomRightRadius: px(theme.radius.md),
                display: 'flex',
                alignItems: 'center',
                ...style
            }}
        >
            {children}
        </div>
    );
}
