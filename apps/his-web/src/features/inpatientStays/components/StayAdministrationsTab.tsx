'use client';

import { Card } from '@/components/ui/Card';
import { StayMarPanel } from '@/features/inpatient/StayMarPanel';
import { theme, px } from '@/lib/theme';

export type StayAdministrationsTabProps = {
  stayId: string;
};

export function StayAdministrationsTab({ stayId }: StayAdministrationsTabProps) {
  return (
    <Card style={{ padding: px(16) }}>
      <StayMarPanel stayId={stayId} />
    </Card>
  );
}
