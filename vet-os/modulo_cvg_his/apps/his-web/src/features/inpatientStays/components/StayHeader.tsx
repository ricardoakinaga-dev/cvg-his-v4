'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { InpatientStayRecord, WardRecord, Patient } from '../../../lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Primitives';
import { theme, px } from '@/lib/theme';
import { formatDateTime } from '@/features/encounter/utils/helpers';

export type StayHeaderProps = {
  stay: InpatientStayRecord;
  patient?: Patient;
  ward?: WardRecord;
  onTransfer?: () => void;
  onDischarge?: () => void;
};

export function StayHeader({ stay, patient, ward, onTransfer, onDischarge }: StayHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    await navigator.clipboard.writeText(stay.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = {
    active: 'Internado',
    discharged: 'Alta',
    transferred: 'Transferido'
  };

  const statusVariant = {
    active: 'success' as const,
    discharged: 'neutral' as const,
    transferred: 'warning' as const
  };

  return (
    <Card 
      style={{ 
        padding: px(16),
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: 16 }}>
        {/* Left: Patient Info */}
        <div style={{ flex: 1, minWidth: 200 }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: px(13), color: theme.colors.textSecondary, marginBottom: 4 }}>
            <Link href="/inpatient/stays" style={{ color: theme.colors.primary, textDecoration: 'none' }}>
              Internações
            </Link>
            {' > '}Detalhes
          </div>

          {/* Title with Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: px(20), fontWeight: 700, margin: 0 }}>
              {patient?.name ?? `Paciente ${stay.patientId.slice(0, 8)}`}
            </h1>
            <Badge label={statusLabel[stay.status]} variant={statusVariant[stay.status]} />
          </div>

          {/* Stay ID and Dates */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: px(12), color: theme.colors.textSecondary }}>
            <span 
              title={stay.id} 
              style={{ 
                fontFamily: theme.typography.mono, 
                background: '#f1f5f9', 
                padding: '2px 6px', 
                borderRadius: 4,
                cursor: 'pointer'
              }}
              onClick={copyId}
            >
              {stay.id.slice(0, 8)}... {copied ? '✓' : '📋'}
            </span>
            <span>•</span>
            <span>Admissão: {formatDateTime(stay.admittedAt)}</span>
            {stay.dischargedAt && (
              <>
                <span>•</span>
                <span>Alta: {formatDateTime(stay.dischargedAt)}</span>
              </>
            )}
          </div>

          {/* Location Info */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: px(13) }}>
            <div>
              <strong>Ala:</strong> {ward?.name ?? stay.wardId}
            </div>
            <div>
              <strong>Leito:</strong> {stay.bedId.slice(0, 8)}
            </div>
            {stay.chiefComplaint && (
              <div>
                <strong>Motivo:</strong> {stay.chiefComplaint}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'start' }}>
          {stay.encounterId && (
            <Link href={`/encounters/${stay.encounterId}`}>
              <Button variant="secondary">Ver Prontuário</Button>
            </Link>
          )}
          {stay.patientId && (
            <Link href={`/patients/${stay.patientId}`}>
              <Button variant="secondary">Perfil Paciente</Button>
            </Link>
          )}
          
          {stay.status === 'active' && (
            <>
              <Button variant="secondary" onClick={onTransfer}>
                Transferir
              </Button>
              <Button variant="danger" onClick={onDischarge}>
                Dar Alta
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
