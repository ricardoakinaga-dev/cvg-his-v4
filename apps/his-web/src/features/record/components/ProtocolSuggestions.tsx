'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { listProtocols, ProtocolRecord } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Primitives';
import { px, theme } from '@/lib/theme';

export function ProtocolSuggestions() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['protocols', 'published'],
        queryFn: () => listProtocols({ status: 'published', pageSize: 5 }),
    });

    if (isLoading) {
        return (
            <Card style={{ padding: px(16), display: 'flex', justifyContent: 'center' }}>
                <Spinner />
            </Card>
        );
    }

    if (error) {
        return (
            <Card style={{ padding: px(16), borderColor: theme.colors.danger }}>
                <p style={{ margin: 0, fontSize: px(12), color: theme.colors.danger }}>
                    Erro ao buscar protocolos
                </p>
            </Card>
        );
    }

    const protocols = data?.data || [];

    return (
        <Card style={{ padding: px(16) }}>
            <h3 style={{ margin: 0, fontSize: px(14), fontWeight: 600, color: '#111827', marginBottom: px(12) }}>
                Protocolos Sugeridos
            </h3>

            {protocols.length === 0 ? (
                <p style={{ margin: 0, fontSize: px(13), color: '#6B7280' }}>
                    Nenhum protocolo compatível no momento.
                </p>
            ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: px(8) }}>
                    {protocols.map((protocol: ProtocolRecord) => (
                        <li key={protocol.id} style={{
                            padding: px(12),
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: px(theme.radius.sm),
                            background: '#f8fafc',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = theme.colors.primary;
                                e.currentTarget.style.background = '#eff6ff';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = theme.colors.border;
                                e.currentTarget.style.background = '#f8fafc';
                            }}
                        >
                            <h4 style={{ margin: 0, fontSize: px(13), fontWeight: 600, color: theme.colors.primary }}>
                                {protocol.title}
                            </h4>
                            {protocol.description && (
                                <p style={{ margin: 0, marginTop: px(4), fontSize: px(12), color: '#6B7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {protocol.description}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
