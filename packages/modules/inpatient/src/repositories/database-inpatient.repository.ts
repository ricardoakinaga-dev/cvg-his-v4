import { and, desc, eq } from 'drizzle-orm';
import { withTenantTransaction, type DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  inpatientStays,
  inpatientProgress,
  inpatientOccurrences,
  inpatientDailyCharges,
  beds
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
import { requireAccountId } from '@cvg-his-v2/tenant-context';

export interface InpatientStayRepository {
  create(stay: InpatientStaySummary): Promise<void>;
  createWithBedOccupation?(stay: InpatientStaySummary): Promise<void>;
  update(stay: InpatientStaySummary): Promise<void>;
  updateWithBedTransition?(
    stay: InpatientStaySummary,
    previousBedId: BedId | null,
    releaseBedId?: BedId | null
  ): Promise<void>;
  findById(id: InpatientStayId): Promise<InpatientStaySummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly InpatientStaySummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly InpatientStaySummary[]>;
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
    const accountId = requireAccountId();
    if (stay.accountId !== accountId) {
      throw new Error('Inpatient stay account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database.insert(inpatientStays).values(this.toInsert(stay));
    });
  }

  public async createWithBedOccupation(stay: InpatientStaySummary): Promise<void> {
    if (!stay.bedId) {
      await this.create(stay);
      return;
    }
    const accountId = requireAccountId();
    if (stay.accountId !== accountId) {
      throw new Error('Inpatient stay account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (transaction) => {
      await transaction.insert(inpatientStays).values(this.toInsert(stay));
      const occupied = await transaction
        .update(beds)
        .set({ status: 'occupied', updatedAt: new Date(stay.updatedAt) })
        .where(
          and(
            eq(beds.id, stay.bedId!),
            eq(beds.accountId, accountId),
            eq(beds.status, 'available'),
            eq(beds.active, true)
          )
        )
        .returning({ id: beds.id });
      if (occupied.length !== 1) {
        throw new Error('Bed is not available for admission');
      }
    });
  }

  private toInsert(stay: InpatientStaySummary): typeof inpatientStays.$inferInsert {
    return {
      id: stay.id,
      accountId: stay.accountId,
      encounterId: stay.encounterId,
      patientId: stay.patientId,
      ownerId: stay.ownerId,
      admittedByUserId: stay.admittedByUserId,
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
    };
  }

  public async update(stay: InpatientStaySummary): Promise<void> {
    const accountId = requireAccountId();
    if (stay.accountId !== accountId) {
      throw new Error('Inpatient stay account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database
        .update(inpatientStays)
        .set({
          status: stay.status,
          unit: stay.unit,
          ward: stay.ward,
          bed: stay.bed,
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
        .where(and(eq(inpatientStays.id, stay.id), eq(inpatientStays.accountId, accountId)));
    });
  }

  public async updateWithBedTransition(
    stay: InpatientStaySummary,
    previousBedId: BedId | null,
    releaseBedId?: BedId | null
  ): Promise<void> {
    const accountId = requireAccountId();
    if (stay.accountId !== accountId) {
      throw new Error('Inpatient stay account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (transaction) => {
      if (stay.bedId && stay.bedId !== previousBedId) {
        const occupied = await transaction
          .update(beds)
          .set({ status: 'occupied', updatedAt: new Date(stay.updatedAt) })
          .where(
            and(
              eq(beds.id, stay.bedId),
              eq(beds.accountId, accountId),
              eq(beds.status, 'available'),
              eq(beds.active, true)
            )
          )
          .returning({ id: beds.id });
        if (occupied.length !== 1) {
          throw new Error('Bed is not available for inpatient transition');
        }
      }

      if (releaseBedId) {
        const released = await transaction
          .update(beds)
          .set({ status: 'available', updatedAt: new Date(stay.updatedAt) })
          .where(
            and(
              eq(beds.id, releaseBedId),
              eq(beds.accountId, accountId),
              eq(beds.status, 'occupied')
            )
          )
          .returning({ id: beds.id });
        if (released.length !== 1) {
          throw new Error('Bed is not occupied by the current inpatient transition');
        }
      } else if (previousBedId && previousBedId !== stay.bedId) {
        await transaction
          .update(beds)
          .set({ status: 'available', updatedAt: new Date(stay.updatedAt) })
          .where(
            and(
              eq(beds.id, previousBedId),
              eq(beds.accountId, accountId),
              eq(beds.status, 'occupied')
            )
          );
      }

      await transaction
        .update(inpatientStays)
        .set({
          status: stay.status,
          unit: stay.unit,
          ward: stay.ward,
          bed: stay.bed,
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
        .where(and(eq(inpatientStays.id, stay.id), eq(inpatientStays.accountId, accountId)));
    });
  }

  public async findById(id: InpatientStayId): Promise<InpatientStaySummary | null> {
    const accountId = requireAccountId();
    return withTenantTransaction(accountId, async (database) => {
      const result = await database
        .select()
        .from(inpatientStays)
        .where(and(eq(inpatientStays.id, id), eq(inpatientStays.accountId, accountId)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      return this.mapRowToStay(result[0]);
    });
  }

  public async findByEncounterId(
    encounterId: EncounterId
  ): Promise<readonly InpatientStaySummary[]> {
    const accountId = requireAccountId();
    return withTenantTransaction(accountId, async (database) => {
      const result = await database
        .select()
        .from(inpatientStays)
        .where(
          and(eq(inpatientStays.encounterId, encounterId), eq(inpatientStays.accountId, accountId))
        );

      return result.map((row) => this.mapRowToStay(row));
    });
  }

  public async findByAccountId(accountId: AccountId): Promise<readonly InpatientStaySummary[]> {
    if (accountId !== requireAccountId()) {
      throw new Error('Inpatient stay account does not match tenant context');
    }
    return withTenantTransaction(accountId, async (database) => {
      const result = await database
        .select()
        .from(inpatientStays)
        .where(eq(inpatientStays.accountId, accountId))
        .orderBy(desc(inpatientStays.admittedAt));
      return result.map((row) => this.mapRowToStay(row));
    });
  }

  private mapRowToStay(row: typeof inpatientStays.$inferSelect): InpatientStaySummary {
    return {
      id: row.id as InpatientStayId,
      accountId: row.accountId as AccountId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      ownerId: row.ownerId as InpatientStaySummary['ownerId'],
      admittedByUserId: row.admittedByUserId as UserId,
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
    const accountId = requireAccountId();
    if (progress.accountId !== accountId) {
      throw new Error('Inpatient progress account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database.insert(inpatientProgress).values({
        id: progress.id,
        accountId: progress.accountId,
        stayId: progress.stayId,
        encounterId: progress.encounterId,
        note: progress.note,
        authoredByUserId: progress.authoredByUserId,
        createdAt: new Date(progress.createdAt)
      });
    });
  }

  public async findByStayId(stayId: InpatientStayId): Promise<readonly InpatientProgressSummary[]> {
    const accountId = requireAccountId();
    return withTenantTransaction(accountId, async (database) => {
      const result = await database
        .select()
        .from(inpatientProgress)
        .where(
          and(eq(inpatientProgress.stayId, stayId), eq(inpatientProgress.accountId, accountId))
        )
        .orderBy(desc(inpatientProgress.createdAt));

      return result.map((row) => ({
        id: row.id as InpatientProgressId,
        accountId: row.accountId as AccountId,
        stayId: row.stayId as InpatientStayId,
        encounterId: row.encounterId as EncounterId,
        note: row.note,
        authoredByUserId: row.authoredByUserId as UserId,
        createdAt: row.createdAt.toISOString()
      }));
    });
  }
}

export class DatabaseInpatientOccurrenceRepository implements InpatientOccurrenceRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(occurrence: InpatientOccurrenceSummary): Promise<void> {
    const accountId = requireAccountId();
    if (occurrence.accountId !== accountId) {
      throw new Error('Inpatient occurrence account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database.insert(inpatientOccurrences).values({
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
    });
  }

  public async findByStayId(
    stayId: InpatientStayId
  ): Promise<readonly InpatientOccurrenceSummary[]> {
    const accountId = requireAccountId();
    return withTenantTransaction(accountId, async (database) => {
      const result = await database
        .select()
        .from(inpatientOccurrences)
        .where(
          and(
            eq(inpatientOccurrences.stayId, stayId),
            eq(inpatientOccurrences.accountId, accountId)
          )
        );

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
    });
  }
}

export class DatabaseInpatientDailyChargeRepository implements InpatientDailyChargeRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(charge: InpatientDailyChargeSummary): Promise<void> {
    const accountId = requireAccountId();
    if (charge.accountId !== accountId) {
      throw new Error('Inpatient daily charge account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database.insert(inpatientDailyCharges).values({
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
    });
  }

  public async update(charge: InpatientDailyChargeSummary): Promise<void> {
    const accountId = requireAccountId();
    if (charge.accountId !== accountId) {
      throw new Error('Inpatient daily charge account does not match tenant context');
    }
    await withTenantTransaction(accountId, async (database) => {
      await database
        .update(inpatientDailyCharges)
        .set({
          status: charge.status,
          billingRecordId: charge.billingRecordId ?? null,
          updatedAt: new Date(charge.updatedAt)
        })
        .where(
          and(
            eq(inpatientDailyCharges.id, charge.id),
            eq(inpatientDailyCharges.accountId, accountId)
          )
        );
    });
  }

  public async findByStayId(
    stayId: InpatientStayId
  ): Promise<readonly InpatientDailyChargeSummary[]> {
    const accountId = requireAccountId();
    return withTenantTransaction(accountId, async (database) => {
      const result = await database
        .select()
        .from(inpatientDailyCharges)
        .where(
          and(
            eq(inpatientDailyCharges.stayId, stayId),
            eq(inpatientDailyCharges.accountId, accountId)
          )
        );

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
    });
  }
}
