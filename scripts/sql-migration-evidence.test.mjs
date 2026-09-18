import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertSqlEvidenceDocument,
  discoverSqlArtifacts,
  discoverSqlMigrations,
  outboxPayloadIsValid,
  rowSnapshotDigest,
  validateSqlManifest,
  verifySqlMigrationEvidence
} from './lib/sql-migration-evidence.mjs';
import { dataSnapshot } from './run-sql-migration-evidence.mjs';

const root = resolve(import.meta.dirname, '..');
const manifestPath = 'docs/engineering/critical-coverage-scope.json';
const manifestBytes = readFileSync(resolve(root, manifestPath));
const manifest = JSON.parse(manifestBytes);

test('SQL scope distinguishes the 176 active runner files from all retained historical bytes', () => {
  const migrations = discoverSqlMigrations(root);
  const artifacts = discoverSqlArtifacts(root);
  const scope = validateSqlManifest({ root, manifest });

  assert.equal(migrations.length, 176);
  assert.equal(artifacts.length, 183);
  assert.equal(artifacts.filter((artifact) => artifact.kind === 'historical-sql-artifact').length, 7);
  assert.equal(scope.errors.length, 0, scope.errors.join('\n'));
  assert.equal(scope.sqlScope.manifestSqlCount, 183);
  assert.equal(scope.sqlScope.canonicalActiveCount, 176);
  assert.deepEqual(
    scope.sqlScope.historicalArtifactPaths,
    [
      'packages/db/migrations/.backup-meta-fix/0014_luxuriant_mantis.sql',
      'packages/db/migrations/.isolated-drift/0018_outgoing_leopardon.sql',
      'packages/db/migrations/0003_rls_core_tables.revert.sql',
      'packages/db/migrations/0006_rls_lgpd_tables.revert.sql',
      'packages/db/migrations/0007_text_to_uuid_tables.revert.sql',
      'packages/db/migrations/0008_rls_text_based_tables.revert.sql',
      'packages/db/migrations/0017_fiscal_tables.seed.sql'
    ]
  );
  for (const number of ['0163', '0164', '0165', '0166', '0167', '0168', '0169', '0170', '0171', '0172', '0173', '0174', '0175', '0176', '0177']) {
    assert.ok(migrations.some((migration) => migration.name.startsWith(number)), `missing active ${number}`);
  }
  assert.equal(manifest.specializedEvidence.sql.contractualMigrationCount, 169);
  assert.deepEqual(manifest.specializedEvidence.sql.forwardOnlyAdditions, [
    'packages/db/migrations/0171_outbox_event_envelope_backfill_correction.sql',
    'packages/db/migrations/0172_outbox_event_envelope_full_validity_backfill.sql',
    'packages/db/migrations/0173_feature_flag_override_scope_uniqueness.sql',
    'packages/db/migrations/0174_feature_flag_override_tenant_ownership.sql',
    'packages/db/migrations/0175_access_control_change_versions.sql',
    'packages/db/migrations/0176_access_control_change_version_cleanup.sql',
    'packages/db/migrations/0177_clinical_evidence_cascade_immutability.sql'
  ]);
});

test('consumer fails closed when the accepted SQL evidence artifact is absent', () => {
  const result = verifySqlMigrationEvidence({
    root,
    manifestPath,
    evidencePath: 'artifacts/remediation/PROD-011/sql-migration-evidence/accepted/missing.json'
  });
  assert.equal(result.status, 'FAIL');
  assert.match(result.errors.join('\n'), /SQL evidence artifact/);
  assert.equal(result.migrationCount, 176);
});

test('consumer rejects historical bytes mislabeled as executable evidence', () => {
  const invalidManifest = JSON.parse(JSON.stringify(manifest));
  const historical = invalidManifest.files.find((file) => file.path.endsWith('0003_rls_core_tables.revert.sql'));
  historical.applicability = 'sql-migration-evidence';
  const result = validateSqlManifest({ root, manifest: invalidManifest });
  assert.ok(result.errors.some((error) => error.includes('historical-sql-artifact')));
});

test('document consumer rejects missing phase data and JavaScript coverage fields', () => {
  assert.throws(
    () =>
      assertSqlEvidenceDocument({
        root,
        manifest,
        manifestBytes,
        config: manifest.specializedEvidence.sql,
        migrations: discoverSqlMigrations(root),
        evidence: { coverage: {} }
      }),
    /evidence\.schemaVersion.*unsupported.*evidence\.coverage.*JavaScript coverage/s
  );
});

test('consumer validation uses the event-envelope contract for controls', () => {
  const row = {
    id: 'evt-sql-evidence',
    accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    eventType: 'legacy.migrated',
    moduleName: 'legacy',
    correlationId: 'corr-sql-evidence',
    payload: {
      accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      _meta: {
        eventId: 'evt-sql-evidence',
        eventType: 'legacy.migrated',
        accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        sourceModule: 'legacy',
        correlationId: 'corr-sql-evidence',
        actor: { type: 'system', id: 'legacy-outbox' },
        occurredAt: '2026-09-13T00:00:00.000Z',
        schemaVersion: 1,
        causationId: null
      }
    }
  };
  assert.equal(outboxPayloadIsValid(row), true);
  assert.equal(outboxPayloadIsValid({ ...row, payload: { _meta: {} } }), false);
});

test('producer and consumer use the same digest payload for data plus outbox rows', () => {
  const rows = [{ table: 'accounts', count: 1 }];
  const outboxRows = [{ id: 'evt-1', payload: { value: 1 } }];
  const snapshot = dataSnapshot(rows, { outboxRows });
  assert.equal(snapshot.rowCount, rows.length);
  assert.equal(snapshot.digest, rowSnapshotDigest({ rows, outboxRows }));
});
