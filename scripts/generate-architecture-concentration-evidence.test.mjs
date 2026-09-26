import assert from 'node:assert/strict';
import test from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildArchitectureEvidence,
  writeArchitectureEvidence
} from './generate-architecture-concentration-evidence.mjs';

test('reports only measured reductions and preserves unknown baselines', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-architecture-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'apps/spa/src/pages/patients'), { recursive: true });
  mkdirSync(join(root, 'apps/spa/src/pages/other'), { recursive: true });
  writeFileSync(join(root, 'apps/spa/src/pages/patients/PatientDetailPage.vue'), 'a\nb\n');
  writeFileSync(join(root, 'apps/spa/src/pages/other/Other.vue'), 'a\n');
  const report = buildArchitectureEvidence({
    rootDir: root,
    manifest: {
      measurement: 'physical_lines_including_blanks',
      discovery: {
        threshold_lines: 2000,
        roots: ['apps', 'scripts'],
        extensions: ['.ts', '.vue'],
        ignored_directories: ['dist']
      },
      owner_registry: { FE: 'Frontend ownership' },
      hotspots: [
        {
          path: 'apps/spa/src/pages/patients/PatientDetailPage.vue',
          owner: 'FE',
          risk_rank: 1,
          risk_level: 'HIGH',
          risk_reason: 'clinical',
          previous_max_lines: 5,
          max_lines: 4,
          decomposition_plan: 'extract'
        },
        {
          path: 'apps/spa/src/pages/other/Other.vue',
          owner: 'FE',
          risk_rank: 2,
          risk_level: 'MEDIUM',
          risk_reason: 'other',
          previous_max_lines: 2,
          max_lines: 2,
          decomposition_plan: 'extract'
        }
      ]
    }
  });
  assert.equal(report.withinBudget, 2);
  assert.equal(report.entries[0].reductionLines, 4512);
  assert.equal(report.entries[0].riskRank, 1);
  assert.equal(report.entries[0].headroomLines, 2);
  assert.equal(report.entries[0].previousMaxLines, 5);
  assert.equal(report.entries[1].reductionLines, null);
  assert.deepEqual(report.discovery, {
    thresholdLines: 2000,
    roots: ['apps', 'scripts'],
    extensions: ['.ts', '.vue'],
    ignoredDirectories: ['dist']
  });
  assert.equal(report.ownerRegistry.FE, 'Frontend ownership');
  assert.equal(JSON.stringify(report).includes(root), false);
});

test('evidence output stays in-repository and never overwrites an existing file', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-architecture-output-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const report = { generatedAt: '2026-09-23T00:00:00.000Z', entries: [] };

  assert.throws(
    () =>
      writeArchitectureEvidence({
        rootDir: root,
        outputDir: '../outside',
        fileName: 'report.json',
        report
      }),
    /inside the repository/
  );
  assert.equal(existsSync(resolve(root, '..', `${basename(root)}-outside`)), false);

  mkdirSync(join(root, 'artifacts'), { recursive: true });
  const existing = join(root, 'artifacts', 'report.json');
  writeFileSync(existing, 'keep this file\n');
  assert.throws(
    () =>
      writeArchitectureEvidence({
        rootDir: root,
        outputDir: 'artifacts',
        fileName: 'report.json',
        report
      }),
    /refuses to overwrite/
  );
  assert.equal(readFileSync(existing, 'utf8'), 'keep this file\n');
});

test('evidence output does not follow a symlink outside the repository', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-architecture-symlink-root-'));
  const outside = mkdtempSync(join(tmpdir(), 'cvg-architecture-symlink-outside-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  symlinkSync(outside, join(root, 'artifacts'), 'dir');

  assert.throws(
    () =>
      writeArchitectureEvidence({
        rootDir: root,
        outputDir: 'artifacts',
        fileName: 'report.json',
        report: { entries: [] }
      }),
    /symbolic link/
  );
  assert.equal(existsSync(join(outside, 'report.json')), false);
});

test('hotspot paths cannot read outside the repository or through symlinks', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-architecture-hotspot-root-'));
  const outside = mkdtempSync(join(tmpdir(), 'cvg-architecture-hotspot-outside-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  t.after(() => rmSync(outside, { recursive: true, force: true }));

  assert.throws(
    () =>
      buildArchitectureEvidence({
        rootDir: root,
        manifest: {
          measurement: 'physical_lines_including_blanks',
          hotspots: [
            {
              path: '../outside.txt',
              owner: 'FE',
              max_lines: 1,
              decomposition_plan: 'extract'
            }
          ]
        }
      }),
    /inside the repository/
  );

  writeFileSync(join(outside, 'secret.txt'), 'synthetic external file\n');
  symlinkSync(outside, join(root, 'linked'), 'dir');
  assert.throws(
    () =>
      buildArchitectureEvidence({
        rootDir: root,
        manifest: {
          measurement: 'physical_lines_including_blanks',
          hotspots: [
            {
              path: 'linked/secret.txt',
              owner: 'FE',
              max_lines: 1,
              decomposition_plan: 'extract'
            }
          ]
        }
      }),
    /symbolic link/
  );
});
