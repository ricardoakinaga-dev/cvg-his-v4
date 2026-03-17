'use client';

import type { MedicationAdministrationRecord } from '../lib/api';

type MedAdminHistoryProps = {
  loading: boolean;
  errorMessage: string | null;
  items: MedicationAdministrationRecord[];
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

export function MedAdminHistory({ loading, errorMessage, items }: MedAdminHistoryProps): JSX.Element {
  return (
    <section
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 16,
        display: 'grid',
        gap: 10
      }}
    >
      <h3 style={{ margin: 0, fontSize: 17 }}>Historico de checagens</h3>
      {loading ? <p style={{ margin: 0, color: '#475569' }}>Carregando historico...</p> : null}
      {errorMessage ? <p style={{ margin: 0, color: '#b91c1c' }}>{errorMessage}</p> : null}

      {!loading && !errorMessage && items.length === 0 ? (
        <p style={{ margin: 0, color: '#64748b' }}>Sem registros de administracao para este stay.</p>
      ) : null}

      {items.length > 0 ? (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {items.map((item) => (
            <li
              key={item.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: 10,
                display: 'grid',
                gap: 3
              }}
            >
              <strong>
                {item.status} • order {item.orderId}
              </strong>
              <span style={{ color: '#475569', fontSize: 13 }}>
                slot: {formatDateTime(item.scheduledFor)} • admin: {formatDateTime(item.administeredAt)}
              </span>
              <span style={{ color: '#475569', fontSize: 13 }}>by: {item.administeredByUserId}</span>
              {item.reason ? (
                <span style={{ color: '#475569', fontSize: 13 }}>Motivo: {item.reason}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
