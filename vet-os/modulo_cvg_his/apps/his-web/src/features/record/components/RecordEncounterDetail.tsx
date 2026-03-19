'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEncounterTimeline, type EncounterTimelineEvent } from '@/lib/api';
import { Spinner } from '@/components/ui/Primitives';
import { px, theme } from '@/lib/theme';
import { EncounterSoapTab } from '@/features/encounter/components/EncounterSoapTab';
import { EncounterDocumentsTab } from '@/features/encounter/components/EncounterDocumentsTab';

interface RecordEncounterDetailProps {
    encounterId: string;
}

export function RecordEncounterDetail({ encounterId }: RecordEncounterDetailProps) {
    const { data: timelineData, isLoading, error } = useQuery({
        queryKey: ['encounter-timeline', encounterId],
        queryFn: () => getEncounterTimeline(encounterId)
    });

    if (isLoading) {
        return (
            <div style={{ padding: px(24), display: 'flex', justifyContent: 'center' }}>
                <Spinner size={24} />
            </div>
        );
    }

    if (error || !timelineData) {
        return (
            <div style={{ padding: px(16), color: theme.colors.danger, fontSize: px(14) }}>
                Erro ao carregar detalhes do atendimento.
            </div>
        );
    }

    // Filter relevant events for the timeline
    // Instead of using the full EncounterTabs which relies on URL parameters and page routing,
    // we render specific components in a scrollable, read-only accordion fashion.

    // We pass empty/noop functions down where mutations are expected, simulating a "Read-Only History" view
    // if the encounter is closed.

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(24), padding: `${px(16)} 0` }}>
            {/* SOAP Notes Section */}
            <section>
                <h4 style={{ margin: 0, marginBottom: px(12), fontSize: px(15), fontWeight: 600, color: theme.colors.textPrimary }}>
                    Evolução Clínica (SOAP)
                </h4>
                <div style={{
                    background: '#fcfcfc',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: px(theme.radius.md),
                    padding: px(16)
                }}>
                    {/* @ts-expect-error Tabs expect context that we don't have here, forcing render */}
                    <EncounterSoapTab encounterId={encounterId} />
                </div>
            </section>

            {/* Documents & Images & Exams Section */}
            <section>
                <h4 style={{ margin: 0, marginBottom: px(12), fontSize: px(15), fontWeight: 600, color: theme.colors.textPrimary }}>
                    Exames & Anexos
                </h4>
                <div style={{
                    background: '#fcfcfc',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: px(theme.radius.md),
                    padding: px(16)
                }}>
                    {/* @ts-expect-error Tabs expect context that we don't have here, forcing render */}
                    <EncounterDocumentsTab encounterId={encounterId} />
                </div>
            </section>

            {/* Structured Timeline Audit */}
            {timelineData.timeline.length > 0 && (
                <section>
                    <h4 style={{ margin: 0, marginBottom: px(12), fontSize: px(15), fontWeight: 600, color: theme.colors.textPrimary }}>
                        Histórico do Atendimento
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: px(16), display: 'flex', flexDirection: 'column', gap: px(12) }}>
                        {timelineData.timeline.map((event: EncounterTimelineEvent, idx: number) => (
                            <li key={`${event.entityId}-${idx}`} style={{ fontSize: px(13), color: theme.colors.textSecondary }}>
                                <strong style={{ color: theme.colors.textPrimary }}>
                                    {new Date(event.happenedAt).toLocaleString('pt-BR')}
                                </strong>
                                {' - '}
                                {event.kind === 'note.created' && 'Nota SOAP Criada'}
                                {event.kind === 'note.signed' && 'Nota SOAP Assinada'}
                                {event.kind === 'document.attached' && 'Documento Anexado'}
                                {event.kind === 'note.version.created' && 'Revisão Clínica Registrada'}
                                {event.kind === 'encounter.opened' && 'Atendimento Iniciado'}
                                {event.kind === 'encounter.closed' && 'Atendimento Finalizado'}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
