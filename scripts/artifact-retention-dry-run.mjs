#!/usr/bin/env node

import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = resolve(import.meta.dirname, '..');
const defaultPolicyPath = resolve(rootDir, 'docs/engineering/artifact-retention-policy.json');
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeRelativePath(value) {
  return value.split(sep).join('/').replace(/^\.\//, '').replace(/\/$/, '');
}

function pathMatchesPrefix(path, prefix) {
  const normalizedPrefix = normalizeRelativePath(prefix);
  return path === normalizedPrefix || path.startsWith(`${normalizedPrefix}/`);
}

function isWithin(parentPath, childPath) {
  const pathFromParent = relative(parentPath, childPath);
  return pathFromParent === '' || (!isAbsolute(pathFromParent) && pathFromParent !== '..' && !pathFromParent.startsWith(`..${sep}`));
}

function validateRelativePath(value, label) {
  if (typeof value !== 'string' || value.trim() === '')
    throw new Error(`${label} must be a non-empty relative path`);
  const normalized = value.replace(/\\/g, '/');
  if (
    isAbsolute(value) ||
    normalized.startsWith('/') ||
    normalized.split('/').some((segment) => segment === '..')
  ) {
    throw new Error(`${label} must stay inside the scan root`);
  }
}

function validatePolicy(policy) {
  if (policy?.schema_version !== 1)
    throw new Error('artifact retention policy schema_version must be 1');
  if (!Array.isArray(policy.managed_roots) || policy.managed_roots.length === 0) {
    throw new Error('artifact retention policy must declare managed_roots');
  }
  for (const managedRoot of policy.managed_roots)
    validateRelativePath(managedRoot, 'managed root');
  if (!Array.isArray(policy.classes) || policy.classes.length === 0) {
    throw new Error('artifact retention policy must declare classes');
  }
  const ids = new Set();
  for (const policyClass of policy.classes) {
    if (!policyClass.id || ids.has(policyClass.id))
      throw new Error(`duplicate or missing class id: ${policyClass.id ?? 'unknown'}`);
    ids.add(policyClass.id);
    if (!Array.isArray(policyClass.prefixes))
      throw new Error(`${policyClass.id}: prefixes must be an array`);
    for (const prefix of policyClass.prefixes)
      validateRelativePath(prefix, `${policyClass.id} prefix`);
    if (typeof policyClass.protected !== 'boolean')
      throw new Error(`${policyClass.id}: protected must be boolean`);
    if (!policy.acl_profiles?.[policyClass.acl_profile])
      throw new Error(`${policyClass.id}: acl_profile must reference a declared ACL profile`);
    if (
      policyClass.retention_days !== null &&
      (!Number.isInteger(policyClass.retention_days) || policyClass.retention_days < 0)
    ) {
      throw new Error(`${policyClass.id}: retention_days must be null or a non-negative integer`);
    }
    if (
      policyClass.quota_bytes !== null &&
      (!Number.isInteger(policyClass.quota_bytes) || policyClass.quota_bytes < 0)
    ) {
      throw new Error(`${policyClass.id}: quota_bytes must be null or a non-negative integer`);
    }
  }
  const unknownClass = policy.classes.find((item) => item.id === 'unknown');
  if (!ids.has('unknown'))
    throw new Error('artifact retention policy must declare the unknown class');
  if (unknownClass.protected !== true) throw new Error('unknown class must be protected');
  if (policy.protection_rules?.unknown_class_is_protected !== true) {
    throw new Error('unknown_class_is_protected must be true');
  }
  return policy;
}

export function loadPolicy(policyPath = defaultPolicyPath) {
  let source;
  try {
    source = readFileSync(policyPath, 'utf8');
  } catch {
    throw new Error('artifact retention policy could not be read');
  }
  try {
    return validatePolicy(JSON.parse(source));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error('artifact retention policy is not valid JSON');
    throw error;
  }
}

function classForPath(relativePath, policy) {
  const matches = [];
  for (const policyClass of policy.classes) {
    for (const prefix of policyClass.prefixes) {
      if (pathMatchesPrefix(relativePath, prefix)) matches.push({ policyClass, prefix });
    }
  }
  matches.sort((left, right) => right.prefix.length - left.prefix.length);
  return matches[0]?.policyClass ?? policy.classes.find((item) => item.id === 'unknown');
}

function protectedReason(relativePath, policyClass, policy) {
  const reasons = [];
  if (policyClass.protected) reasons.push(`class:${policyClass.id}`);
  const segments = relativePath.split('/');
  for (const segment of policy.protection_rules?.protected_path_segments ?? []) {
    if (segments.includes(segment)) reasons.push(`path-marker:${segment}`);
  }
  const fileName = basename(relativePath);
  for (const pattern of policy.protection_rules?.protected_file_patterns ?? []) {
    if (new RegExp(pattern, 'i').test(fileName)) reasons.push(`file-pattern:${pattern}`);
  }
  return [...new Set(reasons)];
}

function walkFiles(directory, scanRootPath) {
  const files = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch (error) {
      files.push({
        error: {
          kind: 'cannot-read',
          path: normalizeRelativePath(relative(scanRootPath, current)),
          code: error?.code ?? 'unknown'
        }
      });
      continue;
    }
    for (const entry of entries) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(path);
        continue;
      }
      if (entry.isSymbolicLink()) {
        files.push({ path, symlink: true });
        continue;
      }
      if (entry.isFile()) files.push({ path });
    }
  }
  return files;
}

function emptyClassSummary(policyClass) {
  return {
    id: policyClass.id,
    files: 0,
    bytes: 0,
    protected_files: 0,
    candidates: 0,
    candidate_bytes: 0,
    quota_bytes: policyClass.quota_bytes,
    quota_exceeded: false,
    retention_days: policyClass.retention_days,
    acl_profile: policyClass.acl_profile
  };
}

function addClassSummary(summaries, policyClass, record) {
  const summary = summaries.get(policyClass.id) ?? emptyClassSummary(policyClass);
  summary.files += 1;
  summary.bytes += record.size;
  if (record.protected) summary.protected_files += 1;
  summaries.set(policyClass.id, summary);
}

function formatDate(timestamp) {
  return new Date(timestamp).toISOString();
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  for (const unit of units) {
    value /= 1024;
    if (value < 1024 || unit === units.at(-1))
      return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
  }
  return `${bytes} B`;
}

function scanManagedRoot(rootDirPath, rootRelativePath, policy, nowMs) {
  const rootPath = resolve(rootDirPath, rootRelativePath);
  const rootSummary = {
    path: rootRelativePath,
    exists: existsSync(rootPath),
    files: 0,
    bytes: 0,
    oldest_mtime: null,
    newest_mtime: null,
    class_ids: [],
    errors: []
  };
  const records = [];
  if (!rootSummary.exists) return { rootSummary, records };

  let currentPath = rootDirPath;
  for (const segment of normalizeRelativePath(rootRelativePath).split('/')) {
    currentPath = resolve(currentPath, segment);
    try {
      if (lstatSync(currentPath).isSymbolicLink()) {
        rootSummary.errors.push(`managed-root-symlink:${normalizeRelativePath(rootRelativePath)}`);
        return { rootSummary, records };
      }
    } catch (error) {
      rootSummary.errors.push(
        `cannot-stat-managed-root:${normalizeRelativePath(rootRelativePath)}:${error?.code ?? 'unknown'}`
      );
      return { rootSummary, records };
    }
  }
  let canonicalManagedRoot;
  try {
    canonicalManagedRoot = realpathSync(rootPath);
  } catch (error) {
    rootSummary.errors.push(
      `cannot-resolve-managed-root:${normalizeRelativePath(rootRelativePath)}:${error?.code ?? 'unknown'}`
    );
    return { rootSummary, records };
  }
  if (!isWithin(rootDirPath, canonicalManagedRoot)) {
    rootSummary.errors.push(`managed-root-outside-scan-root:${normalizeRelativePath(rootRelativePath)}`);
    return { rootSummary, records };
  }

  for (const item of walkFiles(rootPath, rootDirPath)) {
    if (item.error) {
      rootSummary.errors.push(`${item.error.kind}:${item.error.path}:${item.error.code}`);
      continue;
    }
    const relativePath = normalizeRelativePath(relative(rootDirPath, item.path));
    const policyClass = classForPath(relativePath, policy);
    const protectionReasons = item.symlink
      ? ['symlink']
      : protectedReason(relativePath, policyClass, policy);
    let size = 0;
    let mtimeMs = 0;
    if (!item.symlink) {
      try {
        const stat = lstatSync(item.path);
        size = stat.size;
        mtimeMs = stat.mtimeMs;
      } catch (error) {
        rootSummary.errors.push(
          `cannot-stat:${relativePath}:${error?.code ?? 'unknown'}`
        );
        continue;
      }
    }
    const ageDays = mtimeMs > 0 ? Math.max(0, (nowMs - mtimeMs) / DAY_MS) : null;
    const expired =
      policyClass.retention_days !== null &&
      ageDays !== null &&
      ageDays > policyClass.retention_days;
    const record = {
      path: relativePath,
      size,
      mtime_ms: mtimeMs,
      mtime: mtimeMs > 0 ? formatDate(mtimeMs) : null,
      age_days: ageDays === null ? null : Number(ageDays.toFixed(3)),
      class_id: policyClass.id,
      acl_profile: policyClass.acl_profile,
      protected: protectionReasons.length > 0,
      protection_reasons: protectionReasons,
      expired,
      quota_selected: false
    };
    records.push(record);
    rootSummary.files += 1;
    rootSummary.bytes += size;
    if (mtimeMs > 0) {
      rootSummary.oldest_mtime =
        rootSummary.oldest_mtime === null
          ? formatDate(mtimeMs)
          : formatDate(Math.min(Date.parse(rootSummary.oldest_mtime), mtimeMs));
      rootSummary.newest_mtime =
        rootSummary.newest_mtime === null
          ? formatDate(mtimeMs)
          : formatDate(Math.max(Date.parse(rootSummary.newest_mtime), mtimeMs));
    }
    if (!rootSummary.class_ids.includes(policyClass.id)) rootSummary.class_ids.push(policyClass.id);
  }
  return { rootSummary, records };
}

function selectQuotaCandidates(records, policy) {
  const selected = new Set();
  const byClass = new Map();
  for (const record of records) {
    const policyClass = policy.classes.find((item) => item.id === record.class_id);
    const list = byClass.get(record.class_id) ?? { policyClass, records: [] };
    list.records.push(record);
    byClass.set(record.class_id, list);
  }
  for (const { policyClass, records: classRecords } of byClass.values()) {
    if (policyClass.quota_bytes === null) continue;
    const usage = classRecords.reduce((total, record) => total + record.size, 0);
    const excess = usage - policyClass.quota_bytes;
    if (excess <= 0) continue;
    let selectedBytes = 0;
    for (const record of classRecords
      .filter((item) => !item.protected)
      .sort((left, right) => left.mtime_ms - right.mtime_ms)) {
      selected.add(record.path);
      record.quota_selected = true;
      selectedBytes += record.size;
      if (selectedBytes >= excess) break;
    }
  }
  return selected;
}

export function buildDryRunReport({
  rootDir: scanRoot = rootDir,
  policy = loadPolicy(),
  policySource = 'repository-default',
  now = new Date(),
  maxCandidates = 200
} = {}) {
  validatePolicy(policy);
  if (!(now instanceof Date) || Number.isNaN(now.getTime()))
    throw new Error('now must be a valid Date');
  if (!Number.isInteger(maxCandidates) || maxCandidates < 0)
    throw new Error('maxCandidates must be a non-negative integer');
  const requestedRootPath = resolve(scanRoot);
  if (!existsSync(requestedRootPath)) throw new Error('scan root is unavailable');
  let scanRootPath;
  try {
    scanRootPath = realpathSync(requestedRootPath);
    if (!lstatSync(scanRootPath).isDirectory()) throw new Error('not a directory');
  } catch {
    throw new Error('scan root is unavailable');
  }
  const nowMs = now.getTime();
  const allRecords = [];
  const roots = [];
  for (const rootRelativePath of policy.managed_roots) {
    const result = scanManagedRoot(scanRootPath, rootRelativePath, policy, nowMs);
    roots.push(result.rootSummary);
    for (const record of result.records) allRecords.push(record);
  }
  selectQuotaCandidates(allRecords, policy);

  const classSummaries = new Map(
    policy.classes.map((policyClass) => [policyClass.id, emptyClassSummary(policyClass)])
  );
  for (const record of allRecords)
    addClassSummary(
      classSummaries,
      policy.classes.find((item) => item.id === record.class_id),
      record
    );
  const candidates = allRecords
    .filter((record) => !record.protected && (record.expired || record.quota_selected))
    .map((record) => ({
      ...record,
      reasons: [
        ...(record.expired
          ? [
              `expired:${policy.classes.find((item) => item.id === record.class_id).retention_days}d`
            ]
          : []),
        ...(record.quota_selected ? ['quota-excess'] : [])
      ]
    }))
    .sort((left, right) => left.mtime_ms - right.mtime_ms || left.path.localeCompare(right.path));
  for (const candidate of candidates) {
    const summary = classSummaries.get(candidate.class_id);
    summary.candidates += 1;
    summary.candidate_bytes += candidate.size;
  }
  for (const summary of classSummaries.values()) {
    summary.quota_exceeded = summary.quota_bytes !== null && summary.bytes > summary.quota_bytes;
  }

  const protectedRecords = allRecords.filter((record) => record.protected);
  return {
    schema_version: 1,
    mode: 'dry-run',
    generated_at: new Date(nowMs).toISOString(),
    root: '<scan-root>',
    policy: {
      owner: policy.owner,
      source: policySource,
      classes: policy.classes.map((policyClass) => ({
        id: policyClass.id,
        retention_days: policyClass.retention_days,
        quota_bytes: policyClass.quota_bytes,
        acl_profile: policyClass.acl_profile,
        protected: policyClass.protected
      }))
    },
    roots,
    classes: [...classSummaries.values()],
    totals: {
      files: allRecords.length,
      bytes: allRecords.reduce((total, record) => total + record.size, 0),
      protected_files: protectedRecords.length,
      candidates: candidates.length,
      candidate_bytes: candidates.reduce((total, candidate) => total + candidate.size, 0),
      errors: roots.reduce((total, root) => total + root.errors.length, 0)
    },
    protection: {
      deletion_applied: false,
      deletion_implementation: 'intentionally absent; this command is dry-run-only',
      protected_files_not_candidates: protectedRecords.every(
        (record) => !candidates.some((candidate) => candidate.path === record.path)
      ),
      authority_required: true,
      max_candidates_reported: Math.min(maxCandidates, candidates.length)
    },
    candidates: candidates.slice(0, maxCandidates)
  };
}

function parseArguments(argv) {
  const args = {
    dryRun: false,
    rootDir,
    policyPath: defaultPolicyPath,
    maxCandidates: 200,
    outputPath: null,
    now: new Date()
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') args.dryRun = true;
    else if (argument === '--root') args.rootDir = resolve(argv[++index] ?? '');
    else if (argument === '--policy') args.policyPath = resolve(argv[++index] ?? '');
    else if (argument === '--max-candidates') args.maxCandidates = Number(argv[++index]);
    else if (argument === '--now') args.now = new Date(argv[++index] ?? '');
    else if (argument === '--output') args.outputPath = resolve(argv[++index] ?? '');
    else throw new Error(`unknown argument: ${argument}`);
  }
  return args;
}

function resolveSafeOutputPath(rootDirectory, outputPath, policy) {
  let rootPath;
  try {
    rootPath = realpathSync(resolve(rootDirectory));
  } catch {
    throw new Error('--output root is unavailable');
  }
  const outputFile = resolve(outputPath);
  let outputParent;
  try {
    outputParent = realpathSync(dirname(outputFile));
  } catch {
    throw new Error('--output parent must already exist inside the scan root');
  }
  if (!isWithin(rootPath, outputParent))
    throw new Error('--output must resolve to a new file inside the scan root');

  const canonicalOutput = resolve(outputParent, basename(outputFile));
  const relativeOutput = normalizeRelativePath(relative(rootPath, canonicalOutput));
  if (!relativeOutput || relativeOutput === '.' || isAbsolute(relativeOutput))
    throw new Error('--output must name a file inside the scan root');
  if (policy.managed_roots.some((managedRoot) => pathMatchesPrefix(relativeOutput, managedRoot)))
    throw new Error('--output cannot be inside a managed root');
  try {
    lstatSync(canonicalOutput);
    throw new Error('--output refuses to overwrite an existing path');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      if (error instanceof Error && error.message === '--output refuses to overwrite an existing path')
        throw error;
      throw new Error('--output path could not be inspected safely');
    }
  }
  return canonicalOutput;
}

function printSummary(report) {
  console.log('Artifact retention dry-run (no deletion applied)');
  console.log(`Root: ${report.root}`);
  console.log(
    `Files: ${report.totals.files}; size: ${formatBytes(report.totals.bytes)}; protected: ${report.totals.protected_files}`
  );
  console.log(
    `Candidates: ${report.totals.candidates}; candidate size: ${formatBytes(report.totals.candidate_bytes)}; errors: ${report.totals.errors}`
  );
  for (const summary of report.classes.filter((item) => item.files > 0)) {
    const quota =
      summary.quota_bytes === null
        ? 'unbounded'
        : `${formatBytes(summary.quota_bytes)}${summary.quota_exceeded ? ' EXCEEDED' : ''}`;
    console.log(
      `- ${summary.id}: ${summary.files} files, ${formatBytes(summary.bytes)}, protected=${summary.protected_files}, candidates=${summary.candidates}, quota=${quota}, acl=${summary.acl_profile}`
    );
  }
  if (report.totals.candidates > report.candidates.length)
    console.log(
      `Candidate listing truncated at ${report.candidates.length}; totals remain complete.`
    );
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  if (!args.dryRun)
    throw new Error(
      'refusing to scan for deletion without explicit --dry-run; no apply mode exists'
    );
  const policy = loadPolicy(args.policyPath);
  const report = buildDryRunReport({
    rootDir: args.rootDir,
    policy,
    policySource:
      resolve(args.policyPath) === defaultPolicyPath ? 'repository-default' : 'custom-policy',
    now: args.now,
    maxCandidates: args.maxCandidates
  });
  if (args.outputPath) {
    const outputFile = resolveSafeOutputPath(args.rootDir, args.outputPath, policy);
    try {
      writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, {
        flag: 'wx',
        mode: 0o600
      });
    } catch {
      throw new Error('--output could not be created exclusively');
    }
  }
  printSummary(report);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ? resolve(process.argv[1]) : '').href) {
  try {
    runCli();
  } catch (error) {
    console.error(
      `Artifact retention dry-run failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}
