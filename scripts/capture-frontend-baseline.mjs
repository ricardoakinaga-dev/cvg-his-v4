#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const root = process.cwd();
const outputPath = resolve(
  root,
  process.argv[2] ?? 'docs/frontend/implementation/frontend-baseline-2026-09-07.json'
);

const sourceRoots = [
  'apps/spa/src',
  'packages/design-system/src',
  'packages/design-system/stories',
  'packages/design-system/.storybook',
  'docs/frontend/assets'
];

const currentEvidence = [
  'docs/frontend/implementation/evidence/button-navigation-EcT9XZ/report.json',
  'docs/frontend/implementation/evidence/continuity-2btgiv/report.json',
  'docs/frontend/implementation/evidence/continuity-11pldJ/report.json',
  'docs/frontend/implementation/evidence/continuity-wCJGZ6/report.json',
  'docs/frontend/implementation/evidence/continuity-qW2Gvv/report.json',
  'docs/frontend/implementation/evidence/continuity-WiebZn/report.json',
  'docs/frontend/implementation/evidence/continuity-ohbW3A/report.json',
  'docs/frontend/implementation/evidence/continuity-udvwWj/report.json',
  'docs/frontend/implementation/evidence/continuity-4SjGml/report.json',
  'docs/frontend/implementation/evidence/continuity-v2XVM5/report.json',
  'docs/frontend/implementation/evidence/continuity-tQnwrY/report.json',
  'docs/frontend/implementation/evidence/continuity-ty2R5x/report.json',
  'docs/frontend/implementation/evidence/continuity-JOB4sv/report.json',
  'docs/frontend/implementation/evidence/continuity-5zoTvq/report.json',
  'docs/frontend/implementation/evidence/continuity-niDPip/report.json',
  'docs/frontend/implementation/evidence/cvg-pulse-tokens-OklWS0/report.json',
  'docs/frontend/implementation/evidence/login-assets-20260907.json',
  'docs/frontend/implementation/evidence/storybook-dsbutton-20260907/report.json',
  'docs/frontend/implementation/performance-lab-2026-09-07.json',
  'docs/frontend/implementation/task-baseline-2026-09-07.json'
];

function git(args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  }).trim();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function fileFingerprint(path) {
  const absolute = resolve(root, path);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return null;
  const buffer = readFileSync(absolute);
  return { path, bytes: buffer.length, sha256: sha256(buffer) };
}

function parseStatusLine(line) {
  const status = line.slice(0, 2);
  const rawPath = line.slice(3);
  const path = rawPath.includes(' -> ') ? rawPath.split(' -> ').at(-1) : rawPath;
  return { status, path };
}

function scoped(path) {
  return sourceRoots.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function readJson(path) {
  if (!existsSync(resolve(root, path))) return null;
  try {
    return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
  } catch (error) {
    return { parseError: error instanceof Error ? error.message : String(error) };
  }
}

function routeInventory() {
  const source = readFileSync(resolve(root, 'apps/spa/src/router/routes.ts'), 'utf8');
  const sourceHash = sha256(source);
  const code = `
    import { routes } from './apps/spa/src/router/routes.ts';
    const join = (parent, child) => {
      if (!child) return parent || '/';
      if (child.startsWith('/')) return child.replace(/\\/+$/, '') || '/';
      const prefix = parent && parent !== '/' ? parent.replace(/\\/+$/, '') : '';
      return (prefix + '/' + child).replace(/\\/{2,}/g, '/').replace(/\\/$/, '') || '/';
    };
    const rows = [];
    const visit = (items, parent = '') => {
      for (const item of items) {
        const path = join(parent, item.path ?? '');
        rows.push({
          path,
          name: item.name ?? null,
          aliases: (item.alias ?? []).map((alias) => join(parent, alias)),
          requiresAuth: item.meta?.requiresAuth !== false,
          title: item.meta?.title ?? null,
          component: typeof item.component === 'function' ? 'lazy-component' : null,
          hasRedirect: Boolean(item.redirect)
        });
        if (item.children) visit(item.children, path);
      }
    };
    visit(routes);
    process.stdout.write(JSON.stringify(rows));
  `;
  let rows;
  let runtimeError = null;
  try {
    rows = JSON.parse(execFileSync('pnpm', ['exec', 'tsx', '-e', code], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024
    }));
  } catch (error) {
    runtimeError = error instanceof Error ? error.message : String(error);
    rows = [...source.matchAll(/\\bpath:\\s*['\"]([^'\"]+)['\"]/g)].map((match) => ({
      path: match[1],
      name: null,
      aliases: [],
      requiresAuth: null,
      title: null,
      component: null,
      hasRedirect: false
    }));
  }
  return {
    source: 'apps/spa/src/router/routes.ts',
    sourceSha256: sourceHash,
    runtimeImport: runtimeError ? 'BLOCKED' : 'OBSERVED',
    runtimeError,
    routeCount: rows.length,
    authenticatedCount: rows.filter((row) => row.requiresAuth === true).length,
    publicCount: rows.filter((row) => row.requiresAuth === false).length,
    redirectCount: rows.filter((row) => row.hasRedirect).length,
    lazyComponentCount: rows.filter((row) => row.component === 'lazy-component').length,
    routes: rows
  };
}

function sourceInventory() {
  const tracked = git(['ls-files', ...sourceRoots]);
  const statusLines = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n')
    .filter(Boolean)
    .map(parseStatusLine);
  const baseline = readJson('docs/frontend/implementation/baseline.json');
  const baselineHashes = baseline?.files ?? {};
  const changed = statusLines
    .filter(({ path }) => scoped(path))
    .map(({ status, path }) => ({
      status,
      ...fileFingerprint(path),
      baselineSha256: baselineHashes[path] ?? null,
      baselineComparison: baselineHashes[path]
        ? baselineHashes[path] === fileFingerprint(path)?.sha256
          ? 'UNCHANGED_FROM_SNAPSHOT'
          : 'DRIFTED_FROM_SNAPSHOT'
        : 'NOT_IN_SNAPSHOT'
    }));
  const trackedFiles = tracked ? tracked.split('\n').filter(Boolean) : [];
  return {
    sourceRoots,
    trackedFiles,
    trackedFileCount: trackedFiles.length,
    changedSourceFiles: changed,
    changedSourceFileCount: changed.length,
    allWorktreeChanges: statusLines.length,
    worktreeStatusSha256: sha256(statusLines.map(({ status, path }) => `${status} ${path}`).join('\n')),
    baselineSnapshot: {
      path: 'docs/frontend/implementation/baseline.json',
      head: baseline?.head ?? null,
      fileCount: Object.keys(baselineHashes).length,
      role: 'historical comparison only; not a candidate identity'
    }
  };
}

function evidenceIndex() {
  return currentEvidence.map((path) => {
    const report = readJson(path);
    if (!report) return { path, status: 'MISSING' };
    if (report.parseError) return { path, status: 'INVALID', error: report.parseError };
    const rows = report.rows ?? report.browser?.rows ?? report.measurements ?? report.laboratory?.measurements ?? report.laboratory?.routeSummary ?? report.tasks ?? [];
    const failures = report.failures ?? report.errors ?? report.browser?.pageErrors ?? [];
    const viewports = new Set();
    const themes = new Set();
    for (const row of rows) {
      if (row.viewport) viewports.add(`${row.viewport.width}x${row.viewport.height}`);
      else if (row.width) viewports.add(`${row.width}x${row.height ?? 'unspecified'}`);
      if (row.theme) themes.add(row.theme);
    }
    return {
      path,
      status: report.evidenceStatus ?? 'OBSERVED',
      generatedAt: report.generatedAt ?? report.observedAt ?? null,
      rows: Array.isArray(rows) ? rows.length : null,
      failures: Array.isArray(failures) ? failures.length : null,
      inputsStable: report.inputsStable ?? null,
      viewports: [...viewports].sort(),
      themes: [...themes].sort(),
      harnessSha256: report.harnessSha256 ?? null,
      sourceFingerprint: report.harnessSha256 ?? report.build?.artifactInventory?.artifactFingerprintSha256 ?? null,
      artifactFingerprint: report.build?.artifactInventory?.artifactFingerprintSha256 ?? null
    };
  });
}

function assetInventory() {
  const manifest = readJson('docs/frontend/assets/manifest.json');
  const files = manifest?.files ?? [];
  return {
    manifest: 'docs/frontend/assets/manifest.json',
    scope: manifest?.scope ?? null,
    approval: manifest?.comfyui?.approval ?? null,
    declaredFileCount: files.length,
    declaredFiles: files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
    productIntegration: {
      status: 'CANDIDATE_BOUNDED',
      assets: [
        'apps/spa/public/art/cvg-pulse-orbit.webp',
        'apps/spa/public/art/cvg-pulse-orbit.mp4'
      ],
      evidence: 'docs/frontend/implementation/evidence/login-assets-20260907.json',
      note: 'The poster and loop are integrated only in the login identity stage; network budget, manual pause review and independent visual/product approval remain pending.'
    }
  };
}

const evidence = evidenceIndex();
const reportByPath = new Map(evidence.map((item) => [item.path, item]));
const reportStatus = (path) => reportByPath.get(path)?.status ?? 'MISSING';

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  goal: 'FEA-001 current candidate inventory and reconciliation; not global frontend acceptance',
  candidate: {
    head: git(['rev-parse', 'HEAD']),
    headAtCapture: git(['rev-parse', 'HEAD']),
    worktreeIdentity: 'dirty-worktree; HEAD alone is insufficient',
    captureScript: 'scripts/capture-frontend-baseline.mjs',
    captureScriptSha256: fileFingerprint('scripts/capture-frontend-baseline.mjs')?.sha256 ?? null
  },
  inventory: {
    routes: routeInventory(),
    source: sourceInventory(),
    contracts: {
      router: 'apps/spa/src/router/routes.ts + apps/spa/src/router/index.ts',
      navigation: 'apps/spa/src/navigation.ts + apps/spa/src/navigation-permissions.ts',
      dataServices: 'apps/spa/src/services/*.ts',
      designSystem: 'packages/design-system/src/vue/*.vue',
      routeCountMethod: 'runtime import through tsx; lazy components are not executed'
    },
    devicesAndThemes: {
      observedInCurrentEvidence: evidence
        .filter((item) => item.status === 'OBSERVED')
        .flatMap((item) => item.viewports.map((viewport) => ({ path: item.path, viewport, themes: item.themes }))),
      declaredNextChecks: ['320x844', '375x812', '390x844', '768x900', '1024x900', '1280x720', '1440x900', '200% zoom', 'touch device', 'screen reader']
    },
    states: {
      declared: ['loading', 'populated', 'empty', 'no-results', 'error', 'unavailable', 'forbidden', 'dirty', 'submitting', 'success', 'timeout', 'reduced-motion'],
      evidenceIndex: {
        listFeedback: ['docs/frontend/implementation/evidence/continuity-wD7rbf/report.json'],
        formsAndDirty: ['docs/frontend/implementation/evidence/continuity-2btgiv/report.json'],
        agendaDrawerAndFocus: ['docs/frontend/implementation/evidence/continuity-wCJGZ6/report.json'],
        pixLifecycle: ['docs/frontend/implementation/evidence/continuity-qW2Gvv/report.json'],
        cashReceiptReversal: ['docs/frontend/implementation/evidence/continuity-WiebZn/report.json'],
        inventorySelectionAndPurchaseDraft: ['docs/frontend/implementation/evidence/continuity-ohbW3A/report.json'],
        reportExecutionAndExport: ['docs/frontend/implementation/evidence/continuity-udvwWj/report.json'],
        accessControlGovernance: ['docs/frontend/implementation/evidence/continuity-4SjGml/report.json'],
        laboratoryContinuity: ['docs/frontend/implementation/evidence/continuity-v2XVM5/report.json'],
        accessibilityMatrix: ['docs/frontend/implementation/evidence/continuity-tQnwrY/report.json']
      },
      remaining: ['real backend/RLS failures', 'touch/virtual keyboard', '200% zoom', 'real screen reader', 'human UAT']
    },
    assets: assetInventory()
  },
  reproductions: [
    {
      id: 'FE-01',
      criterion: 'FEA-004',
      status: reportStatus('docs/frontend/implementation/evidence/button-navigation-EcT9XZ/report.json'),
      evidence: 'docs/frontend/implementation/evidence/button-navigation-EcT9XZ/report.json',
      note: 'Current bounded browser contract covers SPA history, modifiers, popup, external, download, disabled and submit; not all consumers.'
    },
    {
      id: 'FE-02',
      criterion: 'FEA-005',
      status: reportStatus('docs/frontend/implementation/evidence/continuity-Quith7/report.json'),
      evidence: 'docs/frontend/implementation/evidence/continuity-Quith7/report.json',
      note: 'Current bounded form protection evidence; durable drafts, touch, zoom, screen reader and UAT remain outside scope.'
    },
    {
      id: 'FE-03',
      criterion: 'FEA-006',
      status: 'OBSERVED_IN_UNIT_AND_BOUNDED_FLOW',
      evidence: ['apps/spa/src/composables/useListData.ts', 'apps/spa/src/pages/reception/__tests__/ReceptionGatewayPage.test.ts', 'docs/frontend/implementation/evidence/continuity-11pldJ/report.json'],
      note: 'Current evidence indexes concurrency and stale-response protections; every consumer and real service contract still require review.'
    }
  ],
  reconciliation: {
    confirmedCurrent: ['FE-01 bounded reproduction has current evidence', 'FE-02 bounded protection has current evidence', 'FE-03 bounded concurrency protection has current evidence', 'current source/worktree drift is fingerprinted'],
    notReproducedOrNotClaimed: ['historical visual findings are not automatically assigned to the current candidate', 'all 34 FEA are not globally accepted by this inventory'],
    missingOrBlocked: ['five-task human baseline with OP/participants', 'real backend/RLS/browser-to-database run', 'full cross-browser/manual accessibility review', 'product approval for visual-study integration']
  },
  evidence: evidence,
  limitations: [
    'Synthetic browser responses and local artifacts do not prove backend, RLS, persistence, provider, field performance or UAT.',
    'This report is an executable inventory and reconciliation record; it does not promote FEA-001 or any other FEA to DONE.',
    'The worktree contains unrelated user changes; scoped hashes are included for drift detection, not authorship attribution.'
  ]
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output: relative(root, outputPath),
  head: report.candidate.head,
  routeCount: report.inventory.routes.routeCount,
  trackedFrontendFiles: report.inventory.source.trackedFileCount,
  changedSourceFiles: report.inventory.source.changedSourceFileCount,
  evidenceReports: evidence.length,
  missingEvidence: evidence
    .filter((item) => item.status === 'MISSING' || item.status === 'INVALID')
    .map((item) => item.path),
  nonObservedEvidence: evidence
    .filter((item) => item.status !== 'OBSERVED' && item.status !== 'MISSING' && item.status !== 'INVALID')
    .map((item) => ({ path: item.path, status: item.status }))
}, null, 2));
