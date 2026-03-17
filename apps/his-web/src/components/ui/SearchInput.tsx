'use client';

import { CSSProperties, forwardRef, useState, useId } from 'react';
import { theme, px, row } from '../../lib/theme';

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    disabled?: boolean;
    minQueryLength?: number;
    showMinLengthHint?: boolean;
    style?: CSSProperties;
    'aria-label'?: string;
}

/**
 * SearchInput - Accessible search input with clear button and min length hint
 * 
 * Features:
 * - Clear button (X) to reset search
 * - Visual hint for minimum query length
 * - Keyboard accessible (Escape to clear)
 * - Focus ring for accessibility
 * 
 * Accessibility:
 * - Uses aria-label for screen readers
 * - Shows aria-live hint for minimum length
 * - Focus visible ring
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    ({ 
        value, 
        onChange, 
        placeholder = 'Buscar...', 
        autoFocus = false,
        disabled = false,
        minQueryLength = 2,
        showMinLengthHint = true,
        style,
        'aria-label': ariaLabel = 'Campo de busca'
    }, ref) => {
        const inputId = useId();
        const [isFocused, setIsFocused] = useState(false);
        
        const isTooShort = value.length > 0 && value.length < minQueryLength;
        const showHint = showMinLengthHint && isTooShort;

        return (
            <div style={{ position: 'relative', width: '100%', ...style }}>
                <div style={{
                    ...row(8, 'center'),
                    position: 'relative'
                }}>
                    {/* Search Icon */}
                    <div style={{
                        position: 'absolute',
                        left: px(12),
                        color: theme.colors.textSecondary,
                        pointerEvents: 'none'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>

                    {/* Input */}
                    <input
                        ref={ref}
                        id={inputId}
                        type="search"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoFocus={autoFocus}
                        disabled={disabled}
                        aria-label={ariaLabel}
                        aria-invalid={isTooShort}
                        aria-describedby={showHint ? `${inputId}-hint` : undefined}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                onChange('');
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        style={{
                            width: '100%',
                            height: px(40),
                            padding: `0 ${px(40)} 0 ${px(40)}`,
                            borderRadius: px(theme.radius.sm),
                            border: `1px solid ${isTooShort ? theme.colors.warning : isFocused ? theme.colors.primary : theme.colors.border}`,
                            fontSize: px(14),
                            color: disabled ? theme.colors.textSecondary : theme.colors.textPrimary,
                            backgroundColor: disabled ? '#f1f5f9' : theme.colors.surface,
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            boxShadow: isFocused 
                                ? `0 0 0 2px ${isTooShort ? theme.colors.warningBg : theme.colors.infoBg}` 
                                : 'none'
                        }}
                    />

                    {/* Clear Button */}
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            aria-label="Limpar busca"
                            tabIndex={-1}
                            style={{
                                position: 'absolute',
                                right: px(8),
                                background: 'none',
                                border: 'none',
                                padding: px(4),
                                cursor: 'pointer',
                                color: theme.colors.textSecondary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: px(4),
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Min Length Hint */}
                {showHint && (
                    <div 
                        id={`${inputId}-hint`}
                        role="status"
                        aria-live="polite"
                        style={{
                            ...row(4, 'center'),
                            marginTop: px(4),
                            fontSize: px(12),
                            color: theme.colors.warning
                        }}
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Digite pelo menos {minQueryLength} caracteres para buscar</span>
                    </div>
                )}
            </div>
        );
    }
);

SearchInput.displayName = 'SearchInput';
