import Link from 'next/link';
import { EncounterTimelineEvent, EncounterTimelineNote } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme, px } from '@/lib/theme';
import { formatDateTime } from '../utils/helpers';

interface ClinicalTimelineProps {
  /** Timeline events from the encounter */
  events: EncounterTimelineEvent[];
  /** Notes for quick selection */
  notes: EncounterTimelineNote[];
  /** Current encounter ID for links */
  encounterId: string;
  /** Currently selected note ID */
  selectedNoteId?: string | null;
  /** Callback when a note is selected */
  onSelectNote?: (noteId: string) => void;
  /** Callback to refresh timeline */
  onRefresh?: () => void;
  /** Compact mode for sidebar */
  compact?: boolean;
}

/**
 * Event type configuration with icons and colors
 */
const EVENT_CONFIG = {
  'encounter.opened': {
    icon: '🚀',
    label: 'Atendimento Iniciado',
    color: theme.colors.success,
    bgColor: theme.colors.successBg,
  },
  'encounter.closed': {
    icon: '🏁',
    label: 'Atendimento Encerrado',
    color: theme.colors.textSecondary,
    bgColor: theme.colors.pageBg,
  },
  'note.created': {
    icon: '📝',
    label: 'Evolução Criada',
    color: theme.colors.primary,
    bgColor: theme.colors.pageBg,
  },
  'note.signed': {
    icon: '✍️',
    label: 'Evolução Assinada',
    color: theme.colors.success,
    bgColor: theme.colors.successBg,
  },
  'note.version.created': {
    icon: '📑',
    label: 'Nova Versão',
    color: theme.colors.warning,
    bgColor: theme.colors.warningBg,
  },
  'document.attached': {
    icon: '📎',
    label: 'Documento Anexado',
    color: theme.colors.info,
    bgColor: theme.colors.pageBg,
  },
} as const;

/**
 * ClinicalTimeline Component
 *
 * A visual timeline of clinical events with:
 * - Chronological grouping by day
 * - Visual icons for event types
 * - Quick navigation to notes
 * - Note selector for quick access
 *
 * @example
 * ```tsx
 * <ClinicalTimeline
 *   events={timeline}
 *   notes={notes}
 *   encounterId={encounterId}
 *   selectedNoteId={selectedNoteId}
 *   onSelectNote={handleSelectNote}
 *   onRefresh={handleRefresh}
 * />
 * ```
 */
export function ClinicalTimeline({
  events,
  notes,
  encounterId,
  selectedNoteId,
  onSelectNote,
  onRefresh,
  compact = false,
}: ClinicalTimelineProps) {
  // Sort events descending by date
  const sortedEvents = [...events].sort((a, b) => {
    return new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime();
  });

  // Group events by day
  const groupedEvents = groupEventsByDay(sortedEvents);

  // Get event display configuration
  const getEventConfig = (kind: EncounterTimelineEvent['kind']) => {
    return EVENT_CONFIG[kind as keyof typeof EVENT_CONFIG] ?? {
      icon: '•',
      label: kind,
      color: theme.colors.textSecondary,
      bgColor: theme.colors.pageBg,
    };
  };

  return (
    <Card
      style={{
        padding: compact ? px(12) : px(20),
        display: 'flex',
        flexDirection: 'column',
        gap: px(16),
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, fontSize: compact ? px(16) : px(18) }}>
          Linha do Tempo
        </h2>
        {onRefresh && (
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            Atualizar
          </Button>
        )}
      </div>

      {/* Quick Note Selector */}
      {!compact && notes.length > 0 && onSelectNote && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: px(8),
            padding: px(12),
            background: theme.colors.pageBg,
            borderRadius: px(theme.radius.sm),
          }}
        >
          <span
            style={{
              fontSize: px(12),
              color: theme.colors.textSecondary,
              marginRight: px(4),
            }}
          >
            Notas:
          </span>
          {notes.map((note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note.id)}
              style={{
                padding: '4px 8px',
                fontSize: px(12),
                borderRadius: px(theme.radius.sm),
                border: `1px solid ${
                  selectedNoteId === note.id
                    ? theme.colors.primary
                    : theme.colors.border
                }`,
                background:
                  selectedNoteId === note.id
                    ? theme.colors.primary
                    : 'transparent',
                color:
                  selectedNoteId === note.id
                    ? 'white'
                    : theme.colors.textPrimary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: px(4),
              }}
            >
              {note.status === 'signed' ? '✍️' : '📝'}
              <span>V{note.versionNumber}</span>
            </button>
          ))}
        </div>
      )}

      {/* Timeline Events */}
      {sortedEvents.length === 0 ? (
        <p style={{ color: theme.colors.textSecondary, margin: 0 }}>
          Nenhum evento registrado.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: compact ? px(16) : px(24),
          }}
        >
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              {/* Day Header */}
              <h3
                style={{
                  fontSize: px(12),
                  color: theme.colors.textSecondary,
                  borderBottom: `1px solid ${theme.colors.border}`,
                  paddingBottom: px(4),
                  marginBottom: px(12),
                  textTransform: 'capitalize',
                }}
              >
                {date}
              </h3>

              {/* Events for this day */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: px(12),
                }}
              >
                {dayEvents.map((event, idx) => {
                  const config = getEventConfig(event.kind);
                  const extraInfo = getExtraInfo(event);

                  return (
                    <TimelineEvent
                      key={`${event.kind}-${event.entityId}-${idx}`}
                      event={event}
                      config={config}
                      extraInfo={extraInfo}
                      encounterId={encounterId}
                      compact={compact}
                    />
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

/**
 * Individual timeline event component
 */
function TimelineEvent({
  event,
  config,
  extraInfo,
  encounterId,
  compact,
}: {
  event: EncounterTimelineEvent;
  config: {
    icon: string;
    label: string;
    color: string;
    bgColor: string;
  };
  extraInfo: string | null;
  encounterId: string;
  compact: boolean;
}) {
  const link = getEventLink(event, encounterId);

  return (
    <div
      style={{
        display: 'flex',
        gap: px(12),
        alignItems: 'flex-start',
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: compact ? px(14) : px(16),
          width: compact ? px(28) : px(32),
          height: compact ? px(28) : px(32),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: config.bgColor,
          borderRadius: px(theme.radius.full),
          border: `1px solid ${config.color}`,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: px(8),
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 600,
                color: theme.colors.textPrimary,
                fontSize: compact ? px(13) : px(14),
              }}
            >
              {config.label}
            </div>
            <div
              style={{
                fontSize: px(12),
                color: theme.colors.textSecondary,
              }}
            >
              {formatDateTime(event.happenedAt)}
            </div>
            {extraInfo && (
              <div
                style={{
                  fontSize: px(12),
                  marginTop: px(4),
                  color: theme.colors.textSecondary,
                }}
              >
                {extraInfo}
              </div>
            )}
          </div>

          {/* Link to related entity */}
          {link && (
            <Link
              href={link}
              style={{
                textDecoration: 'none',
                fontSize: px(12),
                color: theme.colors.primary,
                whiteSpace: 'nowrap',
              }}
            >
              Ver →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Group events by day
 */
function groupEventsByDay(
  events: EncounterTimelineEvent[]
): Record<string, EncounterTimelineEvent[]> {
  const grouped: Record<string, EncounterTimelineEvent[]> = {};

  events.forEach((event) => {
    const date = new Date(event.happenedAt).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });

  return grouped;
}

/**
 * Get extra info from event data
 */
function getExtraInfo(event: EncounterTimelineEvent): string | null {
  if (event.data?.filename) {
    return `Arquivo: ${event.data.filename}`;
  }
  if (event.data?.reason) {
    return `Motivo: ${event.data.reason}`;
  }
  return null;
}

/**
 * Get link for event
 */
function getEventLink(
  event: EncounterTimelineEvent,
  encounterId: string
): string | null {
  switch (event.kind) {
    case 'note.created':
    case 'note.signed':
      return `/encounters/${encounterId}?tab=soap&noteId=${event.entityId}`;
    case 'note.version.created':
      return `/encounters/${encounterId}?tab=soap&noteId=${event.data?.noteId || event.entityId}`;
    case 'document.attached':
      return `/encounters/${encounterId}?tab=documents`;
    default:
      return null;
  }
}

export default ClinicalTimeline;
