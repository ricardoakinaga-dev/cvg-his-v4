import { beforeEach, expect, test, vi } from 'vitest';

import { getDatabaseClient } from '@cvg-his-v2/shared-database';

import {
  featureGroups,
  featureValues,
  featureVectors,
  features
} from './schemas/index.js';
import { DatabaseFeatureRepository } from './repositories/database-feature.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getDatabaseClient: vi.fn()
}));

type Table = typeof features | typeof featureGroups | typeof featureVectors | typeof featureValues;

const now = new Date('2026-09-16T12:00:00.000Z');

const featureRow = {
  id: 'feature-1',
  name: 'weight',
  groupId: 'group-1',
  dataType: 'number',
  description: null,
  createdAt: now,
  updatedAt: now
};

const groupRow = {
  id: 'group-1',
  name: 'vitals',
  description: null,
  entityType: 'patient',
  createdAt: now
};

const vectorRow = {
  id: 'vector-1',
  name: 'patient-vitals',
  featureIds: null,
  entityType: 'patient',
  entityId: 'patient-1',
  createdAt: now,
  updatedAt: now
};

const valueRow = {
  id: 'value-1',
  featureId: 'feature-1',
  entityId: 'patient-1',
  value: { value: 72 },
  timestamp: now
};

function rowsFor(table: Table): readonly Record<string, unknown>[] {
  if (table === features) return [featureRow];
  if (table === featureGroups) return [groupRow];
  if (table === featureVectors) return [vectorRow];
  return [valueRow];
}

function makeDatabaseDouble() {
  let selectRows: readonly Record<string, unknown>[] | undefined;
  const updates: Array<{ table: Table; values: Record<string, unknown> }> = [];
  const deletes: Table[] = [];

  const makeSelectBuilder = () => {
    let table: Table | undefined;
    const builder = {
      from(nextTable: Table) {
        table = nextTable;
        return builder;
      },
      where() {
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit() {
        return builder;
      },
      offset() {
        return builder;
      },
      then(resolve: (value: readonly Record<string, unknown>[]) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(selectRows ?? rowsFor(table as Table)).then(resolve, reject);
      }
    };
    return builder;
  };

  const db = {
    insert(table: Table) {
      return {
        values(values: Record<string, unknown>) {
          return {
            async returning() {
              return [{ ...rowsFor(table)[0], ...values }];
            }
          };
        }
      };
    },
    select: vi.fn(() => makeSelectBuilder()),
    update(table: Table) {
      return {
        set(values: Record<string, unknown>) {
          updates.push({ table, values });
          return {
            where() {
              return {
                async returning() {
                  return [{ ...rowsFor(table)[0], ...values }];
                }
              };
            }
          };
        }
      };
    },
    delete(table: Table) {
      return {
        async where() {
          deletes.push(table);
        }
      };
    },
    setSelectRows(rows: readonly Record<string, unknown>[] | undefined) {
      selectRows = rows;
    },
    updates,
    deletes
  };

  return db;
}

test('DatabaseFeatureRepository covers feature, group, vector and value persistence contracts', async () => {
  const db = makeDatabaseDouble();
  vi.mocked(getDatabaseClient).mockReturnValue(db as never);
  const repository = new DatabaseFeatureRepository();

  const createdFeature = await repository.createFeature({
    name: 'height',
    group: 'group-1',
    dataType: 'number'
  });
  expect(createdFeature).toMatchObject({ name: 'height', group: 'group-1', description: undefined });
  expect(await repository.findFeatureById('feature-1')).toMatchObject({ id: 'feature-1' });
  expect(await repository.findFeaturesByGroup('group-1')).toHaveLength(1);
  expect(await repository.listFeatures(10, 2)).toHaveLength(1);
  expect(await repository.updateFeature('feature-1', { name: 'updated' })).toMatchObject({
    name: 'updated'
  });
  await repository.deleteFeature('feature-1');

  const createdGroup = await repository.createGroup({ name: 'care', entityType: 'patient' });
  expect(createdGroup).toMatchObject({ name: 'care', description: undefined });
  expect(await repository.findGroupById('group-1')).toMatchObject({ id: 'group-1' });
  expect(await repository.findGroupsByEntityType('patient')).toHaveLength(1);
  expect(await repository.listGroups()).toHaveLength(1);
  await repository.deleteGroup('group-1');

  const createdVector = await repository.createVector({
    name: 'vitals',
    features: ['feature-1'],
    entityType: 'patient',
    entityId: 'patient-1'
  });
  expect(createdVector).toMatchObject({ features: ['feature-1'], entityId: 'patient-1' });
  expect(await repository.findVectorById('vector-1')).toMatchObject({ features: [] });
  expect(await repository.findVectorsByEntity('patient', 'patient-1')).toHaveLength(1);
  expect(await repository.listVectors(10, 1)).toHaveLength(1);
  expect(await repository.updateVector('vector-1', { features: ['feature-2'] })).toMatchObject({
    features: ['feature-2']
  });
  await repository.deleteVector('vector-1');

  const createdValue = await repository.upsertValue({
    featureId: 'feature-1',
    entityId: 'patient-1',
    value: 72,
    timestamp: now.toISOString()
  });
  expect(createdValue.timestamp).toBe(now.toISOString());
  expect(await repository.findValuesByEntity('feature-1', 'patient-1')).toHaveLength(1);
  expect(await repository.findLatestValue('feature-1', 'patient-1')).toMatchObject({ id: 'value-1' });

  expect(db.updates).toHaveLength(2);
  expect(db.deletes).toHaveLength(3);
});

test('DatabaseFeatureRepository returns null for empty point lookups and preserves nullable rows', async () => {
  const db = makeDatabaseDouble();
  vi.mocked(getDatabaseClient).mockReturnValue(db as never);
  const repository = new DatabaseFeatureRepository();

  db.setSelectRows([]);
  expect(await repository.findFeatureById('missing')).toBeNull();
  expect(await repository.findGroupById('missing')).toBeNull();
  expect(await repository.findVectorById('missing')).toBeNull();
  expect(await repository.findLatestValue('missing', 'missing')).toBeNull();
});
