import Link from 'next/link';
import { EncounterTimelineEvent, EncounterTimelineResponse } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme, px } from '@/lib/theme';
import { formatDateTime } from '../utils/helpers';

interface EncounterTimelineTabProps {
    timelineResponse: EncounterTimelineResponse;
    encounterId: string;
    onRefresh: () => void;
}

// Icons (Simple generic placeholders suitable for enterprise UI)
const Icons = {
    Start: () => <span>🚀</span>,
    Stop: () => <span>🏁</span>,
    Note: () => <span>📝</span>,
    Sign: () => <span>✍️</span>,
    Version: () => <span>📑</span>,
    Doc: () => <span>📎</span>,
    Unknown: () => <span>•</span>
};

export function EncounterTimelineTab({ timelineResponse, encounterId, onRefresh }: EncounterTimelineTabProps) {
    const { timeline } = timelineResponse;

    // 1. Sort descending
    const sortedEvents = [...timeline].sort((a, b) => {
        return new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime();
    });

    // 2. Group by Day
    const groupedEvents: Record<string, EncounterTimelineEvent[]> = {};
    sortedEvents.forEach(event => {
        const date = new Date(event.happenedAt).toLocaleDateString('pt-BR', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        if (!groupedEvents[date]) groupedEvents[date] = [];
        groupedEvents[date].push(event);
    });

    // Helper: Determine Title, Icon, and Link
    const getEventDetails = (event: EncounterTimelineEvent) => {
        switch (event.kind) {
            case 'encounter.opened':
                return { title: 'Atendimento Iniciado', icon: Icons.Start, link: null };
            case 'encounter.closed':
                return { title: 'Atendimento Encerrado', icon: Icons.Stop, link: null };
            case 'note.created':
                return {
                    title: 'Evolução Criada',
                    icon: Icons.Note,
                    link: `/encounters/${encounterId}?tab=soap&noteId=${event.entityId}` // Direct link logic handled by page
                };
            case 'note.signed':
                return {
                    title: 'Evolução Assinada',
                    icon: Icons.Sign,
                    link: `/encounters/${encounterId}?tab=soap&noteId=${event.entityId}`
                };
            case 'note.version.created':
                return {
                    title: 'Nova Versão de Evolução',
                    icon: Icons.Version,
                    link: `/encounters/${encounterId}?tab=soap&noteId=${event.data?.noteId || event.entityId}`
                };
            case 'document.attached':
                return {
                    title: 'Documento Anexado',
                    icon: Icons.Doc,
                    link: `/encounters/${encounterId}?tab=documents`
                };
            default:
                return { title: `Evento: ${event.kind}`, icon: Icons.Unknown, link: null };
        }
    };

    return (
        <Card style={{ padding: px(20) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: px(20) }}>
                <h2 style={{ margin: 0, fontSize: px(18) }}>Linha do Tempo</h2>
                <Button variant="secondary" size="sm" onClick={onRefresh}>Atualizar</Button>
            </div>

            {sortedEvents.length === 0 ? (
                <p style={{ color: theme.colors.textSecondary }}>Nenhum evento registrado.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: px(24) }}>
                    {Object.entries(groupedEvents).map(([date, events]) => (
                        <div key={date}>
                            <h3 style={{
                                fontSize: px(14),
                                color: theme.colors.textSecondary,
                                borderBottom: `1px solid ${theme.colors.border}`,
                                paddingBottom: px(4),
                                marginBottom: px(12)
                            }}>
                                {date}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: px(16) }}>
                                {events.map((event, idx) => {
                                    const { title, icon: Icon, link } = getEventDetails(event);

                                    // Extract extra info from data if available
                                    const extraInfo = event.data?.filename
                                        ? `Arquivo: ${event.data.filename}`
                                        : event.data?.reason
                                            ? `Motivo: ${event.data.reason}`
                                            : null;

                                    return (
                                        <div
                                            key={`${event.kind}-${event.entityId}-${idx}`}
                                            style={{ display: 'flex', gap: px(12), alignItems: 'flex-start' }}
                                        >
                                            <div style={{
                                                fontSize: px(18),
                                                width: px(32),
                                                height: px(32),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: theme.colors.pageBg,
                                                borderRadius: px(theme.radius.full),
                                                border: `1px solid ${theme.colors.border}`
                                            }}>
                                                <Icon />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: theme.colors.textPrimary }}>
                                                            {title}
                                                        </div>
                                                        <div style={{ fontSize: px(12), color: theme.colors.textSecondary }}>
                                                            {formatDateTime(event.happenedAt)}
                                                        </div>
                                                        {extraInfo && (
                                                            <div style={{ fontSize: px(13), marginTop: px(4), color: theme.colors.textPrimary }}>
                                                                {extraInfo}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {link && (
                                                        <Link href={link} style={{ textDecoration: 'none' }}>
                                                            <Button variant="secondary" size="sm" style={{ fontSize: px(12) }}>
                                                                Ver
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
