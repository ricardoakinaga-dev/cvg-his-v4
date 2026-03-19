'use client';

import React, { useState, useEffect } from 'react';
import { listOwners, type Owner } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Primitives';
import { px, theme } from '@/lib/theme';

interface OwnerSearchProps {
    onSelect: (owner: Owner) => void;
}

export function OwnerSearch({ onSelect }: OwnerSearchProps) {
    const [q, setQ] = useState('');
    const [results, setResults] = useState<Owner[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        const handler = setTimeout(async () => {
            if (q.length < 3) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                const res = await listOwners({ q, pageSize: 5 });
                setResults(res.data);
                setSearched(true);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [q]);

    return (
        <div style={{ position: 'relative' }}>
            <Input
                placeholder="Buscar tutor por nome, documento ou telefone..."
                value={q}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
                autoFocus
            />
            {loading && (
                <div style={{ position: 'absolute', right: 10, top: 10 }}>
                    <Spinner size={20} />
                </div>
            )}

            {q.length >= 3 && !loading && (
                <div style={{
                    marginTop: px(4),
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: px(theme.radius.sm),
                    background: theme.colors.surface,
                    maxHeight: px(200),
                    overflowY: 'auto'
                }}>
                    {results.length === 0 && searched ? (
                        <div style={{ padding: px(12), color: theme.colors.textSecondary, fontSize: px(14) }}>
                            Nenhum tutor encontrado.
                        </div>
                    ) : (
                        results.map(owner => (
                            <div
                                key={owner.id}
                                onClick={() => onSelect(owner)}
                                style={{
                                    padding: px(12),
                                    cursor: 'pointer',
                                    borderBottom: `1px solid ${theme.colors.border}`,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                <div style={{ fontWeight: 600, fontSize: px(14) }}>{owner.fullName}</div>
                                <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                                    {[owner.document, owner.phoneMain].filter(Boolean).join(' • ')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
