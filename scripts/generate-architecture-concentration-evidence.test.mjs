import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildArchitectureEvidence } from './generate-architecture-concentration-evidence.mjs';

test('reports only measured reductions and preserves unknown baselines', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-architecture-'));
  mkdirSync(join(root, 'apps/spa/src/pages/patients'), { recursive: true });
  mkdirSync(join(root, 'apps/spa/src/pages/other'), { recursive: true });
  writeFileSync(join(root, 'apps/spa/src/pages/patients/PatientDetailPage.vue'), 'a\nb\n');
  writeFileSync(join(root, 'apps/spa/src/pages/other/Other.vue'), 'a\n');
  const report = buildArchitectureEvidence({ rootDir: root, manifest: {
    measurement: 'physical_lines_including_blanks',
    hotspots: [
      { path: 'apps/spa/src/pages/patients/PatientDetailPage.vue', owner: 'FE', max_lines: 4, decomposition_plan: 'extract' },
      { path: 'apps/spa/src/pages/other/Other.vue', owner: 'FE', max_lines: 2, decomposition_plan: 'extract' }
    ]
  }});
  assert.equal(report.withinBudget, 2);
  assert.equal(report.entries[0].reductionLines, 4512);
  assert.equal(report.entries[1].reductionLines, null);
});
