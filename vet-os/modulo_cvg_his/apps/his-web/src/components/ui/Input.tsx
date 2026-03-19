'use client';

import { CSSProperties, InputHTMLAttributes, forwardRef, useState, useId } from 'react';
import { theme, px, col } from '../../lib/theme';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, style, id, disabled, ...props }, ref) => {
        const generatedId = useId();
        const inputId = id ?? generatedId;
        const [isFocused, setIsFocused] = useState(false);

        const containerStyle: CSSProperties = {
            ...col(4),
            width: '100%'
        };

        const labelStyle: CSSProperties = {
            fontSize: px(14),
            fontWeight: 500,
            color: theme.colors.textPrimary,
            marginBottom: px(2)
        };

        const inputStyle: CSSProperties = {
            width: '100%',
            height: px(40),
            padding: '0 12px',
            borderRadius: px(theme.radius.sm),
            border: `1px solid ${error ? theme.colors.danger : theme.colors.border}`,
            fontSize: px(14),
            color: disabled ? theme.colors.textSecondary : theme.colors.textPrimary,
            backgroundColor: disabled ? '#f1f5f9' : theme.colors.surface,
            outline: 'none',
            transition: 'border-color 0.2s box-shadow 0.2s',
            boxShadow: isFocused
                ? `0 0 0 1px ${error ? theme.colors.danger : theme.colors.primary}`
                : 'none',
            borderColor: isFocused
                ? (error ? theme.colors.danger : theme.colors.primary)
                : (error ? theme.colors.danger : theme.colors.border),
            ...style
        };

        const helperStyle: CSSProperties = {
            fontSize: px(12),
            color: error ? theme.colors.danger : theme.colors.textSecondary,
            minHeight: px(18) // prevent layout shift
        };

        return (
            <div style={containerStyle}>
                {label && (
                    <label htmlFor={inputId} style={labelStyle}>
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={error || helperText ? `${inputId}-help` : undefined}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    style={inputStyle}
                    {...props}
                />
                {(error || helperText) && (
                    <span id={`${inputId}-help`} style={helperStyle}>
                        {error || helperText}
                    </span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
