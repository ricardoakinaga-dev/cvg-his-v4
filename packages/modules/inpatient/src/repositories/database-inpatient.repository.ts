import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  inpatientStays,
  inpatientProgress,
  inpatientOccurrences,
  inpatientDailyCharges
} from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  BillingRecordId,
  PatientId,
  InpatientStayId,
  InpatientStaySummary,
  InpatientProgressId,
  InpatientProgressSummary,
  InpatientOccurrenceId,
  InpatientOccurrenceSummary,
  InpatientDailyChargeId,
  InpatientDailyChargeSummary,
  EncounterId,
  UserId,
  SectorId,
  BedId
} from '@cvg-his-v2/shared-types';

export interface InpatientStayRepository {
  create(stay: InpatientStaySummary): Promise<void>;
  update(stay: InpatientStaySummary): Promise<void>;
  findById(id: InpatientStayId): Promise<InpatientStaySummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly InpatientStaySummary[]>;
}

export interface InpatientProgressRepository {
  create(progress: InpatientProgressSummary): Promise<void>;
  findByStayId(stayId: InpatientStayId): Promise<readonly InpatientProgressSummary[]>;
}

export interface InpatientOccurrenceRepository {
  create(occurrence: InpatientOccurrenceSummary): Promise<void>;
  findByStayId(stayId: InpatientStayId): Promise<readonly InpatientOccurrenceSummary[]>;
}

export interface InpatientDailyChargeRepository {
  create(charge: InpatientDailyChargeSummary): Promise<void>;
  update(charge: InpatientDailyChargeSummary): Promise<void>;
  findByStayId(stayId: InpatientStayId): Promise<readonly InpatientDailyChargeSummary[]>;
}

export class DatabaseInpatientStayRepository implements InpatientStayRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(stay: InpatientStaySummary): Promise<void> {
    await this.#db.insert(inpatientStays).values({
      id: stay.id,
      accountId: stay.accountId,
      encounterId: stay.encounterId,
      patientId: stay.patientId,
      unit: stay.unit,
      ward: stay.ward,
      bed: stay.bed,
      sectorId: stay.sectorId ?? null,
      bedId: stay.bedId ?? null,
      status: stay.status,
      admittedAt: new Date(stay.admittedAt),
      dischargedAt: stay.dischargedAt ? new Date(stay.dischargedAt) : null,
      dischargeReason: stay.dischargeReason ?? null,
      transferToUnit: stay.transferToUnit ?? null,
      transferToWard: stay.transferToWard ?? null,
      transferToSectorId: stay.transferToSectorId ?? null,
      transferToBedId: stay.transferToBedId ?? null,
      createdAt: new Date(stay.admittedAt),
      updatedAt: new Date(stay.updatedAt)
    });
  }

  public async update(stay: InpatientStaySummary): Promise<void> {
    await this.#db
      .update(inpatientStays)
      .set({
        status: stay.status,
        sectorId: stay.sectorId ?? null,
        bedId: stay.bedId ?? null,
        dischargedAt: stay.dischargedAt ? new Date(stay.dischargedAt) : null,
        dischargeReason: stay.dischargeReason ?? null,
        transferToUnit: stay.transferToUnit ?? null,
        transferToWard: stay.transferToWard ?? null,
        transferToSectorId: stay.transferToSectorId ?? null,
        transferToBedId: stay.transferToBedId ?? null,
        updatedAt: new Date(stay.updatedAt)
      })
      .where(eq(inpatientStays.id, stay.id));
  }

  public async findById(id: InpatientStayId): Promise<InpatientStaySummary | null> {
    const result = await this.#db
      .select()
      .from(inpatientStays)
      .where(eq(inpatientStays.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToStay(result[0]);
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly InpatientStaySummary[]> {
    const result = await this.#db
      .select()
      .from(inpatientStays)
      .where(eq(inpatientStays.encounterId, encounterId));

    return result.map((row) => this.mapRowToStay(row));
  }

  private mapRowToStay(row: typeof inpatientStays.$inferSelect): InpatientStaySummary {
    return {
      id: row.id as InpatientStayId,
      accountId: row.accountId as AccountId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      unit: row.unit,
      ward: row.ward,
      bed: row.bed,
      sectorId: row.sectorId ? (row.sectorId as SectorId) : undefined,
      bedId: row.bedId ? (row.bedId as BedId) : undefined,
      status: row.status as InpatientStaySummary['status'],
      admittedAt: row.admittedAt.toISOString(),
      dischargedAt: row.dischargedAt?.toISOString(),
      dischargeReason: row.dischargeReason ?? undefined,
      transferToUnit: row.transferToUnit ?? undefined,
      transferToWard: row.transferToWard ?? undefined,
      transferToSectorId: row.transferToSectorId ? (row.transferToSectorId as SectorId) : undefined,
      transferToBedId: row.transferToBedId ? (row.transferToBedId as BedId) : undefined,
      updatedAt: row.updatedAt.toISOString()
    };
  }
}

export class DatabaseInpatientProgressRepository implements InpatientProgressRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(progress: InpatientProgressSummary): Promise<void> {
    await this.#db.insert(inpatientProgress).values({
      id: progress.id,
      accountId: progress.accountId,
      stayId: progress.stayId,
      encounterId: progress.encounterId,
      note: progress.note,
      authoredByUserId: progress.authoredByUserId,
      createdAt: new Date(progress.createdAt)
    });
  }

  public async findByStayId(stayId: InpatientStayId): Promise<readonly InpatientProgressSummary[]> {
    const result = await this.#db
      .select()
      .from(inpatientProgress)
      .where(eq(inpatientProgress.stayId, stayId));

    return result.map((row) => ({
      id: row.id as InpatientProgressId,
      accountId: row.accountId as AccountId,
      stayId: row.stayId as InpatientStayId,
      encounterId: row.encounterId as EncounterId,
      note: row.note,
      authoredByUserId: row.authoredByUserId as UserId,
      createdAt: row.createdAt.toISOString()
    }));
  }
}

export class DatabaseInpatientOccurrenceRepository implements InpatientOccurrenceRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(occurrence: InpatientOccurrenceSummary): Promise<void> {
    await this.#db.insert(inpatientOccurrences).values({
      id: occurrence.id,
      accountId: occurrence.accountId,
      stayId: occurrence.stayId,
      encounterId: occurrence.encounterId,
      type: occurrence.type,
      severity: occurrence.severity,
      title: occurrence.title,
      description: occurrence.description,
      authoredByUserId: occurrence.authoredByUserId,
      createdAt: new Date(occurrence.createdAt)
    });
  }

  public async findByStayId(stayId: InpatientStayId): Promise<readonly InpatientOccurrenceSummary[]> {
    const result = await this.#db
      .select()
      .from(inpatientOccurrences)
      .where(eq(inpatientOccurrences.stayId, stayId));

    return result.map((row) => ({
      id: row.id as InpatientOccurrenceId,
      accountId: row.accountId as AccountId,
      stayId: row.stayId as InpatientStayId,
      encounterId: row.encounterId as EncounterId,
      type: row.type as InpatientOccurrenceSummary['type'],
      severity: row.severity as InpatientOccurrenceSummary['severity'],
      title: row.title,
      description: row.description,
      authoredByUserId: row.authoredByUserId as UserId,
      createdAt: row.createdAt.toISOString()
    }));
  }
}

export class DatabaseInpatientDailyChargeRepository implements InpatientDailyChargeRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(charge: InpatientDailyChargeSummary): Promise<void> {
    await this.#db.insert(inpatientDailyCharges).values({
      id: charge.id,
      accountId: charge.accountId,
      stayId: charge.stayId,
      encounterId: charge.encounterId,
      patientId: charge.patientId,
      description: charge.description,
      chargeDate: charge.chargeDate,
      quantity: charge.quantity.toString(),
      unitAmount: charge.unitAmount.toString(),
      totalAmount: charge.totalAmount.toString(),
      status: charge.status,
      billingRecordId: charge.billingRecordId ?? null,
      createdByUserId: charge.createdByUserId,
      createdAt: new Date(charge.createdAt),
      updatedAt: new Date(charge.updatedAt)
    });
  }

  public async update(charge: InpatientDailyChargeSummary): Promise<void> {
    await this.#db
      .update(inpatientDailyCharges)
      .set({
        status: charge.status,
        billingRecordId: charge.billingRecordId ?? null,
        updatedAt: new Date(charge.updatedAt)
      })
      .where(eq(inpatientDailyCharges.id, charge.id));
  }

  public async findByStayId(stayId: InpatientStayId): Promise<readonly InpatientDailyChargeSummary[]> {
    const result = await this.#db
      .select()
      .from(inpatientDailyCharges)
      .where(eq(inpatientDailyCharges.stayId, stayId));

    return result.map((row) => ({
      id: row.id as InpatientDailyChargeId,
      accountId: row.accountId as AccountId,
      stayId: row.stayId as InpatientStayId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      description: row.description,
      chargeDate: row.chargeDate,
      quantity: Number(row.quantity),
      unitAmount: Number(row.unitAmount),
      totalAmount: Number(row.totalAmount),
      status: row.status as InpatientDailyChargeSummary['status'],
      billingRecordId: row.billingRecordId ? (row.billingRecordId as BillingRecordId) : undefined,
      createdByUserId: row.createdByUserId as UserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }));
  }
}
