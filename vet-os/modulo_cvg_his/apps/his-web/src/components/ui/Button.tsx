'use client';

import { CSSProperties, ReactNode, useState, ButtonHTMLAttributes, forwardRef } from 'react';
import { theme, px, row } from '../../lib/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
}

const Spinner = ({ color }: { color: string }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: 'spin 1s linear infinite' }}
    >
        <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { 100% { transform: rotate(360deg); } }' }} />
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray="32" />
    </svg>
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ children, variant = 'primary', size = 'md', isLoading, disabled, leftIcon, rightIcon, style, ...props }, ref) => {
        const [isHovered, setIsHovered] = useState(false);
        const [isFocused, setIsFocused] = useState(false);

        const baseStyle: CSSProperties = {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: px(theme.radius.sm),
            fontWeight: 600,
            cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
            opacity: disabled || isLoading ? 0.6 : 1,
            transition: 'all 0.2s ease',
            border: '1px solid transparent',
            outline: 'none',
            fontFamily: theme.typography.sans
        };

        // Size Styles
        const sizeStyles: Record<ButtonSize, CSSProperties> = {
            sm: { height: px(32), padding: `0 ${px(theme.spacing.sm)}`, fontSize: px(13) },
            md: { height: px(40), padding: `0 ${px(theme.spacing.md)}`, fontSize: px(14) },
            lg: { height: px(48), padding: `0 ${px(theme.spacing.lg)}`, fontSize: px(16) }
        };

        // Variant Styles
        const getVariantStyle = (isHovering: boolean): CSSProperties => {
            switch (variant) {
                case 'primary':
                    return {
                        backgroundColor: isHovering ? '#1e293b' : theme.colors.primary, // Darker slate on hover
                        color: '#ffffff',
                        borderColor: 'transparent'
                    };
                case 'secondary':
                    return {
                        backgroundColor: isHovering ? '#f1f5f9' : theme.colors.surface,
                        color: theme.colors.textPrimary,
                        borderColor: theme.colors.border
                    };
                case 'danger':
                    return {
                        backgroundColor: isHovering ? '#991b1b' : theme.colors.danger,
                        color: '#ffffff',
                        borderColor: 'transparent'
                    };
                case 'ghost':
                    return {
                        backgroundColor: isHovering ? '#f1f5f9' : 'transparent',
                        color: theme.colors.textPrimary,
                        borderColor: 'transparent'
                    };
            }
        };

        const focusStyle: CSSProperties = isFocused
            ? { boxShadow: `0 0 0 2px ${theme.colors.pageBg}, 0 0 0 4px ${variant === 'danger' ? theme.colors.danger : theme.colors.primary}` }
            : {};

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    ...baseStyle,
                    ...sizeStyles[size],
                    ...getVariantStyle(isHovered),
                    ...focusStyle,
                    ...style
                }}
                {...props}
            >
                <div style={row(8, 'center')}>
                    {isLoading && <Spinner color={variant === 'secondary' || variant === 'ghost' ? theme.colors.primary : '#ffffff'} />}
                    {!isLoading && leftIcon}
                    {children}
                    {!isLoading && rightIcon}
                </div>
            </button>
        );
    }
);

Button.displayName = 'Button';
