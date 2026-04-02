import type { AccountId, EncounterId, TriageRecordId, UserId } from '@cvg-his-v2/shared-types';

export type TriageVersionId = string & { readonly __brand: 'TriageVersionId' };

export interface TriageVersionSnapshot {
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly chiefComplaint: string;
  readonly initialNotes?: string;
  readonly alerts: readonly string[];
  readonly destination: 'in_care' | 'observation';
  readonly updatedAt: string;
}

export interface TriageVersionSummary {
  readonly id: TriageVersionId;
  readonly triageId: TriageRecordId;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly changedFields: readonly string[];
  readonly previousSnapshot: TriageVersionSnapshot;
  readonly nextSnapshot: TriageVersionSnapshot;
  readonly changedByUserId: UserId;
  readonly createdAt: string;
}
