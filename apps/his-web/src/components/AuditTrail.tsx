'use client';

import type { AuditTrailEvent } from '../lib/api';

type AuditTrailProps = {
  title?: string;
  events: AuditTrailEvent[];
};

function toDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
}

export function AuditTrail({ title = 'Ultimas alteracoes', events }: AuditTrailProps): JSX.Element {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 20
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>{title}</h2>
      {events.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b' }}>Sem eventos de auditoria disponíveis.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {events.map((event) => (
            <li
              key={event.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 10,
                display: 'grid',
                gap: 4
              }}
            >
              <strong>{event.action}</strong>
              <span style={{ color: '#475569', fontSize: 13 }}>{toDateLabel(event.createdAt)}</span>
              <span style={{ color: '#475569', fontSize: 13 }}>
                role: {event.actorRole ?? 'n/a'} | request: {event.requestId ?? 'n/a'}
              </span>
              {event.reason ? (
                <span style={{ color: '#334155', fontSize: 13 }}>Motivo: {event.reason}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
