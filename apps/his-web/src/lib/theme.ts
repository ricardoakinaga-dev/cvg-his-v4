import { CSSProperties } from 'react';

/**
 * Design Tokens
 * 
 * This file centralizes all visual tokens for the HIS Web application.
 * All components should reference these tokens instead of hardcoded values.
 * 
 * @see docs/his_web_estrategia_ux_ui.md
 */
export const theme = {
    colors: {
        // Backgrounds
        pageBg: '#f8fafc',
        surface: '#ffffff',
        surfaceHover: '#f1f5f9',
        
        // Borders
        border: '#e2e8f0',
        borderHover: '#cbd5e1',
        borderFocus: '#0f172a',
        
        // Text
        textPrimary: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#94a3b8',
        textInverse: '#ffffff',
        
        // Actions
        primary: '#0f172a',
        primaryHover: '#1e293b',
        primaryLight: '#e2e8f0',
        
        // Status Colors
        danger: '#b91c1c',
        dangerBg: '#fee2e2',
        dangerHover: '#991b1b',
        
        success: '#047857',
        successBg: '#dcfce7',
        successHover: '#065f46',
        
        warning: '#b45309',
        warningBg: '#ffedd5',
        warningHover: '#92400e',
        
        info: '#1d4ed8',
        infoBg: '#dbeafe',
        infoHover: '#1e40af',
        
        // Focus Ring
        focusRing: 'rgba(15, 23, 42, 0.3)',
        
        // Disabled
        disabled: '#f1f5f9',
        disabledText: '#94a3b8'
    },
    spacing: {
        xs: 8,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48
    },
    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        full: 9999
    },
    typography: {
        baseFontSize: 14,
        titleFontSize: 18,
        headingSizes: {
            h1: 24,
            h2: 20,
            h3: 18,
            h4: 16,
            h5: 14
        },
        mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
        sans: '"IBM Plex Sans", "Segoe UI", sans-serif',
        weights: {
            normal: 400,
            medium: 500,
            semibold: 600,
            bold: 700
        }
    },
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px'
    },
    transitions: {
        fast: '0.15s ease',
        normal: '0.2s ease',
        slow: '0.3s ease'
    },
    shadows: {
        sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
        md: '0 1px 3px rgba(0, 0, 0, 0.1)',
        lg: '0 4px 6px rgba(0, 0, 0, 0.1)',
        focus: '0 0 0 3px rgba(15, 23, 42, 0.2)'
    },
    zIndex: {
        dropdown: 100,
        sticky: 200,
        modal: 300,
        toast: 400,
        overlay: 500
    }
} as const;

/**
 * Helpers
 */

export function px(n: number): string {
    return `${n}px`;
}

export function row(gap: number = theme.spacing.xs, align: CSSProperties['alignItems'] = 'center'): CSSProperties {
    return {
        display: 'flex',
        flexDirection: 'row',
        alignItems: align,
        gap: px(gap)
    };
}

export function col(gap: number = theme.spacing.xs, align: CSSProperties['alignItems'] = 'stretch'): CSSProperties {
    return {
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        gap: px(gap)
    };
}

export function cardStyle(overrides?: CSSProperties): CSSProperties {
    return {
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: px(theme.radius.md),
        padding: px(theme.spacing.lg),
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        ...overrides
    };
}

export function inputStyle(overrides?: CSSProperties): CSSProperties {
    return {
        width: '100%',
        padding: '10px',
        borderRadius: px(theme.radius.sm),
        border: `1px solid ${theme.colors.border}`,
        fontSize: px(theme.typography.baseFontSize),
        color: theme.colors.textPrimary,
        background: theme.colors.surface,
        outline: 'none',
        transition: 'border-color 0.2s',
        ...overrides
    };
}

export function buttonStyle(variant: 'primary' | 'secondary' | 'danger' = 'primary', overrides?: CSSProperties): CSSProperties {
    const base: CSSProperties = {
        padding: '8px 16px',
        borderRadius: px(theme.radius.sm),
        fontSize: px(theme.typography.baseFontSize),
        fontWeight: 600,
        cursor: 'pointer',
        border: 'none',
        transition: 'opacity 0.2s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...overrides
    };

    if (variant === 'primary') {
        return {
            ...base,
            background: theme.colors.primary,
            color: '#ffffff'
        };
    }

    if (variant === 'danger') {
        return {
            ...base,
            background: theme.colors.dangerBg,
            color: theme.colors.danger,
            border: `1px solid ${theme.colors.danger}`
        };
    }

    // Secondary
    return {
        ...base,
        background: theme.colors.surface,
        color: theme.colors.textPrimary,
        border: `1px solid ${theme.colors.border}`
    };
}

export function tableStyle(): CSSProperties {
    return {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontSize: px(theme.typography.baseFontSize)
    };
}

export function thStyle(): CSSProperties {
    return {
        textAlign: 'left',
        padding: px(theme.spacing.sm),
        borderBottom: `2px solid ${theme.colors.border}`,
        fontWeight: 600,
        color: theme.colors.textSecondary
    };
}

export function tdStyle(): CSSProperties {
    return {
        padding: px(theme.spacing.sm),
        borderBottom: `1px solid ${theme.colors.border}`,
        color: theme.colors.textPrimary
    };
}
