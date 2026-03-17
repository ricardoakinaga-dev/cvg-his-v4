'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listEncounters, type EncounterRecord } from '@/lib/api';
import { Spinner } from '@/components/ui/Primitives';
import { Card } from '@/components/ui/Card';
import { RecordEncounterDetail } from './RecordEncounterDetail';
import { px, theme } from '@/lib/theme';

interface RecordTimelineProps {
    patientId: string;
}

export function RecordTimeline({ patientId }: RecordTimelineProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { data: encountersData, isLoading, error } = useQuery({
        queryKey: ['encounters', patientId],
        queryFn: () => listEncounters({ patientId, pageSize: 50 })
    });

    if (isLoading) {
        return (
            <div style={{ padding: px(40), display: 'flex', justifyContent: 'center' }}>
                <Spinner size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <Card style={{ padding: px(24), borderColor: theme.colors.danger }}>
                <p style={{ margin: 0, color: theme.colors.danger }}>Erro ao carregar os registros clínicos do paciente.</p>
            </Card>
        );
    }

    const encounters = encountersData?.data || [];

    if (encounters.length === 0) {
        return (
            <Card style={{ padding: px(40), textAlign: 'center', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, color: theme.colors.textPrimary, fontSize: px(16), fontWeight: 500 }}>
                    Nenhum registro clínico encontrado
                </h3>
                <p style={{ margin: 0, marginTop: px(8), color: theme.colors.textSecondary, fontSize: px(14) }}>
                    Este paciente ainda não possui histórico de atendimentos no sistema.
                </p>
            </Card>
        );
    }

    const toggleExpand = (id: string) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
            {encounters.map((encounter: EncounterRecord) => {
                const isExpanded = expandedId === encounter.id;
                const dateHeader = new Date(encounter.openedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                return (
                    <Card
                        key={encounter.id}
                        style={{
                            overflow: 'hidden',
                            border: `1px solid ${isExpanded ? theme.colors.primary : theme.colors.border}`,
                            transition: 'all 0.2s ease-in-out',
                            boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        {/* Timeline Header (Clickable) */}
                        <div
                            onClick={() => toggleExpand(encounter.id)}
                            style={{
                                padding: px(16),
                                background: isExpanded ? '#f0fdf4' : '#ffffff', // subtle green if expanded
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: px(4) }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: px(12) }}>
                                    <h3 style={{ margin: 0, fontSize: px(16), fontWeight: 600, color: theme.colors.textPrimary }}>
                                        Atendimento
                                    </h3>
                                    <span style={{ fontSize: px(13), color: theme.colors.textSecondary }}>
                                        {dateHeader}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: px(14), color: theme.colors.textPrimary }}>
                                    <strong>Motivo:</strong> {encounter.reason || 'Sem motivo registrado'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: px(16) }}>
                                <span style={{
                                    padding: `${px(4)} ${px(8)}`,
                                    borderRadius: px(theme.radius.sm),
                                    fontSize: px(12),
                                    fontWeight: 600,
                                    background: encounter.status === 'open' ? '#dbeafe' : '#f1f5f9',
                                    color: encounter.status === 'open' ? '#1d4ed8' : '#475569'
                                }}>
                                    {encounter.status === 'open' ? 'Aberto' : 'Finalizado'}
                                </span>

                                <svg
                                    width="20" height="20" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{
                                        color: theme.colors.textSecondary,
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </div>
                        </div>

                        {/* Lazy Loaded Detail Expansion */}
                        {isExpanded && (
                            <div style={{ padding: px(16), borderTop: `1px solid ${theme.colors.border}` }}>
                                <RecordEncounterDetail encounterId={encounter.id} />
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
