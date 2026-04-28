import { randomUUID } from 'node:crypto';

import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { sectors, beds } from '@cvg-his-v2/shared-database';
import { eq, and, sql } from 'drizzle-orm';
import type {
  AccountId,
  SectorId,
  BedId,
  SectorSummary,
  BedSummary,
  InpatientStayId
} from '@cvg-his-v2/shared-types';
import type {
  CreateSectorRequest,
  CreateBedRequest,
  UpdateBedRequest,
  BedMapSector,
  BedMapBed
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export interface SectorRepository {
  create(sector: SectorSummary): Promise<void>;
  findById(id: SectorId): Promise<SectorSummary | null>;
  findByAccountId(accountId: AccountId): Promise<readonly SectorSummary[]>;
}

export interface BedRepository {
  create(bed: BedSummary): Promise<void>;
  update(bed: BedSummary): Promise<void>;
  findById(id: BedId): Promise<BedSummary | null>;
  findBySectorId(sectorId: SectorId): Promise<readonly BedSummary[]>;
  findByAccountId(accountId: AccountId): Promise<readonly BedSummary[]>;
  findByStatus(sectorId: SectorId, status: BedSummary['status']): Promise<readonly BedSummary[]>;
}

export class DatabaseSectorRepository implements SectorRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(sector: SectorSummary): Promise<void> {
    await this.#db.insert(sectors).values({
      id: sector.id,
      accountId: sector.accountId,
      code: sector.code,
      name: sector.name,
      kind: sector.kind,
      active: sector.active,
      createdAt: new Date(sector.createdAt),
      updatedAt: new Date(sector.updatedAt)
    });
  }

  public async findById(id: SectorId): Promise<SectorSummary | null> {
    const result = await this.#db.select().from(sectors).where(eq(sectors.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRow(result[0]);
  }

  public async findByAccountId(accountId: AccountId): Promise<readonly SectorSummary[]> {
    const result = await this.#db.select().from(sectors).where(eq(sectors.accountId, accountId));

    return result.map((row) => this.mapRow(row));
  }

  private mapRow(row: typeof sectors.$inferSelect): SectorSummary {
    return {
      id: row.id as SectorId,
      accountId: row.accountId as AccountId,
      code: row.code,
      name: row.name,
      kind: row.kind as SectorSummary['kind'],
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}

export class DatabaseBedRepository implements BedRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(bed: BedSummary): Promise<void> {
    await this.#db.insert(beds).values({
      id: bed.id,
      accountId: bed.accountId,
      sectorId: bed.sectorId,
      code: bed.code,
      name: bed.name,
      status: bed.status,
      supportsSpecies: bed.supportsSpecies ?? null,
      active: bed.active,
      createdAt: new Date(bed.createdAt),
      updatedAt: new Date(bed.updatedAt)
    });
  }

  public async update(bed: BedSummary): Promise<void> {
    await this.#db
      .update(beds)
      .set({
        sectorId: bed.sectorId,
        code: bed.code,
        name: bed.name,
        status: bed.status,
        supportsSpecies: bed.supportsSpecies ?? null,
        active: bed.active,
        updatedAt: new Date(bed.updatedAt)
      })
      .where(eq(beds.id, bed.id));
  }

  public async findById(id: BedId): Promise<BedSummary | null> {
    const result = await this.#db.select().from(beds).where(eq(beds.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRow(result[0]);
  }

  public async findBySectorId(sectorId: SectorId): Promise<readonly BedSummary[]> {
    const result = await this.#db.select().from(beds).where(eq(beds.sectorId, sectorId));

    return result.map((row) => this.mapRow(row));
  }

  public async findByAccountId(accountId: AccountId): Promise<readonly BedSummary[]> {
    const result = await this.#db.select().from(beds).where(eq(beds.accountId, accountId));

    return result.map((row) => this.mapRow(row));
  }

  public async findByStatus(
    sectorId: SectorId,
    status: BedSummary['status']
  ): Promise<readonly BedSummary[]> {
    const result = await this.#db
      .select()
      .from(beds)
      .where(and(eq(beds.sectorId, sectorId), eq(beds.status, status)));

    return result.map((row) => this.mapRow(row));
  }

  private mapRow(row: typeof beds.$inferSelect): BedSummary {
    return {
      id: row.id as BedId,
      accountId: row.accountId as AccountId,
      sectorId: row.sectorId as SectorId,
      code: row.code,
      name: row.name,
      status: row.status as BedSummary['status'],
      supportsSpecies: row.supportsSpecies ?? undefined,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}

export interface SectorBedServiceOptions {
  readonly sectorRepository?: SectorRepository;
  readonly bedRepository?: BedRepository;
  readonly databaseClient?: DatabaseClient;
}

export class SectorBedService {
  readonly #sectorRepo: SectorRepository;
  readonly #bedRepo: BedRepository;
  readonly #db?: DatabaseClient;

  public constructor(options: SectorBedServiceOptions = {}) {
    if (options.databaseClient) {
      this.#sectorRepo =
        options.sectorRepository ?? new DatabaseSectorRepository(options.databaseClient);
      this.#bedRepo = options.bedRepository ?? new DatabaseBedRepository(options.databaseClient);
      this.#db = options.databaseClient;
    } else {
      this.#sectorRepo = options.sectorRepository ?? {
        create: async () => {},
        findById: async () => null,
        findByAccountId: async () => []
      };
      this.#bedRepo = options.bedRepository ?? {
        create: async () => {},
        update: async () => {},
        findById: async () => null,
        findBySectorId: async () => [],
        findByAccountId: async () => [],
        findByStatus: async () => []
      };
    }
  }

  public async createSector(
    accountId: AccountId,
    payload: CreateSectorRequest
  ): Promise<SectorSummary> {
    requireNonEmptyString(payload.code, 'code');
    requireNonEmptyString(payload.name, 'name');

    const now = nowIso();
    const sector: SectorSummary = {
      id: createCorrelationId('sec') as SectorId,
      accountId,
      code: payload.code,
      name: payload.name,
      kind: payload.kind,
      active: true,
      createdAt: now,
      updatedAt: now
    };

    await this.#sectorRepo.create(sector);
    return sector;
  }

  public async listSectors(accountId: AccountId): Promise<readonly SectorSummary[]> {
    return this.#sectorRepo.findByAccountId(accountId);
  }

  public async getSectorOrThrow(sectorId: SectorId): Promise<SectorSummary> {
    const sector = await this.#sectorRepo.findById(sectorId);
    if (!sector) {
      throw new NotFoundError('Sector not found', { sectorId });
    }
    return sector;
  }

  public async createBed(accountId: AccountId, payload: CreateBedRequest): Promise<BedSummary> {
    requireNonEmptyString(payload.sectorId, 'sectorId');
    requireNonEmptyString(payload.code, 'code');
    requireNonEmptyString(payload.name, 'name');

    await this.getSectorOrThrow(payload.sectorId as SectorId);

    const now = nowIso();
    const bed: BedSummary = {
      id: randomUUID() as BedId,
      accountId,
      sectorId: payload.sectorId as SectorId,
      code: payload.code,
      name: payload.name,
      status: 'available',
      supportsSpecies: payload.supportsSpecies,
      active: true,
      createdAt: now,
      updatedAt: now
    };

    await this.#bedRepo.create(bed);
    return bed;
  }

  public async listBeds(accountId: AccountId, sectorId?: SectorId): Promise<readonly BedSummary[]> {
    if (sectorId) {
      return this.#bedRepo.findBySectorId(sectorId);
    }
    return this.#bedRepo.findByAccountId(accountId);
  }

  public async getBedOrThrow(bedId: BedId): Promise<BedSummary> {
    const bed = await this.#bedRepo.findById(bedId);
    if (!bed) {
      throw new NotFoundError('Bed not found', { bedId });
    }
    return bed;
  }

  public async getBedForAccountOrThrow(accountId: AccountId, bedId: BedId): Promise<BedSummary> {
    const bed = await this.getBedOrThrow(bedId);
    if (bed.accountId !== accountId) {
      throw new NotFoundError('Bed not found', { bedId });
    }
    return bed;
  }

  public async updateBed(
    accountId: AccountId,
    bedId: BedId,
    payload: UpdateBedRequest
  ): Promise<BedSummary> {
    const current = await this.getBedForAccountOrThrow(accountId, bedId);
    const nextSectorId = (payload.sectorId ?? current.sectorId) as SectorId;

    if (payload.sectorId && payload.sectorId !== current.sectorId) {
      const sector = await this.getSectorOrThrow(nextSectorId);
      if (sector.accountId !== accountId) {
        throw new NotFoundError('Sector not found', { sectorId: nextSectorId });
      }
    }

    const nextStatus = payload.status ?? current.status;
    if (!['available', 'occupied', 'maintenance', 'blocked'].includes(nextStatus)) {
      throw new ValidationError('Invalid bed status', { status: nextStatus });
    }

    const updated: BedSummary = {
      ...current,
      sectorId: nextSectorId,
      code: payload.code === undefined ? current.code : requireNonEmptyString(payload.code, 'code'),
      name: payload.name === undefined ? current.name : requireNonEmptyString(payload.name, 'name'),
      status: nextStatus,
      supportsSpecies:
        payload.supportsSpecies === undefined
          ? current.supportsSpecies
          : payload.supportsSpecies?.trim() || undefined,
      active: payload.active ?? current.active,
      updatedAt: nowIso()
    };

    await this.#bedRepo.update(updated);
    return updated;
  }

  public async archiveBed(accountId: AccountId, bedId: BedId): Promise<void> {
    const current = await this.getBedForAccountOrThrow(accountId, bedId);
    if (current.status === 'occupied') {
      throw new ValidationError('Cannot archive an occupied bed', { bedId });
    }
    await this.#bedRepo.update({
      ...current,
      active: false,
      status: 'blocked',
      updatedAt: nowIso()
    });
  }

  public async getAvailableBeds(sectorId: SectorId): Promise<readonly BedSummary[]> {
    return this.#bedRepo.findByStatus(sectorId, 'available');
  }

  public async setBedOccupied(bedId: BedId): Promise<void> {
    const bed = await this.getBedOrThrow(bedId);
    const updated: BedSummary = {
      ...bed,
      status: 'occupied',
      updatedAt: nowIso()
    };
    await this.#bedRepo.update(updated);
  }

  public async setBedAvailable(bedId: BedId): Promise<void> {
    const bed = await this.getBedOrThrow(bedId);
    const updated: BedSummary = {
      ...bed,
      status: 'available',
      updatedAt: nowIso()
    };
    await this.#bedRepo.update(updated);
  }

  public async buildBedMap(accountId: AccountId): Promise<{
    items: readonly BedMapSector[];
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
  }> {
    const allSectors = await this.#sectorRepo.findByAccountId(accountId);
    const allBeds = await this.#bedRepo.findByAccountId(accountId);
    const bedsBySector = new Map<SectorId, BedSummary[]>();

    for (const bed of allBeds.filter((item) => item.active)) {
      const list = bedsBySector.get(bed.sectorId) ?? [];
      list.push(bed);
      bedsBySector.set(bed.sectorId, list);
    }

    const activeStays = this.#db ? await this.findActiveBedMapStays(accountId) : [];

    const stayByBedId = new Map<string, (typeof activeStays)[0]>();
    for (const stay of activeStays) {
      if (stay.bedId) {
        stayByBedId.set(stay.bedId, stay);
      }
    }

    const items: BedMapSector[] = [];
    let totalBeds = 0;
    let occupiedBeds = 0;

    for (const sector of allSectors) {
      const sectorBeds = bedsBySector.get(sector.id as SectorId) ?? [];
      const bedMapBeds: BedMapBed[] = sectorBeds.map((bed) => {
        const stay = stayByBedId.get(bed.id);
        if (bed.status === 'occupied') {
          occupiedBeds++;
        }
        return {
          id: bed.id,
          code: bed.code,
          name: bed.name,
          status: bed.status,
          supportsSpecies: bed.supportsSpecies,
          stayId: stay?.id,
          patientId: stay?.patientId,
          encounterId: stay?.encounterId ?? undefined,
          occupiedSince: stay?.admittedAt
        };
      });

      totalBeds += sectorBeds.length;

      items.push({
        sectorId: sector.id,
        sectorCode: sector.code,
        sectorName: sector.name,
        kind: sector.kind,
        beds: bedMapBeds,
        totalBeds: sectorBeds.length,
        occupiedBeds: bedMapBeds.filter((b) => b.status === 'occupied').length,
        availableBeds: bedMapBeds.filter((b) => b.status === 'available').length
      });
    }

    return {
      items,
      totalBeds,
      occupiedBeds,
      availableBeds: totalBeds - occupiedBeds
    };
  }

  private async findActiveBedMapStays(accountId: AccountId): Promise<
    Array<{
      id: string;
      patientId: string;
      encounterId: string | null;
      bedId: string | null;
      admittedAt: string;
    }>
  > {
    if (!this.#db) {
      return [];
    }

    const result = await this.#db.execute<{
      id: string;
      patient_id: string;
      encounter_id: string | null;
      bed_id: string | null;
      admitted_at: Date | string;
    }>(sql`
      SELECT id, patient_id, encounter_id, bed_id, admitted_at
      FROM inpatient_stays
      WHERE account_id = ${accountId}
        AND status::text IN ('admitted', 'active')
        AND bed_id IS NOT NULL
    `);

    return result.rows.map((row) => ({
      id: String(row.id),
      patientId: String(row.patient_id),
      encounterId: row.encounter_id === null ? null : String(row.encounter_id),
      bedId: row.bed_id === null ? null : String(row.bed_id),
      admittedAt:
        row.admitted_at instanceof Date ? row.admitted_at.toISOString() : String(row.admitted_at)
    }));
  }
}
