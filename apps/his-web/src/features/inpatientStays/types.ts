import type { InpatientStayRecord, WardRecord, Patient } from '../../lib/api';

export type StayViewMode = 'list' | 'kanban';

export type StayWithPatient = InpatientStayRecord & {
  patient?: Patient;
  ward?: WardRecord;
  bedLabel?: string;
};

export type StaysFilterState = {
  status: InpatientStayRecord['status'] | '';
  wardId: string;
  page: number;
  viewMode: StayViewMode;
};

export type StayTabId = 'prescriptions' | 'administrations' | 'logs' | 'careplan';

export type StayTab = {
  id: StayTabId;
  label: string;
  icon?: string;
};

export const STAY_TABS: StayTab[] = [
  { id: 'prescriptions', label: 'Prescrições', icon: '💊' },
  { id: 'administrations', label: 'Administrações', icon: '💉' },
  { id: 'logs', label: 'Logs', icon: '📋' },
  { id: 'careplan', label: 'Care Plan', icon: '📝' }
];
