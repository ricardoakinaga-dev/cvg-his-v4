import { createHash } from 'node:crypto';
import {
  readdirSync,
  readFileSync,
  lstatSync
} from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { resolveContainedPath } from './root-contained-path.mjs';

export const SQL_EVIDENCE_SCHEMA_VERSION = 1;
export const SQL_EVIDENCE_KIND = 'sql-migration-behavior';
export const SQL_REQUIRED_PHASES = Object.freeze([
  'cleanApply',
  'upgrade',
  'reexecution',
  'failureRecovery',
  'invariants'
]);

// These are the only known global tables in the canonical database contract.
// The verifier never accepts an exception declared by an evidence producer.
export const SQL_RLS_EXCEPTIONS = Object.freeze([
  'accounts',
  'tenants',
  'drizzle_migrations',
  'installation_state'
]);

const SHA256 = /^[a-f0-9]{64}$/i;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const ISO_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:[T ](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-](?:[01]\d|2[0-3]):?\d{2})?)?$/;

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

function slashPath(value) {
  return value.split('\\').join('/');
}

function isRegularNonSymlink(path, label) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
  if (!stat.isFile()) throw new Error(`${label} must be a regular file`);
  return stat;
}

function readContainedRegularFile(root, candidate, label) {
  const resolved = resolveContainedPath(root, candidate);
  if (!resolved.ok) throw new Error(`${label}: ${resolved.reason}`);
  isRegularNonSymlink(resolved.absolute, label);
  return { ...resolved, bytes: readFileSync(resolved.absolute) };
}

function readContainedDirectory(root, candidate, label) {
  const resolved = resolveContainedPath(root, candidate);
  if (!resolved.ok) throw new Error(`${label}: ${resolved.reason}`);
  const stat = lstatSync(resolved.absolute);
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
  if (!stat.isDirectory()) throw new Error(`${label} must be a directory`);
  return resolved;
}

/**
 * Discover exactly the files consumed by packages/db/src/migrate.ts.
 *
 * The active migration rail is intentionally top-level only. Revert scripts,
 * seed scripts, backups and drift directories are not executable migrations.
 * Keeping this rule here makes a SQL evidence artifact unable to certify an
 * accidentally copied historical file.
 */
export function discoverSqlMigrations(root, options = {}) {
  const sourceDirectory = options.sourceDirectory ?? 'packages/db/migrations';
  const directory = readContainedDirectory(root, sourceDirectory, 'SQL migration directory');
  const names = readdirSync(directory.absolute)
    .filter(
      (name) =>
        name.endsWith('.sql') &&
        !name.endsWith('.revert.sql') &&
        !name.endsWith('.seed.sql')
    )
    .sort();

  const seenNames = new Set();
  return names.map((name, index) => {
    if (seenNames.has(name)) throw new Error(`duplicate SQL migration name: ${name}`);
    seenNames.add(name);
    const absolute = resolve(directory.absolute, name);
    isRegularNonSymlink(absolute, `SQL migration ${name}`);
    const bytes = readFileSync(absolute);
    const path = slashPath(relative(resolve(root), absolute));
    return Object.freeze({
      order: index + 1,
      name: name.slice(0, -'.sql'.length),
      path,
      sha256: sha256(bytes),
      bytes
    });
  });
}

/**
 * Inventory every SQL byte below the migration directory. This is broader
 * than the runner inventory on purpose: revert/seed files and hidden drift or
 * backup files remain accountable historical artifacts, but never executable
 * migrations.
 */
export function discoverSqlArtifacts(root, options = {}) {
  const sourceDirectory = options.sourceDirectory ?? 'packages/db/migrations';
  const directory = readContainedDirectory(root, sourceDirectory, 'SQL migration directory');
  const artifacts = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = resolve(current, entry.name);
      const relativeToSource = relative(directory.absolute, absolute);
      if (entry.isSymbolicLink()) throw new Error(`SQL artifact ${relativeToSource} must not be a symbolic link`);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.sql')) continue;
      const bytes = readFileSync(absolute);
      const path = slashPath(relative(resolve(root), absolute));
      const topLevel = !relativeToSource.includes(sep);
      const executable = topLevel && !entry.name.endsWith('.revert.sql') && !entry.name.endsWith('.seed.sql');
      artifacts.push(Object.freeze({
        path,
        sha256: sha256(bytes),
        bytes,
        kind: executable ? 'canonical-active' : 'historical-sql-artifact'
      }));
    }
  };
  visit(directory.absolute);
  return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}

export function sqlMigrationSourceDigest(migrations) {
  const entries = (Array.isArray(migrations) ? migrations : [])
    .map((migration) => `${migration.path}:${migration.sha256}`)
    .sort();
  return sha256(entries.join('\n'));
}

export function migrationRowsDigest(rows) {
  return sha256(JSON.stringify(rows));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)])
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function rowSnapshotDigest(rows) {
  return sha256(stableJson(rows));
}

export function normalizeMigrationRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    name: row?.name ?? row?.migration_name ?? row?.migrationName,
    hash: row?.hash
  }));
}

function expectedMigrationRows(migrations, targetName) {
  const targetIndex = targetName
    ? migrations.findIndex((migration) => migration.name === targetName)
    : migrations.length - 1;
  if (targetIndex < 0) return null;
  return migrations.slice(0, targetIndex + 1).map(({ name, sha256: checksum }) => ({
    name,
    hash: checksum
  }));
}

function deepEqual(left, right) {
  return stableJson(left) === stableJson(right);
}

function phaseError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function requireObject(errors, value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    phaseError(errors, path, 'must be an object');
    return false;
  }
  return true;
}

function requirePassedPhase(errors, phase, path) {
  if (!requireObject(errors, phase, path)) return false;
  if (phase.status !== 'passed') phaseError(errors, path, 'status must be passed');
  if (phase.exitCode !== 0) phaseError(errors, `${path}.exitCode`, 'must be zero');
  if (phase.signal !== null) phaseError(errors, `${path}.signal`, 'must be null');
  return true;
}

function verifyMigrationRows(errors, rows, expected, path) {
  if (!Array.isArray(rows)) {
    phaseError(errors, `${path}.migrationRows`, 'must be an array');
    return;
  }
  if (!deepEqual(rows, expected)) phaseError(errors, `${path}.migrationRows`, 'does not match source hashes/order');
  if (rows.length !== expected.length) phaseError(errors, `${path}.migrationRows`, 'count mismatch');
  return migrationRowsDigest(rows);
}

function verifySnapshot(errors, snapshot, path, expectedRows) {
  if (!requireObject(errors, snapshot, path)) return;
  if (!Array.isArray(snapshot.rows)) phaseError(errors, `${path}.rows`, 'must be an array');
  else {
    if (!SHA256.test(snapshot.digest ?? '')) phaseError(errors, `${path}.digest`, 'must be a SHA-256 digest');
    else {
      const extras = Object.fromEntries(
        Object.entries(snapshot).filter(([key]) => !['rows', 'rowCount', 'digest'].includes(key))
      );
      const content = Object.keys(extras).length ? { rows: snapshot.rows, ...extras } : snapshot.rows;
      if (snapshot.digest !== rowSnapshotDigest(content)) phaseError(errors, `${path}.digest`, 'does not match rows');
    }
    if (!Number.isSafeInteger(snapshot.rowCount) || snapshot.rowCount !== snapshot.rows.length)
      phaseError(errors, `${path}.rowCount`, 'must match rows');
  }
  if (expectedRows && snapshot.migrationRows) verifyMigrationRows(errors, snapshot.migrationRows, expectedRows, path);
}

function verifyImplementationIdentity(errors, root, config, evidence) {
  const implementation = evidence.implementation;
  if (!requireObject(errors, implementation, 'implementation')) return;
  for (const [key, configuredPath] of [
    ['producer', config.producerPath],
    ['verifier', config.verifierPath]
  ]) {
    if (typeof configuredPath !== 'string' || configuredPath.length === 0) {
      phaseError(errors, `specializedEvidence.sql.${key}Path`, 'must be a non-empty path');
      continue;
    }
    if (implementation[`${key}Path`] !== configuredPath)
      phaseError(errors, `implementation.${key}Path`, `must equal ${configuredPath}`);
    try {
      const file = readContainedRegularFile(root, configuredPath, `${key} source`);
      if (implementation[`${key}Sha256`] !== sha256(file.bytes))
        phaseError(errors, `implementation.${key}Sha256`, 'does not match current source');
    } catch (error) {
      phaseError(errors, `implementation.${key}`, error.message);
    }
  }
}

function verifyCatalog(errors, catalog, path = 'invariants.catalog') {
  if (!requireObject(errors, catalog, path)) return null;
  for (const key of ['columns', 'tables', 'constraints', 'indexes', 'policies']) {
    if (!Array.isArray(catalog[key])) phaseError(errors, `${path}.${key}`, 'must be an array');
  }
  if (typeof catalog.fingerprint !== 'string' || !SHA256.test(catalog.fingerprint))
    phaseError(errors, `${path}.fingerprint`, 'must be a SHA-256 digest');

  const canonical = {
    columns: Array.isArray(catalog.columns) ? catalog.columns : [],
    tables: Array.isArray(catalog.tables) ? catalog.tables : [],
    constraints: Array.isArray(catalog.constraints) ? catalog.constraints : [],
    indexes: Array.isArray(catalog.indexes) ? catalog.indexes : [],
    policies: Array.isArray(catalog.policies) ? catalog.policies : []
  };
  const expectedFingerprint = sha256(stableJson(canonical));
  if (catalog.fingerprint !== expectedFingerprint)
    phaseError(errors, `${path}.fingerprint`, 'does not match catalog bytes');

  const invalidConstraints = canonical.constraints.filter((item) => item?.validated !== true);
  const invalidIndexes = canonical.indexes.filter(
    (item) => item?.valid !== true || item?.ready !== true
  );
  if (catalog.invalidConstraints !== invalidConstraints.length)
    phaseError(errors, `${path}.invalidConstraints`, 'does not match catalog');
  if (catalog.invalidIndexes !== invalidIndexes.length)
    phaseError(errors, `${path}.invalidIndexes`, 'does not match catalog');
  if (invalidConstraints.length) phaseError(errors, path, 'contains unvalidated constraints');
  if (invalidIndexes.length) phaseError(errors, path, 'contains invalid or unready indexes');

  const tableNames = new Set(canonical.tables.map((table) => table?.name));
  const columnsByTable = new Map();
  for (const column of canonical.columns) {
    const list = columnsByTable.get(column?.table) ?? [];
    list.push(column);
    columnsByTable.set(column?.table, list);
  }
  const policiesByTable = new Map();
  for (const policy of canonical.policies) {
    const list = policiesByTable.get(policy?.table) ?? [];
    list.push(policy);
    policiesByTable.set(policy?.table, list);
  }

  const exceptions = new Set(SQL_RLS_EXCEPTIONS);
  const tenantTables = canonical.tables.filter((table) => {
    const name = table?.name;
    return name && !exceptions.has(name) &&
      (columnsByTable.get(name) ?? []).some((column) => column?.name === 'account_id');
  });
  const missingRls = [];
  for (const table of tenantTables) {
    const name = table.name;
    const policies = policiesByTable.get(name) ?? [];
    const hasCurrentAccountPredicate = policies.some((policy) =>
      /current_account_id|current_setting\(['"]app\.current_account_id/i.test(
        `${policy?.using ?? ''} ${policy?.check ?? ''}`
      )
    );
    if (table.rowSecurity !== true || policies.length === 0 || !hasCurrentAccountPredicate)
      missingRls.push(name);
  }
  if (catalog.rls?.tenantTableCount !== tenantTables.length)
    phaseError(errors, `${path}.rls.tenantTableCount`, 'does not match catalog');
  if (catalog.rls?.missingTables?.length !== missingRls.length)
    phaseError(errors, `${path}.rls.missingTables`, 'does not match catalog');
  if (!deepEqual(catalog.rls?.missingTables ?? [], missingRls.sort()))
    phaseError(errors, `${path}.rls.missingTables`, 'contains an unexpected table');
  if (missingRls.length) phaseError(errors, path, 'tenant tables lack executable RLS evidence');

  if (!tableNames.has('drizzle_migrations')) phaseError(errors, path, 'drizzle_migrations is absent');
  if (!Number.isSafeInteger(catalog.tableCount) || catalog.tableCount !== canonical.tables.length)
    phaseError(errors, `${path}.tableCount`, 'does not match catalog');
  return canonical;
}

export function outboxPayloadIsValid(row) {
  const payload = row?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const metadata = payload._meta;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false;
  const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 255;
  if (!text(payload.accountId) || payload.accountId !== row.accountId) return false;
  if (!text(metadata.eventId) || metadata.eventId !== row.id) return false;
  if (!text(metadata.eventType) || !/^[a-z][a-z0-9]*([._-][a-z0-9]+)*$/.test(metadata.eventType) || metadata.eventType !== row.eventType) return false;
  if (!text(metadata.accountId) || metadata.accountId !== row.accountId) return false;
  if (!text(metadata.sourceModule) || metadata.sourceModule !== row.moduleName) return false;
  if (!text(metadata.correlationId) || metadata.correlationId !== row.correlationId) return false;
  if (!metadata.actor || typeof metadata.actor !== 'object' || Array.isArray(metadata.actor)) return false;
  if (!['user', 'service', 'system'].includes(metadata.actor.type) || !text(metadata.actor.id)) return false;
  if (metadata.schemaVersion !== undefined &&
      (!Number.isSafeInteger(metadata.schemaVersion) || metadata.schemaVersion < 1 || metadata.schemaVersion > 1000)) return false;
  if (metadata.occurredAt !== undefined &&
      (typeof metadata.occurredAt !== 'string' || !ISO_DATE.test(metadata.occurredAt))) return false;
  if (metadata.causationId !== undefined && metadata.causationId !== null && !text(metadata.causationId)) return false;
  return true;
}

function verifyLegacyEnvelopeScenario(errors, scenario, migrations) {
  const path = 'phases.upgrade.scenarios.legacyEnvelope';
  if (!requirePassedPhase(errors, scenario, path)) return;
  if (!Array.isArray(scenario.steps) || scenario.steps.length !== 3) {
    phaseError(errors, `${path}.steps`, 'must contain exactly one passed step for 0170, 0171 and 0172');
    return;
  }
  const snapshots = scenario.snapshots;
  if (!requireObject(errors, snapshots, `${path}.snapshots`)) return;
  const fixtureRows = snapshots.before?.rows;
  if (!Array.isArray(fixtureRows) || fixtureRows.length < 3) {
    phaseError(errors, `${path}.snapshots.before.rows`, 'must contain real legacy rows');
    return;
  }
  const allIds = fixtureRows.map((row) => row?.id);
  if (new Set(allIds).size !== allIds.length || allIds.some((id) => typeof id !== 'string' || !id))
    phaseError(errors, `${path}.snapshots.before.rows`, 'must have unique non-empty ids');
  for (const snapshotName of ['before', 'after0170', 'after0171', 'after0172']) {
    verifySnapshot(errors, snapshots[snapshotName], `${path}.snapshots.${snapshotName}`);
  }
  const bySnapshot = (name) => new Map((snapshots[name]?.rows ?? []).map((row) => [row.id, row]));
  const before = bySnapshot('before');
  const after0170 = bySnapshot('after0170');
  const after0171 = bySnapshot('after0171');
  const after0172 = bySnapshot('after0172');
  for (const [id, row] of before) {
    if (!after0172.has(id)) phaseError(errors, path, `final snapshot lost row ${id}`);
    if (row?.accountId === undefined || row?.eventType === undefined || row?.moduleName === undefined || row?.correlationId === undefined)
      phaseError(errors, `${path}.snapshots.before.rows`, `row ${id} lacks source identity columns`);
  }
  const changedIds = (left, right) => [...left.keys()].filter((id) => !deepEqual(left.get(id), right.get(id))).sort();
  const changed0170 = changedIds(before, after0170);
  const changed0171 = changedIds(after0170, after0171);
  const changed0172 = changedIds(after0171, after0172);
  if (!deepEqual(scenario.repairedIdsAfter0170 ?? [], changed0170))
    phaseError(errors, `${path}.repairedIdsAfter0170`, 'does not match row bytes');
  if (!deepEqual(scenario.repairedIdsAfter0171 ?? [], changed0171))
    phaseError(errors, `${path}.repairedIdsAfter0171`, 'does not match row bytes');
  if (!deepEqual(scenario.repairedIdsAfter0172 ?? [], changed0172))
    phaseError(errors, `${path}.repairedIdsAfter0172`, 'does not match row bytes');

  const validCounts = [before, after0170, after0171, after0172].map((rows) =>
    [...rows.values()].filter(outboxPayloadIsValid).length
  );
  if (validCounts[0] < 1) phaseError(errors, path, 'fixture must include a valid envelope control');
  if (validCounts[1] >= fixtureRows.length) phaseError(errors, path, '0170 known-bad control was not discriminant');
  if (validCounts[2] >= fixtureRows.length) phaseError(errors, path, '0171 known-bad control was not discriminant');
  if (validCounts[3] !== fixtureRows.length) phaseError(errors, path, '0172 did not leave every legacy row consumer-valid');
  const validBefore = [...before.values()].filter(outboxPayloadIsValid);
  for (const row of validBefore) {
    const final = after0172.get(row.id);
    if (!final || !deepEqual(row.payload, final.payload))
      phaseError(errors, path, `valid row ${row.id} was not preserved byte-for-byte`);
  }
  if (scenario.knownBadControl?.reproduced !== true)
    phaseError(errors, `${path}.knownBadControl`, 'must explicitly record the discriminant A01 control');

  const prefixTarget = scenario.prefixTarget;
  const prefixRows = expectedMigrationRows(migrations, prefixTarget);
  if (!prefixRows) phaseError(errors, `${path}.prefixTarget`, 'is not a canonical migration');
  for (let index = 0; index < scenario.steps.length; index += 1) {
    const step = scenario.steps[index];
    const stepPath = `${path}.steps[${index}]`;
    if (!requirePassedPhase(errors, step, stepPath)) continue;
    const expected = expectedMigrationRows(migrations, step.target);
    if (!expected) {
      phaseError(errors, `${stepPath}.target`, 'is not a canonical migration');
      continue;
    }
    verifyMigrationRows(errors, step.migrationRows, expected, stepPath);
    if (step.migrationRowsDigest !== migrationRowsDigest(step.migrationRows ?? []))
      phaseError(errors, `${stepPath}.migrationRowsDigest`, 'does not match migration rows');
    const expectedTargets = ['0170_outbox_event_envelope', '0171_outbox_event_envelope_backfill_correction', '0172_outbox_event_envelope_full_validity_backfill'];
    if (step.target !== expectedTargets[index])
      phaseError(errors, `${stepPath}.target`, `must be ${expectedTargets[index]}`);
    if (index > 0 && migrations.findIndex((migration) => migration.name === step.target) <= migrations.findIndex((migration) => migration.name === scenario.steps[index - 1].target))
      phaseError(errors, `${stepPath}.target`, 'steps are not ordered');
  }
  if (scenario.finalSchemaFingerprint !== scenario.schemaFingerprint)
    phaseError(errors, path, 'final schema fingerprint is inconsistent');
  if (prefixRows && scenario.prefixMigrationCount !== prefixRows.length)
    phaseError(errors, `${path}.prefixMigrationCount`, 'does not match target');
}

function verifyUpgrade(errors, phase, migrations) {
  const path = 'phases.upgrade';
  if (!requirePassedPhase(errors, phase, path)) return;
  const scenarios = phase.scenarios;
  if (!requireObject(errors, scenarios, `${path}.scenarios`)) return;
  const foundational = scenarios.foundational;
  if (requirePassedPhase(errors, foundational, `${path}.scenarios.foundational`)) {
    const beforeRows = expectedMigrationRows(migrations, foundational.target);
    if (!beforeRows) phaseError(errors, `${path}.scenarios.foundational.target`, 'is not canonical');
    else verifyMigrationRows(errors, foundational.beforeMigrationRows, beforeRows, `${path}.scenarios.foundational`);
    verifyMigrationRows(errors, foundational.afterMigrationRows, expectedMigrationRows(migrations), `${path}.scenarios.foundational`);
    if (foundational.beforeMigrationRowsDigest !== migrationRowsDigest(foundational.beforeMigrationRows ?? [])) phaseError(errors, `${path}.scenarios.foundational.beforeMigrationRowsDigest`, 'does not match rows');
    if (foundational.afterMigrationRowsDigest !== migrationRowsDigest(foundational.afterMigrationRows ?? [])) phaseError(errors, `${path}.scenarios.foundational.afterMigrationRowsDigest`, 'does not match rows');
    if (!foundational.preexistingData?.preserved) phaseError(errors, `${path}.scenarios.foundational.preexistingData`, 'must prove data was present before upgrade and preserved');
  }
  verifyLegacyEnvelopeScenario(errors, scenarios.legacyEnvelope, migrations);
}

function verifyReexecution(errors, phase, migrations) {
  const path = 'phases.reexecution';
  if (!requirePassedPhase(errors, phase, path)) return;
  verifyMigrationRows(errors, phase.beforeMigrationRows, expectedMigrationRows(migrations), path);
  verifyMigrationRows(errors, phase.afterMigrationRows, expectedMigrationRows(migrations), path);
  if (phase.beforeMigrationDigest !== migrationRowsDigest(phase.beforeMigrationRows ?? []))
    phaseError(errors, `${path}.beforeMigrationDigest`, 'does not match rows');
  if (phase.afterMigrationDigest !== migrationRowsDigest(phase.afterMigrationRows ?? []))
    phaseError(errors, `${path}.afterMigrationDigest`, 'does not match rows');
  if (phase.beforeMigrationDigest !== phase.afterMigrationDigest)
    phaseError(errors, path, 'reexecution changed migration records');
  verifySnapshot(errors, phase.beforeData, `${path}.beforeData`);
  verifySnapshot(errors, phase.afterData, `${path}.afterData`);
  if (phase.beforeData?.digest !== phase.afterData?.digest)
    phaseError(errors, path, 'reexecution changed persisted data');
  if (phase.duplicateMigrationRows !== 0 || phase.noDuplicateMigrationRows !== true)
    phaseError(errors, path, 'duplicate migration rows are not proven absent');
}

function verifyFailureRecovery(errors, phase, migrations) {
  const path = 'phases.failureRecovery';
  if (!requireObject(errors, phase, path)) return;
  if (phase.status !== 'passed') phaseError(errors, path, 'status must be passed');
  if (phase.exitCode !== 0 || phase.signal !== null) phaseError(errors, path, 'phase must finalize with zero exit code and null signal');
  const beforeRows = expectedMigrationRows(migrations, phase.prefixTarget);
  if (!beforeRows) phaseError(errors, `${path}.prefixTarget`, 'is not canonical');
  if (phase.corruptedHash === undefined || !SHA256.test(phase.corruptedHash)) phaseError(errors, `${path}.corruptedHash`, 'must be a SHA-256 digest');
  const corrupted = migrations.find((migration) => migration.name === phase.corruptedMigrationName);
  if (!corrupted || corrupted.sha256 === phase.corruptedHash) phaseError(errors, `${path}.corruptedMigrationName`, 'must identify a migration with a deliberately different hash');
  if (phase.originalHash !== corrupted?.sha256) phaseError(errors, `${path}.originalHash`, 'must match the source hash before deliberate corruption');
  const failed = phase.failedAttempt;
  if (!requireObject(errors, failed, `${path}.failedAttempt`)) return;
  if (failed.status !== 'failed' || !Number.isInteger(failed.exitCode) || failed.exitCode === 0 || failed.signal !== null)
    phaseError(errors, `${path}.failedAttempt`, 'must record a failed checksum-guard execution');
  if (beforeRows) {
    const corruptedRows = beforeRows.map((row) =>
      row.name === phase.corruptedMigrationName ? { ...row, hash: phase.corruptedHash } : row
    );
    verifyMigrationRows(errors, failed.migrationRows, corruptedRows, `${path}.failedAttempt`);
    verifyMigrationRows(errors, failed.restoredMigrationRows, beforeRows, `${path}.failedAttempt`);
  }
  verifySnapshot(errors, failed.data, `${path}.failedAttempt.data`);
  const recovery = phase.recoveryAttempt;
  if (!requirePassedPhase(errors, recovery, `${path}.recoveryAttempt`)) return;
  verifyMigrationRows(errors, recovery.migrationRows, expectedMigrationRows(migrations), `${path}.recoveryAttempt`);
  if (phase.rollbackVerified !== true || phase.noMigrationRowCreated !== true)
    phaseError(errors, path, 'must prove failed attempt did not create a migration row');
}

function verifyDocument({ root, manifest, manifestBytes, config, migrations, evidence }) {
  const errors = [];
  if (!requireObject(errors, evidence, 'evidence')) return errors;
  if (evidence.schemaVersion !== SQL_EVIDENCE_SCHEMA_VERSION) phaseError(errors, 'evidence.schemaVersion', 'unsupported');
  if (evidence.evidenceKind !== SQL_EVIDENCE_KIND) phaseError(errors, 'evidence.evidenceKind', 'must identify SQL migration behavior');
  if (evidence.ticket !== 'PROD-011') phaseError(errors, 'evidence.ticket', 'must be PROD-011');
  if (evidence.status !== 'passed') phaseError(errors, 'evidence.status', 'must be passed');
  if (evidence.finalizedAfterExit !== true || evidence.exitCode !== 0 || evidence.signal !== null)
    phaseError(errors, 'evidence.finalizedAfterExit', 'artifact was not finalized after a successful producer exit');
  if (typeof evidence.runId !== 'string' || !UUID.test(evidence.runId)) phaseError(errors, 'evidence.runId', 'must be a UUID');
  if (evidence.head !== manifest.head) phaseError(errors, 'evidence.head', 'does not match manifest HEAD');
  if (evidence.manifestSha256 !== sha256(manifestBytes)) phaseError(errors, 'evidence.manifestSha256', 'does not match manifest bytes');
  if (evidence.sqlSourceSetSha256 !== sqlMigrationSourceDigest(migrations)) phaseError(errors, 'evidence.sqlSourceSetSha256', 'does not match current SQL source bytes');
  if (evidence.migrationCount !== migrations.length) phaseError(errors, 'evidence.migrationCount', 'does not match canonical inventory');
  if (evidence.contractualMigrationCount !== config.contractualMigrationCount) phaseError(errors, 'evidence.contractualMigrationCount', 'does not match manifest contract');
  if (evidence.humanCertification !== false) phaseError(errors, 'evidence.humanCertification', 'must remain false');
  for (const forbidden of ['coverage', 'javascriptCoverage', 'istanbul', 'v8Coverage']) {
    if (Object.hasOwn(evidence, forbidden)) phaseError(errors, `evidence.${forbidden}`, 'SQL evidence must not contain JavaScript coverage');
  }

  const expectedSources = migrations.map(({ order, name, path, sha256: checksum }) => ({ order, name, path, sha256: checksum }));
  if (!deepEqual(evidence.migrations, expectedSources)) phaseError(errors, 'evidence.migrations', 'does not exactly enumerate canonical SQL hashes');
  verifyImplementationIdentity(errors, root, config, evidence);

  const phases = evidence.phases;
  if (!requireObject(errors, phases, 'evidence.phases')) return errors;
  for (const required of SQL_REQUIRED_PHASES) {
    if (!(required in phases)) phaseError(errors, `evidence.phases.${required}`, 'required phase is missing');
  }
  if (requirePassedPhase(errors, phases.cleanApply, 'phases.cleanApply')) {
    verifyMigrationRows(errors, phases.cleanApply.migrationRows, expectedMigrationRows(migrations), 'phases.cleanApply');
    if (phases.cleanApply.migrationRowsDigest !== migrationRowsDigest(phases.cleanApply.migrationRows ?? [])) phaseError(errors, 'phases.cleanApply.migrationRowsDigest', 'does not match rows');
    if (typeof phases.cleanApply.schemaFingerprint !== 'string' || !SHA256.test(phases.cleanApply.schemaFingerprint)) phaseError(errors, 'phases.cleanApply.schemaFingerprint', 'must be a digest');
  }
  verifyUpgrade(errors, phases.upgrade, migrations);
  verifyReexecution(errors, phases.reexecution, migrations);
  verifyFailureRecovery(errors, phases.failureRecovery, migrations);
  if (requirePassedPhase(errors, phases.invariants, 'phases.invariants')) {
    verifyCatalog(errors, phases.invariants.catalog);
    if (!Array.isArray(phases.invariants.databases) || phases.invariants.databases.length < 3)
      phaseError(errors, 'phases.invariants.databases', 'must cover each final database scenario');
    else {
      const fingerprint = phases.invariants.catalog?.fingerprint;
      for (const [index, database] of phases.invariants.databases.entries()) {
        const path = `phases.invariants.databases[${index}]`;
        if (database?.status !== 'passed') phaseError(errors, path, 'status must be passed');
        if (database?.schemaFingerprint !== fingerprint) phaseError(errors, `${path}.schemaFingerprint`, 'does not match clean catalog');
        if (database?.invalidConstraints !== 0 || database?.invalidIndexes !== 0) phaseError(errors, path, 'invalid catalog objects remain');
      }
    }
    const probe = phases.invariants.rlsProbe;
    if (!requireObject(errors, probe, 'phases.invariants.rlsProbe')) {
      // error already recorded
    } else {
      if (probe.roleIsSuperuser !== false || probe.roleBypassRls !== false) phaseError(errors, 'phases.invariants.rlsProbe', 'probe role must be non-superuser and NO BYPASSRLS');
      if (probe.crossTenantVisible !== false || probe.accountAVisible !== 1 || probe.accountBVisible !== 1) phaseError(errors, 'phases.invariants.rlsProbe', 'does not prove tenant isolation');
      if (probe.duplicateConstraint?.accepted !== false || probe.duplicateConstraint?.sqlState !== '23505') phaseError(errors, 'phases.invariants.rlsProbe.duplicateConstraint', 'does not prove a real constraint rejection');
    }
  }
  return errors;
}

export function validateSqlManifest({ root, manifest }) {
  const errors = [];
  const sqlEntries = Array.isArray(manifest?.files)
    ? manifest.files.filter((file) => typeof file?.path === 'string' && file.path.endsWith('.sql'))
    : [];
  const config = manifest?.specializedEvidence?.sql;
  if (sqlEntries.length === 0 && config === undefined) return { applicable: false, errors, config: null, migrations: [] };
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    errors.push('specializedEvidence.sql is required for SQL sources');
    return { applicable: true, errors, config: null, migrations: [] };
  }
  if (config.schemaVersion !== SQL_EVIDENCE_SCHEMA_VERSION) errors.push('specializedEvidence.sql.schemaVersion is unsupported');
  if (typeof config.sourceDirectory !== 'string' || !config.sourceDirectory) errors.push('specializedEvidence.sql.sourceDirectory is required');
  if (typeof config.acceptedArtifactPath !== 'string' || !config.acceptedArtifactPath) errors.push('specializedEvidence.sql.acceptedArtifactPath is required');
  if (!Array.isArray(config.requiredPhases) || !SQL_REQUIRED_PHASES.every((phase) => config.requiredPhases.includes(phase))) errors.push('specializedEvidence.sql.requiredPhases must include all SQL evidence phases');
  let migrations = [];
  let artifacts = [];
  try {
    migrations = discoverSqlMigrations(root, { sourceDirectory: config.sourceDirectory });
    artifacts = discoverSqlArtifacts(root, { sourceDirectory: config.sourceDirectory });
  } catch (error) {
    errors.push(`canonical SQL inventory: ${error.message}`);
  }
  if (Number.isInteger(config.expectedMigrationCount) && config.expectedMigrationCount !== migrations.length)
    errors.push(`specializedEvidence.sql.expectedMigrationCount=${config.expectedMigrationCount} does not match canonical inventory=${migrations.length}`);
  if (!Number.isInteger(config.expectedArtifactCount) || config.expectedArtifactCount !== artifacts.length)
    errors.push(`specializedEvidence.sql.expectedArtifactCount=${config.expectedArtifactCount} does not match complete SQL artifact inventory=${artifacts.length}`);
  const historicalArtifacts = artifacts.filter((artifact) => artifact.kind === 'historical-sql-artifact');
  if (!Number.isInteger(config.historicalArtifactCount) || config.historicalArtifactCount !== historicalArtifacts.length)
    errors.push(`specializedEvidence.sql.historicalArtifactCount=${config.historicalArtifactCount} does not match historical inventory=${historicalArtifacts.length}`);
  if (!Number.isInteger(config.contractualMigrationCount) || config.contractualMigrationCount < 1 || config.contractualMigrationCount > migrations.length)
    errors.push('specializedEvidence.sql.contractualMigrationCount is invalid');
  const expectedForward = Number.isInteger(config.contractualMigrationCount)
    ? migrations.slice(config.contractualMigrationCount).map((migration) => migration.path)
    : [];
  if (!deepEqual(config.forwardOnlyAdditions ?? [], expectedForward)) errors.push('specializedEvidence.sql.forwardOnlyAdditions does not match canonical suffix');
  const byPath = new Map(migrations.map((migration) => [migration.path, migration]));
  const artifactByPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  const manifestByPath = new Map(sqlEntries.map((file) => [file.path, file]));
  if (sqlEntries.length !== artifacts.length) errors.push(`manifest SQL artifact count ${sqlEntries.length} does not equal complete SQL artifact inventory ${artifacts.length}`);
  for (const migration of migrations) {
    const file = manifestByPath.get(migration.path);
    if (!file) {
      errors.push(`manifest is missing canonical SQL source: ${migration.path}`);
      continue;
    }
    if (file.sha256 !== migration.sha256) errors.push(`manifest SQL hash mismatch: ${migration.path}`);
    if (file.applicability !== 'sql-migration-evidence') errors.push(`manifest SQL applicability must be sql-migration-evidence: ${migration.path}`);
  }
  for (const artifact of artifacts) {
    const file = manifestByPath.get(artifact.path);
    if (!file) {
      errors.push(`manifest is missing SQL artifact bytes: ${artifact.path}`);
      continue;
    }
    if (file.sha256 !== artifact.sha256) errors.push(`manifest SQL artifact hash mismatch: ${artifact.path}`);
    const expectedApplicability = artifact.kind === 'canonical-active'
      ? 'sql-migration-evidence'
      : 'historical-sql-artifact';
    if (file.applicability !== expectedApplicability)
      errors.push(`manifest SQL artifact applicability must be ${expectedApplicability}: ${artifact.path}`);
  }
  for (const file of sqlEntries) if (!artifactByPath.has(file.path)) errors.push(`manifest contains SQL source outside complete inventory: ${file.path}`);
  return {
    applicable: true,
    errors,
    config,
    migrations,
    artifacts,
    sqlScope: {
      manifestSqlCount: sqlEntries.length,
      canonicalActiveCount: migrations.length,
      historicalArtifactCount: historicalArtifacts.length,
      historicalArtifactPaths: historicalArtifacts.map((artifact) => artifact.path)
    }
  };
}

export function verifySqlMigrationEvidence({ root, manifestPath, evidencePath }) {
  const errors = [];
  let manifestFile;
  let manifest;
  let manifestBytes;
  try {
    manifestFile = readContainedRegularFile(root, manifestPath, 'SQL evidence manifest');
    manifestBytes = manifestFile.bytes;
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    return { status: 'FAIL', errors: [`SQL evidence manifest: ${error.message}`], migrationCount: 0 };
  }
  const scope = validateSqlManifest({ root, manifest });
  errors.push(...scope.errors);
  if (!scope.applicable) return { status: 'NOT_APPLICABLE', errors: [], migrationCount: 0, sqlScope: null };
  if (!scope.config || scope.errors.length) return { status: 'FAIL', errors, migrationCount: scope.migrations.length, sqlScope: scope.sqlScope };
  const artifactCandidate = evidencePath ?? scope.config.acceptedArtifactPath;
  let evidence;
  try {
    const artifact = readContainedRegularFile(root, artifactCandidate, 'SQL evidence artifact');
    evidence = JSON.parse(artifact.bytes.toString('utf8'));
  } catch (error) {
    errors.push(`SQL evidence artifact: ${error.message}`);
    return { status: 'FAIL', errors, migrationCount: scope.migrations.length, sqlScope: scope.sqlScope };
  }
  errors.push(...verifyDocument({ root, manifest, manifestBytes, config: scope.config, migrations: scope.migrations, evidence }));
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    errors,
    migrationCount: scope.migrations.length,
    sqlScope: scope.sqlScope,
    evidenceRunId: evidence?.runId ?? null,
    artifactPath: artifactCandidate
  };
}

export function assertSqlEvidenceDocument(input) {
  const result = verifyDocument(input);
  if (result.length) throw new Error(result.join('; '));
  return true;
}
