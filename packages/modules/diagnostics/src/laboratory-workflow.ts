import { createHash } from 'node:crypto';

import type {
  AccountId,
  DiagnosticOrderId,
  DiagnosticOrderSummary,
  LaboratoryResultValue
} from '@cvg-his-v2/shared-types';

export const LABORATORY_LIFECYCLE_STATUSES = [
  'requested',
  'collected',
  'in_analysis',
  'reported',
  'delivered',
  'cancelled'
] as const;

export type LaboratoryLifecycleStatus = (typeof LABORATORY_LIFECYCLE_STATUSES)[number];
export type LegacyLaboratoryStatus = 'resulted';

export function createLaboratoryWorkflowEventId(
  accountId: AccountId,
  orderId: DiagnosticOrderId,
  eventType: LaboratoryWorkflowEvent['eventType'],
  idempotencyKey: string,
  requestFingerprint: string
): string {
  return `lab-event-${createHash('sha256')
    .update([accountId, orderId, eventType, idempotencyKey, requestFingerprint].join('|'))
    .digest('hex')}`;
}

export interface LaboratoryWorkflowEvent {
  readonly id: string;
  readonly eventType: LaboratoryLifecycleStatus | 'recollected' | 'legacy_import';
  readonly status: LaboratoryLifecycleStatus;
  readonly attempt: number;
  readonly reason?: string;
  readonly actorUserId?: string;
  readonly occurredAt: string;
}

export interface LaboratorySignerAuthority {
  isEnabledLaboratorySigner(accountId: AccountId, userId: string): Promise<boolean>;
}

export interface LaboratoryWorkflowPersistenceResult {
  readonly order: DiagnosticOrderSummary;
  readonly workflow: LaboratoryWorkflowState;
  readonly replayed: boolean;
}

export interface LaboratoryWorkflowState {
  readonly orderId: DiagnosticOrderId;
  readonly accountId: AccountId;
  readonly status: LaboratoryLifecycleStatus;
  readonly legacyStatus?: LegacyLaboratoryStatus;
  readonly collectionAttempt: number;
  readonly collectedAt?: string;
  readonly collectedByUserId?: string;
  readonly analysisStartedAt?: string;
  readonly analysisStartedByUserId?: string;
  readonly reportedAt?: string;
  readonly reportedByUserId?: string;
  readonly deliveredAt?: string;
  readonly deliveredByUserId?: string;
  readonly deliveryChannel?: string;
  readonly resultSummary?: string;
  readonly resultValues?: readonly LaboratoryResultValue[];
  readonly resultAttachmentId?: string;
  readonly signedByUserId?: string;
  readonly signatureHash?: string;
  readonly recollectionReason?: string;
  readonly cancellationReason?: string;
  readonly history: readonly LaboratoryWorkflowEvent[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LaboratoryOrderSummary extends Omit<DiagnosticOrderSummary, 'status'> {
  readonly status: LaboratoryLifecycleStatus;
  readonly legacyStatus?: LegacyLaboratoryStatus;
  readonly collectionAttempt: number;
  readonly analysisStartedAt?: string;
  readonly analysisStartedByUserId?: string;
  readonly reportedAt?: string;
  readonly reportedByUserId?: string;
  readonly deliveredAt?: string;
  readonly deliveredByUserId?: string;
  readonly deliveryChannel?: string;
  readonly recollectionReason?: string;
  readonly cancellationReason?: string;
  readonly history: readonly LaboratoryWorkflowEvent[];
  /** Allows older SPA/report consumers to distinguish the canonical workflow response. */
  readonly workflowVersion: 2;
}

export type LaboratoryWorkflowTransitionRequest =
  | {
      readonly status: 'collected';
      readonly collectedByUserId: string;
      readonly idempotencyKey?: string;
    }
  | {
      readonly status: 'in_analysis';
      readonly actorUserId: string;
      readonly idempotencyKey?: string;
    }
  | {
      readonly status: 'reported';
      readonly resultSummary?: string;
      readonly resultValues?: readonly LaboratoryResultValue[];
      readonly resultAttachmentId?: string;
      readonly actorUserId: string;
      readonly idempotencyKey?: string;
    }
  | {
      readonly status: 'delivered';
      readonly deliveredByUserId: string;
      readonly deliveryChannel: string;
      readonly deliveredAt?: string;
      readonly idempotencyKey?: string;
    }
  | {
      readonly status: 'cancelled';
      readonly cancelledByUserId: string;
      readonly cancellationReason?: string;
      readonly idempotencyKey?: string;
    };

export interface LaboratoryRecollectionRequest {
  readonly reason: string;
  readonly collectedByUserId: string;
  readonly idempotencyKey?: string;
}
