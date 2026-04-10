import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';

export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

export interface OutboxEvent {
  readonly id: string;
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

export interface OutboxRepository {
  create(event: OutboxEvent): Promise<void>;
  update(event: OutboxEvent): Promise<void>;
  findById(id: string): Promise<OutboxEvent | null>;
  findPending(limit: number): Promise<readonly OutboxEvent[]>;
  findByCorrelationId(correlationId: CorrelationId): Promise<readonly OutboxEvent[]>;
}