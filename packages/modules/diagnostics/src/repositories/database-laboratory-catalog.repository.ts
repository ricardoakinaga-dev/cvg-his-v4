import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  laboratoryEquipment,
  laboratoryReferenceValues,
  laboratoryReportTypes
} from '@cvg-his-v2/shared-database';
import { nowIso } from '@cvg-his-v2/shared-utils';
import type {
  CreateLaboratoryEquipmentRequest,
  UpdateLaboratoryEquipmentRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  AccountId,
  LaboratoryEquipmentSummary,
  LaboratoryReferenceValueSummary,
  LaboratoryReportTypeSummary
} from '@cvg-his-v2/shared-types';
import type { LaboratoryCatalogRepository } from '../laboratory.js';
import {
  DEFAULT_LABORATORY_EQUIPMENT,
  DEFAULT_LABORATORY_REFERENCE_VALUES,
  DEFAULT_LABORATORY_REPORT_TYPES
} from '../catalog.js';

export class DatabaseLaboratoryCatalogRepository implements LaboratoryCatalogRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async ensureSeedData(accountId: AccountId): Promise<void> {
    const reportTypeRow = await this.#db
      .select({ id: laboratoryReportTypes.id })
      .from(laboratoryReportTypes)
      .where(eq(laboratoryReportTypes.accountId, accountId))
      .limit(1);

    if (reportTypeRow.length > 0) {
      return;
    }

    const now = new Date(nowIso());

    await this.#db.insert(laboratoryEquipment).values(
      DEFAULT_LABORATORY_EQUIPMENT.map((item) => ({
        id: item.id,
        accountId,
        name: item.name,
        type: item.type,
        serialNumber: item.serialNumber,
        status: item.status,
        lastCalibrationAt: new Date(item.lastCalibrationAt),
        createdAt: now,
        updatedAt: now
      }))
    );

    await this.#db.insert(laboratoryReportTypes).values(
      DEFAULT_LABORATORY_REPORT_TYPES.map((item) => ({
        id: item.id,
        accountId,
        name: item.name,
        code: item.code,
        category: item.category,
        description: item.description,
        active: item.active,
        createdAt: now,
        updatedAt: now
      }))
    );

    await this.#db.insert(laboratoryReferenceValues).values(
      DEFAULT_LABORATORY_REFERENCE_VALUES.map((item) => ({
        id: item.id,
        accountId,
        parameter: item.parameter,
        examType: item.examType,
        minValue: item.minValue.toString(),
        maxValue: item.maxValue.toString(),
        unit: item.unit,
        createdAt: now,
        updatedAt: now
      }))
    );
  }

  public async listEquipment(accountId: AccountId): Promise<readonly LaboratoryEquipmentSummary[]> {
    const result = await this.#db
      .select()
      .from(laboratoryEquipment)
      .where(eq(laboratoryEquipment.accountId, accountId));

    return result.map((row) => this.#toEquipmentSummary(row)).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }

  public async getEquipment(
    accountId: AccountId,
    equipmentId: string
  ): Promise<LaboratoryEquipmentSummary | undefined> {
    const result = await this.#db
      .select()
      .from(laboratoryEquipment)
      .where(and(eq(laboratoryEquipment.accountId, accountId), eq(laboratoryEquipment.id, equipmentId)))
      .limit(1);

    return result[0] ? this.#toEquipmentSummary(result[0]) : undefined;
  }

  public async createEquipment(
    accountId: AccountId,
    payload: CreateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary> {
    const now = new Date(nowIso());
    const id = `lab-eq-${randomUUID()}`;

    await this.#db.insert(laboratoryEquipment).values({
      id,
      accountId,
      name: payload.name,
      type: payload.type,
      serialNumber: payload.serialNumber,
      status: payload.status ?? 'active',
      lastCalibrationAt: new Date(payload.lastCalibrationAt),
      createdAt: now,
      updatedAt: now
    });

    const equipment = await this.getEquipment(accountId, id);
    if (!equipment) {
      throw new Error('Laboratory equipment was not persisted');
    }
    return equipment;
  }

  public async updateEquipment(
    accountId: AccountId,
    equipmentId: string,
    payload: UpdateLaboratoryEquipmentRequest
  ): Promise<LaboratoryEquipmentSummary> {
    const existing = await this.getEquipment(accountId, equipmentId);
    if (!existing) {
      throw new Error('Laboratory equipment not found');
    }

    await this.#db
      .update(laboratoryEquipment)
      .set({
        name: payload.name ?? existing.name,
        type: payload.type ?? existing.type,
        serialNumber: payload.serialNumber ?? existing.serialNumber,
        status: payload.status ?? existing.status,
        lastCalibrationAt: payload.lastCalibrationAt
          ? new Date(payload.lastCalibrationAt)
          : new Date(existing.lastCalibrationAt),
        updatedAt: new Date(nowIso())
      })
      .where(and(eq(laboratoryEquipment.accountId, accountId), eq(laboratoryEquipment.id, equipmentId)));

    const updated = await this.getEquipment(accountId, equipmentId);
    if (!updated) {
      throw new Error('Laboratory equipment not found');
    }
    return updated;
  }

  public async listReportTypes(
    accountId: AccountId
  ): Promise<readonly LaboratoryReportTypeSummary[]> {
    const result = await this.#db
      .select()
      .from(laboratoryReportTypes)
      .where(eq(laboratoryReportTypes.accountId, accountId));

    return result
      .map((row) => ({
        id: row.id,
        name: row.name,
        code: row.code,
        category: row.category,
        description: row.description,
        active: row.active
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  public async listReferenceValues(
    accountId: AccountId,
    filterExam?: string
  ): Promise<readonly LaboratoryReferenceValueSummary[]> {
    const result = await this.#db
      .select()
      .from(laboratoryReferenceValues)
      .where(
        filterExam
          ? and(
              eq(laboratoryReferenceValues.accountId, accountId),
              eq(laboratoryReferenceValues.examType, filterExam)
            )
          : eq(laboratoryReferenceValues.accountId, accountId)
      );

    return result
      .map((row) => ({
        id: row.id,
        parameter: row.parameter,
        examType: row.examType,
        minValue: Number(row.minValue),
        maxValue: Number(row.maxValue),
        unit: row.unit
      }))
      .sort((left, right) => left.parameter.localeCompare(right.parameter));
  }

  #toEquipmentSummary(row: typeof laboratoryEquipment.$inferSelect): LaboratoryEquipmentSummary {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      serialNumber: row.serialNumber,
      status: row.status as LaboratoryEquipmentSummary['status'],
      lastCalibrationAt: row.lastCalibrationAt.toISOString()
    };
  }
}
