import { beforeEach, expect, test, vi } from 'vitest';

const mockState = vi.hoisted(() => {
  const rows = new Map<unknown, Array<Record<string, unknown>>>();
  const selectQueue: Array<readonly Record<string, unknown>[]> = [];

  const database = {
    select: vi.fn(() => {
      let table: unknown;
      const builder = {
        from(nextTable: unknown) {
          table = nextTable;
          return builder;
        },
        where() {
          return builder;
        },
        limit() {
          return builder;
        },
        then(
          resolve: (value: readonly Record<string, unknown>[]) => unknown,
          reject: (reason: unknown) => unknown
        ) {
          const result = selectQueue.shift() ?? rows.get(table) ?? [];
          return Promise.resolve(result).then(resolve, reject);
        }
      };
      return builder;
    }),
    insert: vi.fn((table: unknown) => {
      const builder = {
        onConflictDoNothing: vi.fn(async () => undefined)
      };
      return {
        values: vi.fn((payload: Record<string, unknown> | readonly Record<string, unknown>[]) => {
          const tableRows = rows.get(table) ?? [];
          for (const row of Array.isArray(payload) ? payload : [payload]) {
            if (!tableRows.some((existing) => existing.id === row.id)) tableRows.push({ ...row });
          }
          rows.set(table, tableRows);
          return builder;
        })
      };
    }),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((patch: Record<string, unknown>) => ({
        where: vi.fn(async () => {
          const tableRows = rows.get(table) ?? [];
          for (const row of tableRows) Object.assign(row, patch);
        })
      }))
    }))
  };

  return { rows, selectQueue, database };
});

vi.mock('@cvg-his-v2/shared-database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@cvg-his-v2/shared-database')>();
  return actual;
});

import {
  laboratoryEquipment,
  laboratoryReferenceValues,
  laboratoryReportTypes
} from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { DatabaseLaboratoryCatalogRepository } from './repositories/database-laboratory-catalog.repository.js';

const accountId = 'account-1';
const timestamp = new Date('2026-09-16T12:00:00.000Z');

const equipmentRow = {
  id: 'equipment-1',
  accountId,
  name: 'Analisador',
  type: 'Hematologia',
  serialNumber: 'LAB-001',
  status: 'active',
  lastCalibrationAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
};

const reportTypeRow = {
  id: 'report-1',
  accountId,
  name: 'Hemograma',
  code: 'HEM',
  category: 'Laboratorial',
  description: 'Exame hematológico',
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
};

const referenceValueRow = {
  id: 'reference-1',
  accountId,
  parameter: 'Hemoglobina',
  examType: 'HEM',
  minValue: '8.000',
  maxValue: '18.000',
  unit: 'g/dL',
  createdAt: timestamp,
  updatedAt: timestamp
};

beforeEach(() => {
  mockState.rows.clear();
  mockState.selectQueue.length = 0;
  mockState.rows.set(laboratoryEquipment, [{ ...equipmentRow }]);
  mockState.rows.set(laboratoryReportTypes, [{ ...reportTypeRow }]);
  mockState.rows.set(laboratoryReferenceValues, [{ ...referenceValueRow }]);
  vi.clearAllMocks();
});

test('DatabaseLaboratoryCatalogRepository seeds and isolates equipment, report types and references', async () => {
  const repository = new DatabaseLaboratoryCatalogRepository(mockState.database as never);

  await repository.ensureSeedData(accountId as never);
  const equipment = await repository.listEquipment(accountId as never);
  expect(equipment.length).toBeGreaterThan(1);
  expect(equipment[0]).toMatchObject({ id: expect.any(String), lastCalibrationAt: expect.any(String) });
  expect(await repository.getEquipment(accountId as never, equipment[0].id)).toBeDefined();
  mockState.selectQueue.push([]);
  expect(await repository.getEquipment('other-account' as never, equipment[0].id)).toBeUndefined();

  const reportTypes = await repository.listReportTypes(accountId as never);
  expect(reportTypes.length).toBeGreaterThan(1);
  expect(reportTypes[0]).toMatchObject({ active: true });
  expect(await repository.getReportType(accountId as never, 'report-1')).toMatchObject({ code: 'HEM' });

  expect((await repository.listReferenceValues(accountId as never)).length).toBeGreaterThan(5);
  expect(await repository.listReferenceValues(accountId as never, 'HEM')).toEqual(
    expect.arrayContaining([expect.objectContaining({ examType: 'HEM', minValue: 8 })])
  );
  expect(await repository.getReferenceValue(accountId as never, 'reference-1')).toMatchObject({ maxValue: 18 });
});

test('DatabaseLaboratoryCatalogRepository covers CRUD defaults and partial updates', async () => {
  mockState.rows.clear();
  mockState.rows.set(laboratoryEquipment, []);
  mockState.rows.set(laboratoryReportTypes, []);
  mockState.rows.set(laboratoryReferenceValues, []);
  const repository = new DatabaseLaboratoryCatalogRepository(mockState.database as never);

  const equipment = await repository.createEquipment(accountId as never, {
    name: 'Microscópio',
    type: 'Microscopia',
    serialNumber: 'MIC-001',
    lastCalibrationAt: timestamp.toISOString()
  } as never);
  expect(equipment.id).toMatch(/^lab-eq-/);
  const updatedEquipment = await repository.updateEquipment(accountId as never, equipment.id, {
    name: 'Microscópio revisado',
    status: 'maintenance'
  } as never);
  expect(updatedEquipment).toMatchObject({ name: 'Microscópio revisado', status: 'maintenance' });

  const reportType = await repository.createReportType(accountId as never, {
    name: 'Bioquímico',
    code: 'BIO',
    category: 'Laboratorial',
    description: 'Perfil bioquímico'
  } as never);
  expect(reportType.id).toMatch(/^lab-report-type-/);
  expect(await repository.updateReportType(accountId as never, reportType.id, {
    active: false,
    description: 'Inativo'
  } as never)).toMatchObject({ active: false, description: 'Inativo' });

  const reference = await repository.createReferenceValue(accountId as never, {
    parameter: 'ALT',
    examType: 'BIO',
    minValue: 10,
    maxValue: 125,
    unit: 'U/L'
  } as never);
  expect(reference).toMatchObject({ minValue: 10, maxValue: 125 });
  expect(await repository.updateReferenceValue(accountId as never, reference.id, {
    parameter: 'ALT sérica',
    minValue: 12
  } as never)).toMatchObject({ parameter: 'ALT sérica', minValue: 12, maxValue: 125 });
  await expect(repository.updateReferenceValue(accountId as never, reference.id, {
    minValue: 200,
    maxValue: 100
  } as never)).rejects.toBeInstanceOf(ValidationError);
});

test('DatabaseLaboratoryCatalogRepository fails closed for absent rows and failed persistence', async () => {
  const repository = new DatabaseLaboratoryCatalogRepository(mockState.database as never);

  mockState.selectQueue.push([], [], [], [], [], [], [], [], [], []);
  await expect(repository.updateEquipment(accountId as never, 'missing', {} as never)).rejects.toBeInstanceOf(NotFoundError);
  await expect(repository.updateReportType(accountId as never, 'missing', {} as never)).rejects.toBeInstanceOf(NotFoundError);
  await expect(repository.updateReferenceValue(accountId as never, 'missing', {} as never)).rejects.toBeInstanceOf(NotFoundError);
  expect(await repository.getEquipment(accountId as never, 'missing')).toBeUndefined();
  expect(await repository.getReportType(accountId as never, 'missing')).toBeUndefined();
  expect(await repository.getReferenceValue(accountId as never, 'missing')).toBeUndefined();

  mockState.selectQueue.push([]);
  await expect(repository.createEquipment(accountId as never, {
    name: 'Não persistido',
    type: 'Teste',
    serialNumber: 'NONE',
    lastCalibrationAt: timestamp.toISOString()
  } as never)).rejects.toThrow(/not persisted/);
  mockState.selectQueue.push([]);
  await expect(repository.createReportType(accountId as never, {
    name: 'Não persistido',
    code: 'NONE',
    category: 'Teste',
    description: 'Não persistido'
  } as never)).rejects.toThrow(/not persisted/);
  mockState.selectQueue.push([]);
  await expect(repository.createReferenceValue(accountId as never, {
    parameter: 'Não persistido',
    examType: 'NONE',
    minValue: 0,
    maxValue: 1,
    unit: 'n/a'
  } as never)).rejects.toThrow(/not persisted/);
});
