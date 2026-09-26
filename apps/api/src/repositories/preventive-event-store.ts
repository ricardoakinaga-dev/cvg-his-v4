import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

type PreventiveItemType = 'vaccine' | 'dewormer' | 'other';
type PreventiveEventStatus = 'scheduled' | 'executed';

interface PreventiveEventSummary {
  readonly id: string;
  readonly accountId: string;
  readonly patientId: string | null;
  readonly ownerId: string | null;
  readonly clientName: string;
  readonly animalName: string;
  readonly eventDate: string;
  readonly itemType: PreventiveItemType;
  readonly protocolCode: string | null;
  readonly lotNumber: string | null;
  readonly description: string;
  readonly status: PreventiveEventStatus;
  readonly observation: string | null;
  readonly executedAt: string | null;
  readonly executedObservation: string | null;
  readonly nextDoseDate: string | null;
  readonly rescheduledFromId: string | null;
  readonly reminderEmailPreparedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PreventiveEventInput {
  readonly patientId?: string | null;
  readonly ownerId?: string | null;
  readonly clientName?: string;
  readonly animalName?: string;
  readonly eventDate?: string;
  readonly itemType?: PreventiveItemType;
  readonly protocolCode?: string | null;
  readonly lotNumber?: string | null;
  readonly description?: string;
  readonly observation?: string | null;
  readonly status?: PreventiveEventStatus;
}

export interface PreventiveEventExecuteInput {
  readonly observation?: string | null;
  readonly rescheduleTo?: string | null;
}

export interface PreventiveEventListFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly client?: string;
  readonly animal?: string;
  readonly patientId?: string;
  readonly ownerId?: string;
  readonly includeExecuted?: boolean;
  readonly itemType?: string;
}

interface PreventiveEmailResult {
  readonly preparedCount: number;
  readonly preparedAt: string;
}

interface PreventiveEventStore {
  create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary>;
  update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary>;
  getOrThrow(eventId: string): Promise<PreventiveEventSummary>;
  list(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEventSummary[]>;
  delete(eventId: string): Promise<void>;
  execute(
    eventId: string,
    input: PreventiveEventExecuteInput
  ): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }>;
  prepareEmail(eventId: string): Promise<PreventiveEventSummary>;
  prepareBulkEmail(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEmailResult>;
}

const preventiveItemTypes = new Set<PreventiveItemType>(['vaccine', 'dewormer', 'other']);
const preventiveStatuses = new Set<PreventiveEventStatus>(['scheduled', 'executed']);
const preventiveMaxNameLength = 160;
const preventiveMaxDescriptionLength = 255;
const preventiveMaxObservationLength = 1000;
const preventiveMaxProtocolLength = 120;
const preventiveMaxLotLength = 120;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizePreventiveText(
  value: string | undefined,
  field: string,
  maxLength: number
): string {
  const text = requireNonEmptyString(value, field).trim();
  if (text.length > maxLength) {
    throw new ValidationError(`${field} must have at most ${maxLength} characters`);
  }
  return text;
}

function normalizePreventiveOptionalText(
  value: string | null | undefined,
  field: string,
  maxLength: number
): string | null {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) {
    throw new ValidationError(`${field} must have at most ${maxLength} characters`);
  }
  return text;
}

function normalizePreventiveOptionalId(
  value: string | null | undefined,
  field: string
): string | null {
  const text = value?.trim() || null;
  if (text && text.length > 255) {
    throw new ValidationError(`${field} must have at most 255 characters`);
  }
  return text;
}

function normalizePreventiveDate(value: string | undefined, field: string): string {
  const date = requireNonEmptyString(value, field).trim();
  if (!isoDatePattern.test(date) || Number.isNaN(new Date(`${date}T12:00:00Z`).getTime())) {
    throw new ValidationError(`${field} must be a valid YYYY-MM-DD date`);
  }
  return date;
}

function normalizePreventiveOptionalDate(
  value: string | null | undefined,
  field: string
): string | null {
  if (!value?.trim()) return null;
  return normalizePreventiveDate(value, field);
}

function normalizePreventiveItemType(value: PreventiveItemType | undefined): PreventiveItemType {
  if (!value) return 'vaccine';
  if (!preventiveItemTypes.has(value)) {
    throw new ValidationError('itemType is invalid');
  }
  return value;
}

function normalizePreventiveStatus(
  value: PreventiveEventStatus | undefined
): PreventiveEventStatus {
  if (!value) return 'scheduled';
  if (!preventiveStatuses.has(value)) {
    throw new ValidationError('status is invalid');
  }
  return value;
}

function mapPreventiveDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapPreventiveOptionalDate(value: unknown): string | null {
  return value ? mapPreventiveDate(value) : null;
}

function mapPreventiveTimestamp(value: unknown): string | null {
  if (!value) return null;
  return new Date(value as string | Date).toISOString();
}

function mapPreventiveEventRow(row: Record<string, unknown>): PreventiveEventSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: (row.patient_id as string | null) ?? null,
    ownerId: (row.owner_id as string | null) ?? null,
    clientName: row.client_name as string,
    animalName: row.animal_name as string,
    eventDate: mapPreventiveDate(row.event_date),
    itemType: row.item_type as PreventiveItemType,
    protocolCode: (row.protocol_code as string | null) ?? null,
    lotNumber: (row.lot_number as string | null) ?? null,
    description: row.description as string,
    status: row.status as PreventiveEventStatus,
    observation: (row.observation as string | null) ?? null,
    executedAt: mapPreventiveTimestamp(row.executed_at),
    executedObservation: (row.executed_observation as string | null) ?? null,
    nextDoseDate: mapPreventiveOptionalDate(row.next_dose_date),
    rescheduledFromId: (row.rescheduled_from_id as string | null) ?? null,
    reminderEmailPreparedAt: mapPreventiveTimestamp(row.reminder_email_prepared_at),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function createPreventiveEventSummary(
  accountId: string,
  input: PreventiveEventInput,
  rescheduledFromId: string | null = null
): PreventiveEventSummary {
  const now = new Date().toISOString();
  return {
    id: createCorrelationId('preventive'),
    accountId,
    patientId: normalizePreventiveOptionalId(input.patientId, 'patientId'),
    ownerId: normalizePreventiveOptionalId(input.ownerId, 'ownerId'),
    clientName: normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength),
    animalName: normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength),
    eventDate: normalizePreventiveDate(input.eventDate, 'eventDate'),
    itemType: normalizePreventiveItemType(input.itemType),
    protocolCode: normalizePreventiveOptionalText(
      input.protocolCode,
      'protocolCode',
      preventiveMaxProtocolLength
    ),
    lotNumber: normalizePreventiveOptionalText(
      input.lotNumber,
      'lotNumber',
      preventiveMaxLotLength
    ),
    description: normalizePreventiveText(
      input.description,
      'description',
      preventiveMaxDescriptionLength
    ),
    status: normalizePreventiveStatus(input.status),
    observation: normalizePreventiveOptionalText(
      input.observation,
      'observation',
      preventiveMaxObservationLength
    ),
    executedAt: null,
    executedObservation: null,
    nextDoseDate: null,
    rescheduledFromId,
    reminderEmailPreparedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

class InMemoryPreventiveEventStore implements PreventiveEventStore {
  readonly #events = new Map<string, PreventiveEventSummary>();

  async create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const event = createPreventiveEventSummary(accountId, input);
    this.#events.set(event.id, event);
    return event;
  }

  async update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      patientId:
        input.patientId !== undefined
          ? normalizePreventiveOptionalId(input.patientId, 'patientId')
          : existing.patientId,
      ownerId:
        input.ownerId !== undefined
          ? normalizePreventiveOptionalId(input.ownerId, 'ownerId')
          : existing.ownerId,
      clientName:
        input.clientName !== undefined
          ? normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength)
          : existing.clientName,
      animalName:
        input.animalName !== undefined
          ? normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength)
          : existing.animalName,
      eventDate:
        input.eventDate !== undefined
          ? normalizePreventiveDate(input.eventDate, 'eventDate')
          : existing.eventDate,
      itemType:
        input.itemType !== undefined
          ? normalizePreventiveItemType(input.itemType)
          : existing.itemType,
      protocolCode:
        input.protocolCode !== undefined
          ? normalizePreventiveOptionalText(
              input.protocolCode,
              'protocolCode',
              preventiveMaxProtocolLength
            )
          : existing.protocolCode,
      lotNumber:
        input.lotNumber !== undefined
          ? normalizePreventiveOptionalText(input.lotNumber, 'lotNumber', preventiveMaxLotLength)
          : existing.lotNumber,
      description:
        input.description !== undefined
          ? normalizePreventiveText(
              input.description,
              'description',
              preventiveMaxDescriptionLength
            )
          : existing.description,
      status:
        input.status !== undefined ? normalizePreventiveStatus(input.status) : existing.status,
      observation:
        input.observation !== undefined
          ? normalizePreventiveOptionalText(
              input.observation,
              'observation',
              preventiveMaxObservationLength
            )
          : existing.observation,
      updatedAt: new Date().toISOString()
    };
    this.#events.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(eventId: string): Promise<PreventiveEventSummary> {
    const event = this.#events.get(eventId);
    if (!event) {
      throw new NotFoundError('Preventive event not found', { eventId });
    }
    return event;
  }

  async list(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEventSummary[]> {
    let items = Array.from(this.#events.values()).filter((event) => event.accountId === accountId);
    items = applyPreventiveFilters(items, filters);
    return items.sort(
      (a, b) => a.eventDate.localeCompare(b.eventDate) || a.clientName.localeCompare(b.clientName)
    );
  }

  async delete(eventId: string): Promise<void> {
    this.#events.delete(eventId);
  }

  async execute(
    eventId: string,
    input: PreventiveEventExecuteInput
  ): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }> {
    const existing = await this.getOrThrow(eventId);
    const now = new Date().toISOString();
    const event: PreventiveEventSummary = {
      ...existing,
      status: 'executed',
      executedAt: now,
      executedObservation: normalizePreventiveOptionalText(
        input.observation,
        'observation',
        preventiveMaxObservationLength
      ),
      nextDoseDate: normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo'),
      observation:
        normalizePreventiveOptionalText(
          input.observation,
          'observation',
          preventiveMaxObservationLength
        ) ?? existing.observation,
      updatedAt: now
    };
    this.#events.set(event.id, event);

    const rescheduleTo = normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo');
    if (!rescheduleTo) return { event, rescheduledEvent: null };

    const rescheduledEvent: PreventiveEventSummary = {
      ...existing,
      id: createCorrelationId('preventive'),
      eventDate: rescheduleTo,
      status: 'scheduled',
      executedAt: null,
      executedObservation: null,
      nextDoseDate: null,
      rescheduledFromId: event.id,
      reminderEmailPreparedAt: null,
      observation: 'Reagendado apos baixa.',
      createdAt: now,
      updatedAt: now
    };
    this.#events.set(rescheduledEvent.id, rescheduledEvent);
    return { event, rescheduledEvent };
  }

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      reminderEmailPreparedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.#events.set(updated.id, updated);
    return updated;
  }

  async prepareBulkEmail(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEmailResult> {
    const preparedAt = new Date().toISOString();
    const items = await this.list(accountId, filters);
    let preparedCount = 0;
    for (const item of items.filter((event) => event.status === 'scheduled')) {
      this.#events.set(item.id, {
        ...item,
        reminderEmailPreparedAt: preparedAt,
        updatedAt: preparedAt
      });
      preparedCount++;
    }
    return { preparedCount, preparedAt };
  }
}

function applyPreventiveFilters(
  items: PreventiveEventSummary[],
  filters: PreventiveEventListFilters
): PreventiveEventSummary[] {
  const client = filters.client?.trim().toLowerCase();
  const animal = filters.animal?.trim().toLowerCase();
  const dateFrom = filters.dateFrom ? normalizePreventiveDate(filters.dateFrom, 'dateFrom') : null;
  const dateTo = filters.dateTo ? normalizePreventiveDate(filters.dateTo, 'dateTo') : null;

  return items.filter((event) => {
    if (!filters.includeExecuted && event.status === 'executed') return false;
    if (dateFrom && event.eventDate < dateFrom) return false;
    if (dateTo && event.eventDate > dateTo) return false;
    if (
      filters.itemType &&
      preventiveItemTypes.has(filters.itemType as PreventiveItemType) &&
      event.itemType !== filters.itemType
    ) {
      return false;
    }
    if (filters.patientId && event.patientId !== filters.patientId) return false;
    if (filters.ownerId && event.ownerId !== filters.ownerId) return false;
    if (client && !event.clientName.toLowerCase().includes(client)) return false;
    if (animal && !event.animalName.toLowerCase().includes(animal)) return false;
    return true;
  });
}

class DatabasePreventiveEventStore implements PreventiveEventStore {
  async create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const event = createPreventiveEventSummary(accountId, input);
    return await this.insertEvent(event);
  }

  async update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      patientId:
        input.patientId !== undefined
          ? normalizePreventiveOptionalId(input.patientId, 'patientId')
          : existing.patientId,
      ownerId:
        input.ownerId !== undefined
          ? normalizePreventiveOptionalId(input.ownerId, 'ownerId')
          : existing.ownerId,
      clientName:
        input.clientName !== undefined
          ? normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength)
          : existing.clientName,
      animalName:
        input.animalName !== undefined
          ? normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength)
          : existing.animalName,
      eventDate:
        input.eventDate !== undefined
          ? normalizePreventiveDate(input.eventDate, 'eventDate')
          : existing.eventDate,
      itemType:
        input.itemType !== undefined
          ? normalizePreventiveItemType(input.itemType)
          : existing.itemType,
      protocolCode:
        input.protocolCode !== undefined
          ? normalizePreventiveOptionalText(
              input.protocolCode,
              'protocolCode',
              preventiveMaxProtocolLength
            )
          : existing.protocolCode,
      lotNumber:
        input.lotNumber !== undefined
          ? normalizePreventiveOptionalText(input.lotNumber, 'lotNumber', preventiveMaxLotLength)
          : existing.lotNumber,
      description:
        input.description !== undefined
          ? normalizePreventiveText(
              input.description,
              'description',
              preventiveMaxDescriptionLength
            )
          : existing.description,
      status:
        input.status !== undefined ? normalizePreventiveStatus(input.status) : existing.status,
      observation:
        input.observation !== undefined
          ? normalizePreventiveOptionalText(
              input.observation,
              'observation',
              preventiveMaxObservationLength
            )
          : existing.observation,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE preventive_events
         SET client_name = $2,
             animal_name = $3,
             patient_id = $4,
             owner_id = $5,
             event_date = $6,
             item_type = $7,
             protocol_code = $8,
             lot_number = $9,
             description = $10,
             status = $11,
             observation = $12,
             updated_at = $13
         WHERE id = $1
         RETURNING *`,
        [
          eventId,
          updated.clientName,
          updated.animalName,
          updated.patientId,
          updated.ownerId,
          updated.eventDate,
          updated.itemType,
          updated.protocolCode,
          updated.lotNumber,
          updated.description,
          updated.status,
          updated.observation,
          new Date(updated.updatedAt)
        ]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async getOrThrow(eventId: string): Promise<PreventiveEventSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM preventive_events WHERE id = $1', [eventId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEventSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM preventive_events WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (!filters.includeExecuted) {
        sql += ` AND status <> $${nextParam}`;
        params.push('executed');
        nextParam++;
      }
      if (filters.dateFrom) {
        sql += ` AND event_date >= $${nextParam}`;
        params.push(normalizePreventiveDate(filters.dateFrom, 'dateFrom'));
        nextParam++;
      }
      if (filters.dateTo) {
        sql += ` AND event_date <= $${nextParam}`;
        params.push(normalizePreventiveDate(filters.dateTo, 'dateTo'));
        nextParam++;
      }
      if (filters.itemType && preventiveItemTypes.has(filters.itemType as PreventiveItemType)) {
        sql += ` AND item_type = $${nextParam}`;
        params.push(filters.itemType);
        nextParam++;
      }
      if (filters.patientId) {
        sql += ` AND patient_id = $${nextParam}`;
        params.push(filters.patientId);
        nextParam++;
      }
      if (filters.ownerId) {
        sql += ` AND owner_id = $${nextParam}`;
        params.push(filters.ownerId);
        nextParam++;
      }
      if (filters.client) {
        sql += ` AND client_name ILIKE $${nextParam}`;
        params.push(`%${filters.client}%`);
        nextParam++;
      }
      if (filters.animal) {
        sql += ` AND animal_name ILIKE $${nextParam}`;
        params.push(`%${filters.animal}%`);
        nextParam++;
      }

      sql += ' ORDER BY event_date ASC, client_name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapPreventiveEventRow(row));
    });
  }

  async delete(eventId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM preventive_events WHERE id = $1', [eventId]);
    });
  }

  async execute(
    eventId: string,
    input: PreventiveEventExecuteInput
  ): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }> {
    const existing = await this.getOrThrow(eventId);
    const executedObservation = normalizePreventiveOptionalText(
      input.observation,
      'observation',
      preventiveMaxObservationLength
    );
    const rescheduleTo = normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo');
    const now = new Date();

    return await withTenantQuery(getPool(), async (client) => {
      const updateResult = await client.query(
        `UPDATE preventive_events
         SET status = 'executed',
             executed_at = $2,
             executed_observation = $3,
             observation = COALESCE($3, observation),
             next_dose_date = $4,
             updated_at = $2
         WHERE id = $1
         RETURNING *`,
        [eventId, now, executedObservation, rescheduleTo]
      );
      const event = mapPreventiveEventRow(updateResult.rows[0]);

      if (!rescheduleTo) {
        return { event, rescheduledEvent: null };
      }

      const rescheduledEvent = createPreventiveEventSummary(
        existing.accountId,
        {
          patientId: existing.patientId,
          ownerId: existing.ownerId,
          clientName: existing.clientName,
          animalName: existing.animalName,
          eventDate: rescheduleTo,
          itemType: existing.itemType,
          protocolCode: existing.protocolCode,
          lotNumber: existing.lotNumber,
          description: existing.description,
          observation: 'Reagendado apos baixa.',
          status: 'scheduled'
        },
        event.id
      );
      const insertResult = await this.insertEventWithClient(client, rescheduledEvent);
      return { event, rescheduledEvent: insertResult };
    });
  }

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    const preparedAt = new Date();
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE preventive_events
         SET reminder_email_prepared_at = $2,
             updated_at = $2
         WHERE id = $1
         RETURNING *`,
        [eventId, preparedAt]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async prepareBulkEmail(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEmailResult> {
    const preparedAt = new Date();
    const items = await this.list(accountId, { ...filters, includeExecuted: false });
    if (items.length === 0) {
      return { preparedCount: 0, preparedAt: preparedAt.toISOString() };
    }

    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE preventive_events
         SET reminder_email_prepared_at = $2,
             updated_at = $2
         WHERE account_id = $1
           AND id = ANY($3::varchar[])`,
        [accountId, preparedAt, items.map((item) => item.id)]
      );
    });

    return { preparedCount: items.length, preparedAt: preparedAt.toISOString() };
  }

  private async insertEvent(event: PreventiveEventSummary): Promise<PreventiveEventSummary> {
    return await withTenantQuery(getPool(), async (client) =>
      this.insertEventWithClient(client, event)
    );
  }

  private async insertEventWithClient(
    client: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
    },
    event: PreventiveEventSummary
  ): Promise<PreventiveEventSummary> {
    const result = await client.query(
      `INSERT INTO preventive_events (
         id,
         account_id,
         patient_id,
         owner_id,
         client_name,
         animal_name,
         event_date,
         item_type,
         protocol_code,
         lot_number,
         next_dose_date,
         description,
         status,
         observation,
         executed_at,
         executed_observation,
         rescheduled_from_id,
         reminder_email_prepared_at,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        event.id,
        event.accountId,
        event.patientId,
        event.ownerId,
        event.clientName,
        event.animalName,
        event.eventDate,
        event.itemType,
        event.protocolCode,
        event.lotNumber,
        event.nextDoseDate,
        event.description,
        event.status,
        event.observation,
        event.executedAt ? new Date(event.executedAt) : null,
        event.executedObservation,
        event.rescheduledFromId,
        event.reminderEmailPreparedAt ? new Date(event.reminderEmailPreparedAt) : null,
        new Date(event.createdAt),
        new Date(event.updatedAt)
      ]
    );
    return mapPreventiveEventRow(result.rows[0]);
  }
}

export function createPreventiveEventStore(useDatabase: boolean): PreventiveEventStore {
  if (!useDatabase) {
    return new InMemoryPreventiveEventStore();
  }

  try {
    getPool();
    return new DatabasePreventiveEventStore();
  } catch {
    return new InMemoryPreventiveEventStore();
  }
}
