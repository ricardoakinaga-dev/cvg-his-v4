import { strict as assert } from 'node:assert';
import { queryOne, queryMany } from '../helpers/db-helpers.js';

export async function assertAuditEventGenerated(
  moduleId: string,
  action: string,
  entityId: string
): Promise<void> {
  const event = await queryOne(
    `SELECT * FROM audit_events WHERE module = $1 AND action = $2 AND entity_id = $3 ORDER BY created_at DESC LIMIT 1`,
    [moduleId, action, entityId]
  );
  assert.ok(
    event,
    `Expected audit event for module=${moduleId}, action=${action}, entityId=${entityId}`
  );
}

export async function assertPatientSelectable(patientId: string): Promise<void> {
  const patient = await queryOne(`SELECT id, name FROM patients WHERE id = $1 LIMIT 1`, [
    patientId
  ]);
  assert.ok(patient, `Patient ${patientId} should be selectable`);
}

export async function assertEncounterCreated(encounterId: string): Promise<void> {
  const encounter = await queryOne(`SELECT id, status FROM encounters WHERE id = $1 LIMIT 1`, [
    encounterId
  ]);
  assert.ok(encounter, `Encounter ${encounterId} should exist`);
}

export async function assertStockReduced(
  stockItemId: string,
  expectedReduction: number
): Promise<void> {
  const item = await queryOne<{ quantity: number }>(
    `SELECT quantity FROM stock_items WHERE id = $1 LIMIT 1`,
    [stockItemId]
  );
  assert.ok(item, `Stock item ${stockItemId} should exist`);
  assert.ok(
    item.quantity <= item.quantity + expectedReduction,
    `Stock should have been reduced by ${expectedReduction}`
  );
}

export async function assertTableHasRows(table: string, minRows: number = 1): Promise<void> {
  const result = await queryOne<{ count: number }>(`SELECT COUNT(*)::int FROM ${table}`);
  assert.ok(result, `Table ${table} should exist`);
  assert.ok(
    result.count >= minRows,
    `Table ${table} should have >= ${minRows} rows, found ${result.count}`
  );
}

export async function assertFkConstraint(
  table: string,
  column: string,
  invalidValue: string
): Promise<void> {
  try {
    await queryOne(`INSERT INTO ${table} (${column}) VALUES ($1)`, [invalidValue]);
    assert.fail(
      `Expected FK constraint violation for ${table}.${column} with value ${invalidValue}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert.ok(
      message.includes('foreign key') || message.includes('violates'),
      `Expected FK violation, got: ${message}`
    );
  }
}
