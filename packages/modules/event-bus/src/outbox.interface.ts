import type { AccountId, CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface OutboxEvent {
  readonly id: string;
  readonly accountId: AccountId;
  readonly correlationId: CorrelationId;
  readonly moduleName: ModuleName;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly status: EventStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly scheduledAt: string;
  readonly processedAt: string | null;
  readonly error: string | null;
  readonly createdAt: string;
}

export interface OutboxClaim {
  readonly event: OutboxEvent;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseVersion: number;
  readonly leaseExpiresAt: string;
}

export interface ClaimPendingInput {
  readonly limit: number;
  readonly leaseOwner: string;
  readonly leaseMs: number;
}

export interface RetryClaimInput {
  readonly scheduledAt: string;
  readonly error: string;
}

export interface OutboxRepository {
  readonly deliveryGuarantees: 'durable' | 'ephemeral';
  create(event: OutboxEvent): Promise<void>;
  update(event: OutboxEvent): Promise<void>;
  findById(id: string): Promise<OutboxEvent | null>;
  /** Atomically claims eligible events with a fencing token. */
  claimPending(input: ClaimPendingInput): Promise<readonly OutboxClaim[]>;
  /** Extends a currently owned lease. Returns false after lease loss. */
  renewClaim(claim: OutboxClaim, leaseMs: number): Promise<boolean>;
  /** Completes a delivery only while the exact lease is still owned. */
  completeClaim(claim: OutboxClaim, processedAt: string): Promise<boolean>;
  /** Schedules another attempt only while the exact lease is still owned. */
  retryClaim(claim: OutboxClaim, input: RetryClaimInput): Promise<boolean>;
  /** Moves a delivery to DLQ only while the exact lease is still owned. */
  failClaim(claim: OutboxClaim, error: string): Promise<boolean>;
  /** Atomically resets only failed/retrying events for administrative reprocessing. */
  reprocess(eventId: string): Promise<OutboxEvent | null>;
  /** Reads pending and retrying events without claiming or mutating them. */
  peekPending(limit: number): Promise<readonly OutboxEvent[]>;
  /** Returns events that exhausted all retry attempts (DLQ candidates) */
  findFailed(limit: number): Promise<readonly OutboxEvent[]>;
  findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]>;
}
