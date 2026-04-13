import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  laboratoryEquipment,
  laboratoryReferenceValues,
  laboratoryReportTypes
} from '@cvg-his-v2/shared-database';
import { nowIso } from '@cvg-his-v2/shared-utils';
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

    return result
      .map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        serialNumber: row.serialNumber,
        status: row.status as LaboratoryEquipmentSummary['status'],
        lastCalibrationAt: row.lastCalibrationAt.toISOString()
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
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
}
