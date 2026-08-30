import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AuditService } from '../../../packages/modules/audit/src/index.js';
import { DatabaseAuditRepository } from '../../../packages/modules/audit/src/repositories/database-audit.repository.js';
import {
  closeDatabaseClient,
  createDatabaseClient,
  createScopedDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, RLS_TEST_ROLE, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountA = randomUUID();
const accountB = randomUUID();
const eventIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const legacyEventId = randomUUID();
const foreignLegacyEventId = randomUUID();
const mismatchedLegacyMetadataEventId = randomUUID();
const bulkEventIds = Array.from({ length: 101 }, () => randomUUID());
const accountAEventIds = eventIds.slice(0, 4).sort((left, right) => (right < left ? -1 : 1));

describe('audit cursor pagination on PostgreSQL', () => {
  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    const pool = getTestPool();

    await pool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, $2, 'Audit cursor tenant', 'active')`,
      [tenantId, `audit-cursor-${tenantId.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Audit cursor account A'),
              ($2, $3, $5, 'Audit cursor account B')`,
      [
        accountA,
        accountB,
        tenantId,
        `audit-cursor-a-${accountA.slice(0, 8)}`,
        `audit-cursor-b-${accountB.slice(0, 8)}`
      ]
    );
    await pool.query(
      `INSERT INTO audit_events (
         id, account_id, action, entity_type, entity_id, metadata, correlation_id,
         occurred_at, created_at
       ) VALUES
         ($1, $6, 'invoice.read', 'invoice', 'invoice-1', $7, 'cursor-1', '2026-08-25T12:04:00.000Z', '2026-08-25T12:04:00.000Z'),
         ($2, $6, 'invoice.read', 'invoice', 'invoice-2', $8, 'cursor-2', '2026-08-25T12:04:00.000Z', '2026-08-25T12:04:00.000Z'),
         ($3, $6, 'invoice.read', 'invoice', 'invoice-3', $9, 'cursor-3', '2026-08-25T12:04:00.000Z', '2026-08-25T12:04:00.000Z'),
         ($4, $6, 'invoice.read', 'invoice', 'invoice-4', $10, 'cursor-4', '2026-08-25T12:03:00.000Z', '2026-08-25T12:03:00.000Z'),
         ($5, $11, 'invoice.read', 'invoice', 'foreign-invoice', $12, 'foreign', '2026-08-25T12:05:00.000Z', '2026-08-25T12:05:00.000Z')`,
      [
        ...accountAEventIds,
        eventIds[4],
        accountA,
        JSON.stringify({ module: 'billing', payloadSummary: 'Invoice page 1', riskLevel: 'low' }),
        JSON.stringify({ module: 'billing', payloadSummary: 'Invoice page 2', riskLevel: 'low' }),
        JSON.stringify({ module: 'billing', payloadSummary: 'Invoice page 3', riskLevel: 'low' }),
        JSON.stringify({ module: 'billing', payloadSummary: 'Invoice page 4', riskLevel: 'low' }),
        accountB,
        JSON.stringify({ module: 'billing', payloadSummary: 'Foreign invoice', riskLevel: 'low' })
      ]
    );
    await pool.query(
      `INSERT INTO audit_events (
         id, account_id, action, entity_type, entity_id, metadata, correlation_id,
         occurred_at, created_at
       ) VALUES
         ($1, NULL, 'personal_data_exported', 'owner', 'legacy-owner', $2, 'legacy-coverage', '2026-08-25T12:06:00.000Z', '2026-08-25T12:06:00.000Z'),
         ($3, NULL, 'personal_data_exported', 'owner', 'foreign-legacy-owner', $4, 'foreign-legacy-coverage', '2026-08-25T12:07:00.000Z', '2026-08-25T12:07:00.000Z')`,
      [
        legacyEventId,
        JSON.stringify({
          module: 'lgpd',
          legacyAccountId: accountA,
          payloadSummary: 'Legacy committed coverage evidence',
          riskLevel: 'high'
        }),
        foreignLegacyEventId,
        JSON.stringify({
          module: 'lgpd',
          legacyAccountId: accountB,
          payloadSummary: 'Foreign legacy coverage evidence',
          riskLevel: 'high'
        })
      ]
    );
    await pool.query(
      `INSERT INTO audit_events (
         id, account_id, action, entity_type, entity_id, metadata, correlation_id,
         occurred_at, created_at
       ) VALUES ($1, $2, 'mis_tagged_legacy_marker', 'audit-event', 'mis-tagged', $3, 'mis-tagged',
         '2026-08-25T12:08:00.000Z', '2026-08-25T12:08:00.000Z')`,
      [
        mismatchedLegacyMetadataEventId,
        accountB,
        JSON.stringify({
          module: 'audit',
          legacyAccountId: accountA,
          payloadSummary: 'Ordinary row with unrelated legacy metadata',
          riskLevel: 'low'
        })
      ]
    );
    for (const [index, eventId] of bulkEventIds.entries()) {
      const occurredAt = new Date(Date.UTC(2026, 7, 24, 12, 0, index)).toISOString();
      await pool.query(
        `INSERT INTO audit_events (
           id, account_id, action, entity_type, entity_id, metadata, correlation_id,
           occurred_at, created_at
         ) VALUES ($1, $2, $3, 'coverage-event', $4, $5, $6, $7, $7)`,
        [
          eventId,
          accountA,
          `coverage_${index}`,
          `coverage-${index}`,
          JSON.stringify({
            module: 'audit',
            payloadSummary: `Committed coverage event ${index}`,
            riskLevel: 'low'
          }),
          `bulk-coverage-${index}`,
          occurredAt
        ]
      );
    }
  });

  afterAll(async () => {
    const pool = getTestPool();
    await pool.query('DELETE FROM audit_events WHERE id = ANY($1::uuid[])', [
      [
        ...eventIds,
        legacyEventId,
        foreignLegacyEventId,
        mismatchedLegacyMetadataEventId,
        ...bulkEventIds
      ]
    ]);
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountA, accountB]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    await closeDatabaseClient();
  });

  it('filters before limiting and walks the tenant history with a stable cursor', async () => {
    const repository = new DatabaseAuditRepository(getDatabaseClient());
    const firstPage = await repository.listPage({
      accountId: accountA,
      filters: { module: 'billing', entityTypes: ['invoice'], query: 'invoice' },
      limit: 2
    });

    expect(firstPage.items.map((event) => event.entityId)).toEqual(['invoice-1', 'invoice-2']);
    expect(firstPage.hasMore).toBe(true);

    const secondPage = await repository.listPage({
      accountId: accountA,
      cursor: {
        occurredAt: firstPage.items[1]!.occurredAt,
        eventId: firstPage.items[1]!.eventId
      },
      filters: { module: 'billing', entityTypes: ['invoice'], query: 'invoice' },
      limit: 2
    });

    expect(secondPage.items.map((event) => event.entityId)).toEqual(['invoice-3', 'invoice-4']);
    expect(secondPage.hasMore).toBe(false);
    expect(
      [...firstPage.items, ...secondPage.items].every((event) => event.accountId === accountA)
    ).toBe(true);

    const privilegedRepository = new DatabaseAuditRepository(getDatabaseClient());
    const privilegedPage = await privilegedRepository.listPage({ accountId: accountA, limit: 200 });
    expect(
      privilegedPage.items.some((event) => event.eventId === mismatchedLegacyMetadataEventId)
    ).toBe(false);
    const privilegedRefresh = await privilegedRepository.listForCacheRefresh(accountA);
    expect(
      privilegedRefresh.some((event) => event.eventId === mismatchedLegacyMetadataEventId)
    ).toBe(false);
  });

  it('builds coverage from the complete committed snapshot across a fresh service and legacy account rows', async () => {
    const restrictedPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    const restrictedClient = await restrictedPool.connect();
    try {
      await restrictedClient.query('BEGIN');
      await activateRlsRole(restrictedClient);
      const effectiveRole = await restrictedClient.query(
        `SELECT current_user AS role_name, rolbypassrls
           FROM pg_roles
          WHERE rolname = current_user`
      );
      expect(effectiveRole.rows).toEqual([{ role_name: RLS_TEST_ROLE, rolbypassrls: false }]);
      await setAccountContext(restrictedClient, accountA);
      const repository = new DatabaseAuditRepository(createScopedDatabaseClient(restrictedClient));
      const restartedService = new AuditService({ auditRepository: repository });

      const tenantLegacyRows = await restrictedClient.query(
        `SELECT id, account_id, metadata->>'legacyAccountId' AS legacy_account_id
           FROM audit_events
          WHERE account_id IS NULL
          ORDER BY id`
      );
      expect(tenantLegacyRows.rows).toEqual([
        { id: legacyEventId, account_id: null, legacy_account_id: accountA }
      ]);

      await setAccountContext(restrictedClient, null);
      const unscopedLegacyRows = await restrictedClient.query(
        `SELECT id
           FROM audit_events
          WHERE account_id IS NULL`
      );
      expect(unscopedLegacyRows.rows).toEqual([]);
      await setAccountContext(restrictedClient, accountA);

      await restrictedClient.query('SAVEPOINT legacy_write_attempt');
      await expect(
        restrictedClient.query(
          `INSERT INTO audit_events (
             id, account_id, action, entity_type, entity_id, metadata, correlation_id,
             occurred_at, created_at
           ) VALUES ($1, NULL, 'legacy_write_attempt', 'audit-event', 'forbidden', $2, 'forbidden', now(), now())`,
          [
            randomUUID(),
            JSON.stringify({ module: 'audit', legacyAccountId: accountA, riskLevel: 'high' })
          ]
        )
      ).rejects.toThrow(/row-level security/i);
      await restrictedClient.query('ROLLBACK TO SAVEPOINT legacy_write_attempt');
      await restrictedClient.query('RELEASE SAVEPOINT legacy_write_attempt');

      await restrictedClient.query('SAVEPOINT legacy_update_attempt');
      const updateResult = await restrictedClient.query(
        `UPDATE audit_events
            SET action = 'legacy_update_attempt_forbidden'
          WHERE id = $1`,
        [legacyEventId]
      );
      expect(updateResult.rowCount).toBe(0);
      await restrictedClient.query('ROLLBACK TO SAVEPOINT legacy_update_attempt');
      await restrictedClient.query('RELEASE SAVEPOINT legacy_update_attempt');

      await restrictedClient.query('SAVEPOINT legacy_delete_attempt');
      const deleteResult = await restrictedClient.query('DELETE FROM audit_events WHERE id = $1', [
        legacyEventId
      ]);
      expect(deleteResult.rowCount).toBe(0);
      await restrictedClient.query('ROLLBACK TO SAVEPOINT legacy_delete_attempt');
      await restrictedClient.query('RELEASE SAVEPOINT legacy_delete_attempt');

      const legacyAfterWriteAttempts = await restrictedClient.query(
        `SELECT action, metadata->>'legacyAccountId' AS legacy_account_id
           FROM audit_events
          WHERE id = $1`,
        [legacyEventId]
      );
      expect(legacyAfterWriteAttempts.rows).toEqual([
        { action: 'personal_data_exported', legacy_account_id: accountA }
      ]);

      await restrictedClient.query('SAVEPOINT ordinary_write_attempt');
      await expect(
        restrictedClient.query(
          `INSERT INTO audit_events (
             id, account_id, action, entity_type, entity_id, metadata, correlation_id,
             occurred_at, created_at
           ) VALUES ($1, $2, 'ordinary_write_allowed', 'audit-event', 'allowed', $3, 'allowed', now(), now())`,
          [randomUUID(), accountA, JSON.stringify({ module: 'audit', riskLevel: 'low' })]
        )
      ).resolves.toBeDefined();
      await restrictedClient.query('ROLLBACK TO SAVEPOINT ordinary_write_attempt');
      await restrictedClient.query('RELEASE SAVEPOINT ordinary_write_attempt');

      const committed = await repository.listForCacheRefresh(accountA);
      const report = await restartedService.getOperationalCoverageReport(accountA, [
        {
          id: 'lgpd-export',
          module: 'lgpd',
          action: 'personal_data_exported',
          minimumRiskLevel: 'high',
          description: 'Exportacao LGPD'
        }
      ]);
      expect(committed).toHaveLength(5 + bulkEventIds.length);
      expect(committed.some((event) => event.eventId === legacyEventId)).toBe(true);
      expect(committed.some((event) => event.eventId === foreignLegacyEventId)).toBe(false);
      expect(report.totalEvents).toBe(5 + bulkEventIds.length);
      expect(report.eventsByModule.billing).toBe(4);
      expect(report.eventsByModule.audit).toBe(bulkEventIds.length);
      expect(report.eventsByModule.lgpd).toBe(1);
      expect(report.coveredRequirements).toBe(1);
      expect(report.requirements[0]?.evidenceEventId).toBe(legacyEventId);

      const invoiceEvents = committed.filter((event) => event.entityType === 'invoice');
      expect(invoiceEvents.map((event) => event.eventId)).toEqual(accountAEventIds);
    } finally {
      await restrictedClient.query('ROLLBACK');
      restrictedClient.release();
      await restrictedPool.end();
    }
  });
});
