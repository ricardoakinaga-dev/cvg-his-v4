import React, { useState, useEffect, useRef } from 'react';
import { px, theme } from '../../lib/theme';
import { Spinner } from './Primitives';

interface Option {
    label: string;
    value: string;
    subLabel?: string;
}

interface DebouncedSelectProps {
    label?: string;
    error?: string;
    placeholder?: string;
    value: string;
    onChange: (value: string, option: Option | null) => void;
    fetchOptions: (query: string) => Promise<Option[]>;
}

export function DebouncedSelect({
    label,
    error,
    placeholder,
    value,
    onChange,
    fetchOptions
}: DebouncedSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState<Option | null>(null);

    const ref = useRef<HTMLDivElement>(null);

    // Initial fetch if needed, though we react on input query
    useEffect(() => {
        if (!open) return;

        let active = true;
        setLoading(true);

        const timer = setTimeout(async () => {
            try {
                const res = await fetchOptions(query);
                if (active) {
                    setOptions(res);
                }
            } catch (err) {
                console.error('Failed to fetch options for DebouncedSelect', err);
            } finally {
                if (active) setLoading(false);
            }
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [query, open, fetchOptions]);

    // Handle clicks outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync selectedOption when value prop changes externally (e.g. from parent clear)
    useEffect(() => {
        if (!value) {
            setSelectedOption(null);
            setQuery('');
        }
    }, [value]);

    const handleSelectOption = (opt: Option) => {
        setSelectedOption(opt);
        setQuery(opt.label);
        onChange(opt.value, opt);
        setOpen(false);
    };

    const handleClear = () => {
        setSelectedOption(null);
        setQuery('');
        onChange('', null);
    };

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            {label && (
                <label style={{ display: 'block', marginBottom: px(4), fontWeight: 500, fontSize: px(14), color: theme.colors.textPrimary }}>
                    {label}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                <input
                    placeholder={selectedOption ? '' : placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                        // If they modify the text after selecting something, clear selection
                        if (selectedOption) {
                            setSelectedOption(null);
                            onChange('', null);
                        }
                    }}
                    onFocus={() => setOpen(true)}
                    style={{
                        width: '100%',
                        padding: px(10),
                        paddingRight: selectedOption ? px(30) : px(10),
                        borderRadius: px(theme.radius.sm),
                        border: `1px solid ${error ? theme.colors.danger : theme.colors.border}`,
                        fontSize: px(14),
                        outline: 'none',
                        boxSizing: 'border-box'
                    }}
                />

                {selectedOption && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            position: 'absolute',
                            right: px(8),
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: theme.colors.textSecondary,
                            padding: px(4)
                        }}
                    >
                        ✕
                    </button>
                )}

                {loading && !selectedOption && (
                    <div style={{ position: 'absolute', right: px(10), top: '50%', transform: 'translateY(-50%)' }}>
                        <Spinner size={16} />
                    </div>
                )}
            </div>

            {error && <span style={{ color: theme.colors.danger, fontSize: px(12), marginTop: px(4) }}>{error}</span>}

            {open && !selectedOption && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: px(4),
                    background: theme.colors.surface,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: px(theme.radius.sm),
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxHeight: px(250),
                    overflowY: 'auto',
                    zIndex: 200,
                    listStyle: 'none',
                    padding: 0,
                    margin: 0
                }}>
                    {options.length === 0 && !loading ? (
                        <li style={{ padding: px(10), color: theme.colors.textSecondary, fontSize: px(14), textAlign: 'center' }}>
                            Nenhum resultado
                        </li>
                    ) : (
                        options.map((opt) => (
                            <li
                                key={opt.value}
                                onClick={() => handleSelectOption(opt)}
                                style={{
                                    padding: `${px(8)} ${px(12)}`,
                                    cursor: 'pointer',
                                    borderBottom: `1px solid ${theme.colors.border}`,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                <span style={{ fontWeight: 500, color: theme.colors.textPrimary, fontSize: px(14) }}>{opt.label}</span>
                                {opt.subLabel && <span style={{ fontSize: px(12), color: theme.colors.textSecondary }}>{opt.subLabel}</span>}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
