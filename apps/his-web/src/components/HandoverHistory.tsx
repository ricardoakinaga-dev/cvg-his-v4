'use client';

import { BuildStatusBadge } from './BuildStatusBadge';

export type HandoverHistoryEntry = {
  handoverId: string;
  shiftDate: string;
  shiftPeriod: 'day' | 'night' | 'custom';
  publishedAt: string;
  buildStatus: 'pending' | 'building' | 'ready' | 'failed';
};

type HandoverHistoryProps = {
  entries: HandoverHistoryEntry[];
  loading: boolean;
  errorMessage: string | null;
  onSelectHandover: (handoverId: string) => void;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('pt-BR');
}

function shiftPeriodLabel(period: HandoverHistoryEntry['shiftPeriod']): string {
  if (period === 'night') {
    return 'Noite';
  }

  if (period === 'custom') {
    return 'Custom';
  }

  return 'Dia';
}

export function HandoverHistory({
  entries,
  loading,
  errorMessage,
  onSelectHandover
}: HandoverHistoryProps): JSX.Element {
  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        background: '#ffffff',
        padding: 14,
        display: 'grid',
        gap: 10
      }}
    >
      <h3 style={{ margin: 0 }}>Últimas 5 publicações</h3>

      {loading ? <p style={{ margin: 0, color: '#475569' }}>Carregando histórico...</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}

      {!loading && entries.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b' }}>Sem publicações para esta ala.</p>
      ) : null}

      {entries.length > 0 ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {entries.map((entry) => (
            <button
              key={entry.handoverId}
              type="button"
              onClick={() => onSelectHandover(entry.handoverId)}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '8px 10px',
                background: '#f8fafc',
                textAlign: 'left',
                display: 'grid',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <strong>{entry.shiftDate}</strong>
                <span style={{ color: '#64748b' }}>{shiftPeriodLabel(entry.shiftPeriod)}</span>
                <BuildStatusBadge status={entry.buildStatus} />
              </div>
              <span style={{ color: '#475569', fontSize: 13 }}>
                Publicado em {formatDate(entry.publishedAt)}
              </span>
              <span style={{ color: '#64748b', fontSize: 12 }}>ID: {entry.handoverId}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

