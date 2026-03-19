'use client';

import { MedOrdersPanel } from '@/components/MedOrdersPanel';

export type StayPrescriptionsTabProps = {
  patientId: string;
  stayId: string;
  encounterId?: string | null;
};

export function StayPrescriptionsTab({ patientId, stayId, encounterId }: StayPrescriptionsTabProps) {
  return (
    <MedOrdersPanel
      patientId={patientId}
      stayId={stayId}
      encounterId={encounterId ?? undefined}
    />
  );
}
