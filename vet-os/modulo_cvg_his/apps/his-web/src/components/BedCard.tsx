'use client';

import Link from 'next/link';

import type { BedMapBed } from '../lib/api';

type BedCardProps = {
  item: BedMapBed;
  wardId: string;
  canWriteInpatient: boolean;
  canDischargeInpatient: boolean;
  onAdmit: (bed: BedMapBed['bed']) => void;
  onTransfer: (item: BedMapBed) => void;
  onDischarge: (item: BedMapBed) => void;
};

function formatDurationSince(isoDate: string): string {
  const admittedAt = new Date(isoDate);
  const now = Date.now();
  const diffMs = now - admittedAt.getTime();

  if (Number.isNaN(admittedAt.getTime()) || diffMs < 0) {
    return 'n/a';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function BedCard({
  item,
  wardId,
  canWriteInpatient,
  canDischargeInpatient,
  onAdmit,
  onTransfer,
  onDischarge
}: BedCardProps): JSX.Element {
  const occupied = item.status === 'occupied' && item.stay;

  return (
    <article
      style={{
        border: occupied ? '1px solid #fca5a5' : '1px solid #cbd5e1',
        borderRadius: 12,
        background: occupied ? '#fff1f2' : '#f8fafc',
        padding: 14,
        display: 'grid',
        gap: 8
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8
        }}
      >
        <div>
          <strong>{item.bed.name}</strong>
          <span style={{ color: '#64748b', marginLeft: 6 }}>
            {item.bed.code ?? 'sem código'}
          </span>
        </div>
        <span
          style={{
            borderRadius: 999,
            padding: '4px 8px',
            fontSize: 12,
            fontWeight: 700,
            color: occupied ? '#b91c1c' : '#047857',
            background: occupied ? '#fee2e2' : '#dcfce7'
          }}
        >
          {occupied ? 'OCUPADO' : 'LIVRE'}
        </span>
      </header>

      {occupied ? (
        <>
          <p style={{ margin: 0, color: '#0f172a' }}>
            <strong>{occupied.patientName ?? 'Paciente sem nome'}</strong>
            {occupied.species ? ` • ${occupied.species}` : ''}
          </p>
          <p style={{ margin: 0, color: '#475569', fontSize: 14 }}>
            Internado há {formatDurationSince(occupied.admittedAt)}
          </p>
          <p style={{ margin: 0, color: '#7f1d1d', fontSize: 13 }}>
            Alerta: {occupied.reason ?? 'sem motivo informado'}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Link
              href={`/inpatient/stays/${occupied.id}`}
              style={{
                border: '1px solid #0f172a',
                borderRadius: 8,
                background: '#0f172a',
                color: '#ffffff',
                padding: '8px 10px',
                textDecoration: 'none'
              }}
            >
              Abrir Stay
            </Link>

            <Link
              href={`/inpatient/mar?wardId=${wardId}&stayId=${occupied.id}`}
              style={{
                border: '1px solid #0369a1',
                borderRadius: 8,
                background: '#0ea5e9',
                color: '#ffffff',
                padding: '8px 10px',
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              MAR
            </Link>

            <Link
              href={`/patients/${occupied.patientId}`}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#ffffff',
                color: '#0f172a',
                padding: '8px 10px',
                textDecoration: 'none'
              }}
            >
              Ver paciente
            </Link>

            {canWriteInpatient ? (
              <button
                type="button"
                onClick={() => onTransfer(item)}
                style={{
                  border: '1px solid #334155',
                  borderRadius: 8,
                  background: '#ffffff',
                  color: '#0f172a',
                  padding: '8px 10px',
                  cursor: 'pointer'
                }}
              >
                Transferir
              </button>
            ) : null}

            {canDischargeInpatient ? (
              <button
                type="button"
                onClick={() => onDischarge(item)}
                style={{
                  border: '1px solid #dc2626',
                  borderRadius: 8,
                  background: '#fee2e2',
                  color: '#991b1b',
                  padding: '8px 10px',
                  cursor: 'pointer'
                }}
              >
                Dar alta
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          {canWriteInpatient ? (
            <button
              type="button"
              onClick={() => onAdmit(item.bed)}
              style={{
                border: '1px solid #0f172a',
                borderRadius: 8,
                background: '#0f172a',
                color: '#ffffff',
                padding: '8px 10px',
                cursor: 'pointer'
              }}
            >
              Admitir paciente
            </button>
          ) : (
            <span style={{ color: '#64748b', fontSize: 13 }}>
              Sem permissão para admissão
            </span>
          )}
        </div>
      )}
    </article>
  );
}
