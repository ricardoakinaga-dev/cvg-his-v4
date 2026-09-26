#!/usr/bin/env node
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { countPhysicalLines } from './check-complexity-hotspots.mjs';

const root = process.cwd();
const manifestPath = resolve(root, 'docs/engineering/complexity-hotspots.json');
const outputDir =
  process.env.ARCHITECTURE_EVIDENCE_DIR ?? 'artifacts/consolidacao-2026-09-05/architecture';
// Historical measurements are included only where this execution actually
// measured the before state; null means no reduction claim is made.
const measuredBaseline = {
  'apps/spa/src/pages/patients/PatientDetailPage.vue': 4514,
  'apps/spa/src/pages/appointments/AppointmentsListPage.vue': 3120
};

export function buildArchitectureEvidence({
  rootDir = root,
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
} = {}) {
  const entries = (manifest.hotspots ?? []).map((hotspot) => {
    const absolute = resolveHotspotPath(rootDir, hotspot.path);
    const lines = existsSync(absolute) ? countPhysicalLines(readFileSync(absolute, 'utf8')) : null;
    const baseline = measuredBaseline[hotspot.path] ?? null;
    return {
      path: hotspot.path,
      owner: hotspot.owner,
      riskRank: hotspot.risk_rank ?? null,
      riskLevel: hotspot.risk_level ?? null,
      riskReason: hotspot.risk_reason ?? null,
      previousMaxLines: hotspot.previous_max_lines ?? null,
      maxLines: hotspot.max_lines,
      currentLines: lines,
      baselineLines: baseline,
      reductionLines: baseline === null || lines === null ? null : baseline - lines,
      headroomLines: lines === null ? null : hotspot.max_lines - lines,
      withinBudget: lines !== null && lines <= hotspot.max_lines,
      decompositionPlan: hotspot.decomposition_plan
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    measurement: manifest.measurement,
    discovery: manifest.discovery
      ? {
          thresholdLines: manifest.discovery.threshold_lines ?? null,
          roots: manifest.discovery.roots ?? [],
          extensions: manifest.discovery.extensions ?? [],
          ignoredDirectories: manifest.discovery.ignored_directories ?? []
        }
      : null,
    ownerRegistry: manifest.owner_registry ?? {},
    hotspotCount: entries.length,
    withinBudget: entries.filter((entry) => entry.withinBudget).length,
    entries,
    claims: [
      'Line-count evidence is a guardrail, not a proxy for behavior or maintainability.',
      'Only the two entries with measured historical baselines carry a reduction value.',
      'Remaining concentration is tracked with an owner, risk rank, non-growing budget and decomposition plan.'
    ]
  };
}

function isWithin(parentPath, childPath) {
  const pathFromParent = relative(parentPath, childPath);
  return (
    pathFromParent === '' ||
    (!isAbsolute(pathFromParent) &&
      pathFromParent !== '..' &&
      !pathFromParent.startsWith(`..${sep}`))
  );
}

function validateRelativePath(value, label) {
  if (typeof value !== 'string' || value.trim() === '')
    throw new Error(`${label} must be a non-empty repository-relative path`);
  const normalized = value.replace(/\\/g, '/');
  if (
    isAbsolute(value) ||
    normalized.startsWith('/') ||
    normalized.split('/').some((segment) => segment === '..' || segment === '')
  ) {
    throw new Error(`${label} must stay inside the repository`);
  }
  return normalized;
}

function resolveHotspotPath(rootDir, relativePath) {
  const normalized = validateRelativePath(relativePath, 'hotspot path');
  const canonicalRoot = realpathSync(resolve(rootDir));
  let currentPath = canonicalRoot;
  for (const segment of normalized.split('/')) {
    currentPath = resolve(currentPath, segment);
    try {
      if (lstatSync(currentPath).isSymbolicLink())
        throw new Error('hotspot path cannot traverse a symbolic link');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      return resolve(canonicalRoot, normalized);
    }
  }
  const canonicalPath = realpathSync(currentPath);
  if (!isWithin(canonicalRoot, canonicalPath))
    throw new Error('hotspot path must stay inside the repository');
  return canonicalPath;
}

export function writeArchitectureEvidence({
  rootDir = root,
  outputDir = 'artifacts/consolidacao-2026-09-05/architecture',
  fileName,
  report
} = {}) {
  const canonicalRoot = realpathSync(resolve(rootDir));
  const normalizedDirectory = validateRelativePath(outputDir, 'evidence output directory');
  const safeFileName = fileName ?? 'architecture-concentration.json';
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.json$/.test(safeFileName))
    throw new Error('evidence output file name is invalid');

  let currentDirectory = canonicalRoot;
  for (const segment of normalizedDirectory.split('/')) {
    currentDirectory = resolve(currentDirectory, segment);
    try {
      const stat = lstatSync(currentDirectory);
      if (stat.isSymbolicLink())
        throw new Error('evidence output directory cannot traverse a symbolic link');
      if (!stat.isDirectory())
        throw new Error('evidence output path must contain only directories');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      try {
        mkdirSync(currentDirectory);
      } catch {
        throw new Error('evidence output directory could not be created safely');
      }
    }
  }

  const canonicalDirectory = realpathSync(currentDirectory);
  if (!isWithin(canonicalRoot, canonicalDirectory))
    throw new Error('evidence output directory must stay inside the repository');
  const outputPath = resolve(canonicalDirectory, safeFileName);
  try {
    lstatSync(outputPath);
    throw new Error('evidence output refuses to overwrite an existing path');
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      if (
        error instanceof Error &&
        error.message === 'evidence output refuses to overwrite an existing path'
      )
        throw error;
      throw new Error('evidence output path could not be inspected safely');
    }
  }
  try {
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, {
      flag: 'wx',
      mode: 0o600
    });
  } catch {
    throw new Error('evidence output could not be created exclusively');
  }
  return relative(canonicalRoot, outputPath).split(sep).join('/');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(manifestPath)) throw new Error('complexity hotspot manifest is unavailable');
  const report = buildArchitectureEvidence();
  const timestamp = report.generatedAt.replace(/[:.]/g, '-');
  const outputPath = writeArchitectureEvidence({
    rootDir: root,
    outputDir,
    fileName: `architecture-concentration-${timestamp}.json`,
    report
  });
  console.log(
    `Architecture concentration evidence: ${report.withinBudget}/${report.hotspotCount} hotspots within budget.`
  );
  console.log(`Evidence file: ${outputPath}`);
  for (const entry of report.entries) {
    const reduction =
      entry.reductionLines === null
        ? 'unmeasured baseline'
        : `${entry.reductionLines >= 0 ? '-' : '+'}${Math.abs(entry.reductionLines)} lines`;
    console.log(
      `${entry.withinBudget ? 'PASS' : 'FAIL'}\t${entry.path}\t${entry.currentLines}/${entry.maxLines}\t${reduction}`
    );
  }
  if (report.withinBudget !== report.hotspotCount) process.exitCode = 1;
}
