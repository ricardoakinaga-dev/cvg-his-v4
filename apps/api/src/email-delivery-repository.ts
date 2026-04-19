import { nowIso } from '@cvg-his-v2/shared-utils';

export type EmailDeliveryProviderName = 'local-email' | 'resend';
export type EmailDeliveryStatus = 'queued' | 'sent' | 'failed';

export interface EmailDeliveryRecord {
  readonly messageId: string;
  readonly accountId: string;
  readonly provider: EmailDeliveryProviderName;
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly status: EmailDeliveryStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sentAt?: string;
  readonly failedAt?: string;
  readonly failureReason?: string;
  readonly providerMessageId?: string;
  readonly retryCount: number;
  readonly maxRetries: number;
}

export interface EmailDeliveryRepository {
  create(record: EmailDeliveryRecord): Promise<void>;
  findByMessageId(messageId: string): Promise<EmailDeliveryRecord | null>;
  update(record: EmailDeliveryRecord): Promise<void>;
  list(accountId?: string): Promise<readonly EmailDeliveryRecord[]>;
}

function cloneRecord(record: EmailDeliveryRecord): EmailDeliveryRecord {
  return { ...record };
}

export class InMemoryEmailDeliveryRepository implements EmailDeliveryRepository {
  readonly #records = new Map<string, EmailDeliveryRecord>();

  async create(record: EmailDeliveryRecord): Promise<void> {
    this.#records.set(record.messageId, cloneRecord(record));
  }

  async findByMessageId(messageId: string): Promise<EmailDeliveryRecord | null> {
    const record = this.#records.get(messageId);
    return record ? cloneRecord(record) : null;
  }

  async update(record: EmailDeliveryRecord): Promise<void> {
    this.#records.set(record.messageId, {
      ...cloneRecord(record),
      updatedAt: record.updatedAt ?? nowIso()
    });
  }

  async list(accountId?: string): Promise<readonly EmailDeliveryRecord[]> {
    const items = Array.from(this.#records.values()).filter(
      (item) => !accountId || item.accountId === accountId
    );
    return items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => cloneRecord(item));
  }
}
