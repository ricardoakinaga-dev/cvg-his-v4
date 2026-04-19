import { nowIso } from '@cvg-his-v2/shared-utils';

export type SmsDeliveryProviderName = 'local-sms' | 'twilio';
export type SmsDeliveryStatus = 'queued' | 'sent' | 'failed';

export interface SmsDeliveryRecord {
  readonly messageId: string;
  readonly accountId: string;
  readonly provider: SmsDeliveryProviderName;
  readonly to: string;
  readonly text: string;
  readonly status: SmsDeliveryStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sentAt?: string;
  readonly failedAt?: string;
  readonly failureReason?: string;
  readonly providerMessageId?: string;
  readonly retryCount: number;
  readonly maxRetries: number;
}

export interface SmsDeliveryRepository {
  create(record: SmsDeliveryRecord): Promise<void>;
  findByMessageId(messageId: string): Promise<SmsDeliveryRecord | null>;
  update(record: SmsDeliveryRecord): Promise<void>;
  list(accountId?: string): Promise<readonly SmsDeliveryRecord[]>;
}

function cloneRecord(record: SmsDeliveryRecord): SmsDeliveryRecord {
  return { ...record };
}

export class InMemorySmsDeliveryRepository implements SmsDeliveryRepository {
  readonly #records = new Map<string, SmsDeliveryRecord>();

  async create(record: SmsDeliveryRecord): Promise<void> {
    this.#records.set(record.messageId, cloneRecord(record));
  }

  async findByMessageId(messageId: string): Promise<SmsDeliveryRecord | null> {
    const record = this.#records.get(messageId);
    return record ? cloneRecord(record) : null;
  }

  async update(record: SmsDeliveryRecord): Promise<void> {
    this.#records.set(record.messageId, {
      ...cloneRecord(record),
      updatedAt: record.updatedAt ?? nowIso()
    });
  }

  async list(accountId?: string): Promise<readonly SmsDeliveryRecord[]> {
    const items = Array.from(this.#records.values()).filter(
      (item) => !accountId || item.accountId === accountId
    );
    return items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => cloneRecord(item));
  }
}
