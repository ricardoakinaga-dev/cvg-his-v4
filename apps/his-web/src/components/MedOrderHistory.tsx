'use client';

import type {
  AuditEventRecord,
  MedicationAdministrationRecord
} from '../lib/api';

type MedOrderHistoryProps = {
  loading: boolean;
  errorMessage: string | null;
  canReadAudit: boolean;
  canReadLogs: boolean;
  auditEvents: AuditEventRecord[];
  administrationLogs: MedicationAdministrationRecord[];
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'n/a';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-BR');
}

export function MedOrderHistory({
  loading,
  errorMessage,
  canReadAudit,
  canReadLogs,
  auditEvents,
  administrationLogs
}: MedOrderHistoryProps): JSX.Element {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 14
      }}
    >
      <h3 style={{ margin: 0, fontSize: 17 }}>Histórico resumido</h3>

      {loading ? <p style={{ margin: 0, color: '#475569' }}>Carregando histórico...</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}

      <div style={{ display: 'grid', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 15 }}>Audit trail</h4>
        {!canReadAudit ? (
          <p style={{ margin: 0, color: '#b45309' }}>Sem permissão `audit.read`.</p>
        ) : auditEvents.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b' }}>Sem eventos para esta prescrição.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {auditEvents.map((event) => (
              <li
                key={event.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 10,
                  display: 'grid',
                  gap: 3
                }}
              >
                <strong>{event.action}</strong>
                <span style={{ color: '#475569', fontSize: 13 }}>
                  {formatDateTime(event.created_at)} • request {event.request_id ?? 'n/a'}
                </span>
                {event.reason ? (
                  <span style={{ color: '#475569', fontSize: 13 }}>Motivo: {event.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <h4 style={{ margin: 0, fontSize: 15 }}>Logs de administração</h4>
        {!canReadLogs ? (
          <p style={{ margin: 0, color: '#b45309' }}>Sem permissão `medadmin.read`.</p>
        ) : administrationLogs.length === 0 ? (
          <p style={{ margin: 0, color: '#64748b' }}>Sem checagens registradas para esta prescrição.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {administrationLogs.map((log) => (
              <li
                key={log.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 10,
                  display: 'grid',
                  gap: 3
                }}
              >
                <strong>{log.status}</strong>
                <span style={{ color: '#475569', fontSize: 13 }}>
                  slot: {formatDateTime(log.scheduledFor)} • admin: {formatDateTime(log.administeredAt)}
                </span>
                <span style={{ color: '#475569', fontSize: 13 }}>by: {log.administeredByUserId}</span>
                {log.reason ? (
                  <span style={{ color: '#475569', fontSize: 13 }}>Motivo: {log.reason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
