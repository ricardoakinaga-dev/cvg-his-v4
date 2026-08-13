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
  CreateLaboratoryReferenceValueRequest,
  CreateLaboratoryReportTypeRequest,
  UpdateLaboratoryEquipmentRequest,
  UpdateLaboratoryReferenceValueRequest,
  UpdateLaboratoryReportTypeRequest
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
    const now = new Date(nowIso());
    const scopedId = (id: string): string => `${accountId}:${id}`;

    await this.#db
      .insert(laboratoryEquipment)
      .values(
        DEFAULT_LABORATORY_EQUIPMENT.map((item) => ({
          id: scopedId(item.id),
          accountId,
          name: item.name,
          type: item.type,
          serialNumber: item.serialNumber,
          status: item.status,
          lastCalibrationAt: new Date(item.lastCalibrationAt),
          createdAt: now,
          updatedAt: now
        }))
      )
      .onConflictDoNothing();

    await this.#db
      .insert(laboratoryReportTypes)
      .values(
        DEFAULT_LABORATORY_REPORT_TYPES.map((item) => ({
          id: scopedId(item.id),
          accountId,
          name: item.name,
          code: item.code,
          category: item.category,
          description: item.description,
          active: item.active,
          createdAt: now,
          updatedAt: now
        }))
      )
      .onConflictDoNothing();

    await this.#db
      .insert(laboratoryReferenceValues)
      .values(
        DEFAULT_LABORATORY_REFERENCE_VALUES.map((item) => ({
          id: scopedId(item.id),
          accountId,
          parameter: item.parameter,
          examType: item.examType,
          minValue: item.minValue.toString(),
          maxValue: item.maxValue.toString(),
          unit: item.unit,
          createdAt: now,
          updatedAt: now
        }))
      )
      .onConflictDoNothing();
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

  public async getReportType(
    accountId: AccountId,
    reportTypeId: string
  ): Promise<LaboratoryReportTypeSummary | undefined> {
    const result = await this.#db
      .select()
      .from(laboratoryReportTypes)
      .where(and(eq(laboratoryReportTypes.accountId, accountId), eq(laboratoryReportTypes.id, reportTypeId)))
      .limit(1);

    return result[0] ? this.#toReportTypeSummary(result[0]) : undefined;
  }

  public async createReportType(
    accountId: AccountId,
    payload: CreateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary> {
    const now = new Date(nowIso());
    const id = `lab-report-type-${randomUUID()}`;

    await this.#db.insert(laboratoryReportTypes).values({
      id,
      accountId,
      name: payload.name,
      code: payload.code,
      category: payload.category,
      description: payload.description,
      active: payload.active ?? true,
      createdAt: now,
      updatedAt: now
    });

    const reportType = await this.getReportType(accountId, id);
    if (!reportType) {
      throw new Error('Laboratory report type was not persisted');
    }
    return reportType;
  }

  public async updateReportType(
    accountId: AccountId,
    reportTypeId: string,
    payload: UpdateLaboratoryReportTypeRequest
  ): Promise<LaboratoryReportTypeSummary> {
    const existing = await this.getReportType(accountId, reportTypeId);
    if (!existing) {
      throw new Error('Laboratory report type not found');
    }

    await this.#db
      .update(laboratoryReportTypes)
      .set({
        name: payload.name ?? existing.name,
        code: payload.code ?? existing.code,
        category: payload.category ?? existing.category,
        description: payload.description ?? existing.description,
        active: payload.active ?? existing.active,
        updatedAt: new Date(nowIso())
      })
      .where(and(eq(laboratoryReportTypes.accountId, accountId), eq(laboratoryReportTypes.id, reportTypeId)));

    const updated = await this.getReportType(accountId, reportTypeId);
    if (!updated) {
      throw new Error('Laboratory report type not found');
    }
    return updated;
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

  public async getReferenceValue(
    accountId: AccountId,
    referenceValueId: string
  ): Promise<LaboratoryReferenceValueSummary | undefined> {
    const result = await this.#db
      .select()
      .from(laboratoryReferenceValues)
      .where(and(eq(laboratoryReferenceValues.accountId, accountId), eq(laboratoryReferenceValues.id, referenceValueId)))
      .limit(1);

    return result[0] ? this.#toReferenceValueSummary(result[0]) : undefined;
  }

  public async createReferenceValue(
    accountId: AccountId,
    payload: CreateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary> {
    const now = new Date(nowIso());
    const id = `lab-ref-${randomUUID()}`;

    await this.#db.insert(laboratoryReferenceValues).values({
      id,
      accountId,
      parameter: payload.parameter,
      examType: payload.examType,
      minValue: payload.minValue.toString(),
      maxValue: payload.maxValue.toString(),
      unit: payload.unit,
      createdAt: now,
      updatedAt: now
    });

    const referenceValue = await this.getReferenceValue(accountId, id);
    if (!referenceValue) {
      throw new Error('Laboratory reference value was not persisted');
    }
    return referenceValue;
  }

  public async updateReferenceValue(
    accountId: AccountId,
    referenceValueId: string,
    payload: UpdateLaboratoryReferenceValueRequest
  ): Promise<LaboratoryReferenceValueSummary> {
    const existing = await this.getReferenceValue(accountId, referenceValueId);
    if (!existing) {
      throw new Error('Laboratory reference value not found');
    }
    const minValue = payload.minValue ?? existing.minValue;
    const maxValue = payload.maxValue ?? existing.maxValue;
    if (minValue > maxValue) {
      throw new Error('Laboratory reference value minimum cannot be greater than maximum');
    }

    await this.#db
      .update(laboratoryReferenceValues)
      .set({
        parameter: payload.parameter ?? existing.parameter,
        examType: payload.examType ?? existing.examType,
        minValue: minValue.toString(),
        maxValue: maxValue.toString(),
        unit: payload.unit ?? existing.unit,
        updatedAt: new Date(nowIso())
      })
      .where(and(eq(laboratoryReferenceValues.accountId, accountId), eq(laboratoryReferenceValues.id, referenceValueId)));

    const updated = await this.getReferenceValue(accountId, referenceValueId);
    if (!updated) {
      throw new Error('Laboratory reference value not found');
    }
    return updated;
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

  #toReportTypeSummary(row: typeof laboratoryReportTypes.$inferSelect): LaboratoryReportTypeSummary {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      category: row.category,
      description: row.description,
      active: row.active
    };
  }

  #toReferenceValueSummary(row: typeof laboratoryReferenceValues.$inferSelect): LaboratoryReferenceValueSummary {
    return {
      id: row.id,
      parameter: row.parameter,
      examType: row.examType,
      minValue: Number(row.minValue),
      maxValue: Number(row.maxValue),
      unit: row.unit
    };
  }
}
