'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme, px } from '@/lib/theme';
import type { InpatientStayRecord } from '../../../lib/api';

export type StayCarePlanTabProps = {
  stay: InpatientStayRecord;
};

export function StayCarePlanTab({ stay }: StayCarePlanTabProps) {
  return (
    <Card style={{ padding: px(16) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Plano de Cuidados</h3>
        {stay.wardId && (
          <Link href={`/inpatient/handovers?wardId=${stay.wardId}&stayId=${stay.id}`}>
            <Button size="sm" variant="secondary">Abrir Plantão da Ala</Button>
          </Link>
        )}
      </div>

      {/* Plan Summary */}
      {stay.planSummary ? (
        <div style={{ 
          padding: px(16), 
          background: '#f8fafc', 
          borderRadius: px(8), 
          marginBottom: 16,
          border: `1px solid ${theme.colors.border}`
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: theme.colors.textSecondary }}>Resumo do Plano</h4>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{stay.planSummary}</p>
        </div>
      ) : (
        <div style={{ 
          padding: px(16), 
          background: '#fffbeb', 
          borderRadius: px(8), 
          marginBottom: 16,
          border: `1px solid #fcd34d`,
          color: '#92400e'
        }}>
          Nenhum plano de cuidados registrado para esta internação.
        </div>
      )}

      {/* Chief Complaint */}
      {stay.chiefComplaint && (
        <div style={{ 
          padding: px(16), 
          background: '#f0fdf4', 
          borderRadius: px(8), 
          marginBottom: 16,
          border: `1px solid #86efac`
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: theme.colors.textSecondary }}>Queixa Principal</h4>
          <p style={{ margin: 0 }}>{stay.chiefComplaint}</p>
        </div>
      )}

      {/* Reason */}
      {stay.reason && (
        <div style={{ 
          padding: px(16), 
          background: '#eff6ff', 
          borderRadius: px(8), 
          marginBottom: 16,
          border: `1px solid #93c5fd`
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: theme.colors.textSecondary }}>Motivo da Internação</h4>
          <p style={{ margin: 0 }}>{stay.reason}</p>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: px(8), flexWrap: 'wrap' }}>
        {stay.encounterId && (
          <Link href={`/encounters/${stay.encounterId}`}>
            <Button variant="secondary">Ver Prontuário Completo</Button>
          </Link>
        )}
        {stay.wardId && (
          <Link href={`/inpatient/mar?wardId=${stay.wardId}&stayId=${stay.id}`}>
            <Button variant="secondary">Abrir MAR da Ala</Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
