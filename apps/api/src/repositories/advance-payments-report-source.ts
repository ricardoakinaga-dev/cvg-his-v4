import type { AdvancePaymentSummary } from '@cvg-his-v2/shared-contracts';
import type { AdvancePaymentsReportSource as FinancialAdvancePaymentsReportSource } from '@cvg-his-v2/module-financial';

export type {
  AdvancePaymentReportRow,
  AdvancePaymentReportStatus,
  AdvancePaymentsReportFilters,
  AdvancePaymentsReportSource
} from '@cvg-his-v2/module-financial';

export type AdvancePaymentSourceType = string;
export type AdvancePaymentWriteSourceType = 'manual';

export type { AdvancePaymentSummary } from '@cvg-his-v2/shared-contracts';

import type { AdvancePaymentsReportFilters } from '@cvg-his-v2/module-financial';

export interface CreateAdvancePaymentInput {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly ownerId: string;
  readonly amountCents: number;
  readonly sourceType: AdvancePaymentWriteSourceType;
  readonly sourceId: string;
  readonly reference?: string;
  readonly notes?: string;
  readonly idempotencyKey: string;
}

export interface CreateAdvancePaymentAllocationInput {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly advancePaymentId: string;
  readonly amountCents: number;
  readonly reference: string;
  readonly notes?: string;
  readonly idempotencyKey: string;
}

export interface AdvancePaymentsRepository extends FinancialAdvancePaymentsReportSource {
  listSummaries(
    accountId: string,
    filters?: AdvancePaymentsReportFilters
  ): Promise<readonly AdvancePaymentSummary[]>;
  create(input: CreateAdvancePaymentInput): Promise<AdvancePaymentSummary>;
  allocate(input: CreateAdvancePaymentAllocationInput): Promise<AdvancePaymentSummary>;
}
