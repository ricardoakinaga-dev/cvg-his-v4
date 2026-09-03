#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const resultsPath = resolve(rootDir, 'playwright-report/usability/results.json');
const auditPath = resolve(rootDir, 'tmp/master-usability-audit.json');
const discoveryPath = resolve(rootDir, 'tmp/playwright-discovery.txt');
const includeMasterAudit = process.env.E2E_INCLUDE_MASTER_AUDIT !== '0';

function gitOutput(...args) {
  try {
    return execFileSync('git', args, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function hasTrackedSourceChanges() {
  return gitOutput('status', '--porcelain', '--untracked-files=no')
    .split('\n')
    .filter(Boolean)
    .some((line) => !line.endsWith(' tmp/master-usability-audit.json'));
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function collectSpecs(suites, parents = [], output = []) {
  for (const suite of suites ?? []) {
    const path = suite.title ? [...parents, suite.title] : parents;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const lastResult = test.results?.at(-1);
        output.push({
          file: spec.file ?? suite.file ?? '',
          line: spec.line ?? suite.line ?? 0,
          title: [...path, spec.title].filter(Boolean).join(' > '),
          browser: test.projectName ?? test.projectId ?? 'unknown',
          status: test.status ?? lastResult?.status ?? 'unknown',
          retry: lastResult?.retry ?? 0,
          durationMs: lastResult?.duration ?? 0,
          errors: (lastResult?.errors ?? []).map((error) => error.message ?? String(error))
        });
      }
    }
    collectSpecs(suite.suites, path, output);
  }
  return output;
}

function inferRole(title) {
  const normalized = title.toLocaleLowerCase('pt-BR');
  if (normalized.includes('recepcion')) return 'receptionist';
  if (normalized.includes('patologist')) return 'pathologist';
  if (normalized.includes('ultrasson')) return 'ultrasonographer';
  if (normalized.includes('veterin')) return 'veterinarian';
  if (normalized.includes('admin')) return 'administrator';
  return 'unspecified';
}

const sha =
  process.env.GITHUB_SHA || process.env.E2E_SHA || gitOutput('rev-parse', 'HEAD') || 'unknown';
const browser = process.env.E2E_BROWSER ?? 'chromium';
const runId =
  process.env.E2E_EVIDENCE_RUN_ID ||
  new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const destination = resolve(rootDir, 'artifacts/playwright', sha, runId);
const results = await readJson(resultsPath);
const audit = includeMasterAudit ? await readJson(auditPath) : undefined;
const specs = collectSpecs(results?.suites);
const failures = specs
  .filter((spec) => spec.status !== 'expected')
  .map((spec) => ({ ...spec, role: inferRole(spec.title) }));
const routeRecords = (audit?.records ?? []).map((record) => ({
  sha,
  route: record.path,
  viewport: record.mode,
  role: 'administrator',
  browser,
  status: record.status,
  endpoints: (record.httpErrors ?? []).map((error) => error.url ?? error.endpoint ?? String(error)),
  correlationIds: (record.httpErrors ?? []).map((error) => error.correlationId).filter(Boolean),
  issues: record.issues ?? [],
  httpErrors: record.httpErrors ?? [],
  pageErrors: record.pageErrors ?? []
}));

const metadata = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sha,
  runId,
  environment: process.env.E2E_ENVIRONMENT ?? 'local-postgresql',
  browser,
  playwrightVersion: audit?.metadata?.playwrightVersion ?? 'unknown',
  browserVersion:
    browser === 'chromium' ? (audit?.metadata?.browserVersion ?? 'unknown') : 'unknown',
  locale: audit?.metadata?.locale ?? 'pt-BR',
  timezone: audit?.metadata?.timezone ?? 'America/Sao_Paulo',
  viewports: audit?.metadata?.viewports ?? {
    desktop: { width: 1280, height: 720 },
    mobile: { width: 390, height: 844 }
  },
  command:
    process.env.E2E_EVIDENCE_COMMAND ?? 'npx playwright test --config playwright-spa.config.ts',
  worktreeDirty: hasTrackedSourceChanges(),
  stats: results?.stats ?? null,
  masterAudit: audit
    ? { routeCount: audit.routeCount, navigationCount: audit.navigationCount }
    : null
};

await mkdir(destination, { recursive: true });
for (const source of [resultsPath, ...(includeMasterAudit ? [auditPath] : []), discoveryPath]) {
  try {
    await cp(source, resolve(destination, basename(source)));
  } catch {
    // Partial evidence is still useful after an early setup failure.
  }
}
for (const [source, name] of [
  [resolve(rootDir, 'playwright-report/usability'), 'html'],
  [resolve(rootDir, 'test-results'), 'test-results']
]) {
  try {
    await cp(source, resolve(destination, name), { recursive: true });
  } catch {
    // The metadata below records whatever was available.
  }
}

await Promise.all([
  writeFile(resolve(destination, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`),
  writeFile(
    resolve(destination, 'dashboard.json'),
    `${JSON.stringify({ metadata, failures, routes: routeRecords }, null, 2)}\n`
  )
]);

console.log(`Playwright evidence archived at ${destination}`);
