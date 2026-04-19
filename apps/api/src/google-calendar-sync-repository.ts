export type GoogleCalendarSyncStatus = 'synced' | 'cancelled' | 'failed';

export interface GoogleCalendarSyncRecord {
  readonly appointmentId: string;
  readonly accountId: string;
  readonly provider: 'local-google-calendar' | 'google-calendar';
  readonly status: GoogleCalendarSyncStatus;
  readonly externalEventId?: string;
  readonly lastSyncedAt: string;
  readonly lastError?: string;
}

export interface GoogleCalendarSyncRepository {
  upsert(record: GoogleCalendarSyncRecord): Promise<void>;
  findByAppointmentId(appointmentId: string): Promise<GoogleCalendarSyncRecord | null>;
  list(accountId?: string): Promise<readonly GoogleCalendarSyncRecord[]>;
}

function cloneRecord(record: GoogleCalendarSyncRecord): GoogleCalendarSyncRecord {
  return { ...record };
}

export class InMemoryGoogleCalendarSyncRepository implements GoogleCalendarSyncRepository {
  readonly #records = new Map<string, GoogleCalendarSyncRecord>();

  async upsert(record: GoogleCalendarSyncRecord): Promise<void> {
    this.#records.set(record.appointmentId, cloneRecord(record));
  }

  async findByAppointmentId(appointmentId: string): Promise<GoogleCalendarSyncRecord | null> {
    const record = this.#records.get(appointmentId);
    return record ? cloneRecord(record) : null;
  }

  async list(accountId?: string): Promise<readonly GoogleCalendarSyncRecord[]> {
    return Array.from(this.#records.values())
      .filter((item) => !accountId || item.accountId === accountId)
      .sort((left, right) => right.lastSyncedAt.localeCompare(left.lastSyncedAt))
      .map((item) => cloneRecord(item));
  }
}
