#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { countPhysicalLines } from './check-complexity-hotspots.mjs';

const root = process.cwd();
const manifestPath = resolve(root, 'docs/engineering/complexity-hotspots.json');
const outputDir = process.env.ARCHITECTURE_EVIDENCE_DIR ?? 'artifacts/consolidacao-2026-09-05/architecture';
// Historical measurements are included only where this execution actually
// measured the before state; null means no reduction claim is made.
const measuredBaseline = {
  'apps/spa/src/pages/patients/PatientDetailPage.vue': 4514,
  'apps/spa/src/pages/appointments/AppointmentsListPage.vue': 3120
};

export function buildArchitectureEvidence({ rootDir = root, manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } = {}) {
  const entries = (manifest.hotspots ?? []).map((hotspot) => {
    const absolute = resolve(rootDir, hotspot.path);
    const lines = existsSync(absolute) ? countPhysicalLines(readFileSync(absolute, 'utf8')) : null;
    const baseline = measuredBaseline[hotspot.path] ?? null;
    return {
      path: hotspot.path,
      owner: hotspot.owner,
      maxLines: hotspot.max_lines,
      currentLines: lines,
      baselineLines: baseline,
      reductionLines: baseline === null || lines === null ? null : baseline - lines,
      withinBudget: lines !== null && lines <= hotspot.max_lines,
      decompositionPlan: hotspot.decomposition_plan
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    measurement: manifest.measurement,
    hotspotCount: entries.length,
    withinBudget: entries.filter((entry) => entry.withinBudget).length,
    entries,
    claims: [
      'Line-count evidence is a guardrail, not a proxy for behavior or maintainability.',
      'Only the two entries with measured historical baselines carry a reduction value.',
      'Remaining concentration is tracked with an owner and decomposition plan.'
    ]
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(manifestPath)) throw new Error(`missing ${manifestPath}`);
  const report = buildArchitectureEvidence();
  mkdirSync(join(root, outputDir), { recursive: true });
  writeFileSync(join(root, outputDir, 'architecture-concentration.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Architecture concentration evidence: ${report.withinBudget}/${report.hotspotCount} hotspots within budget.`);
  for (const entry of report.entries) {
    const reduction = entry.reductionLines === null ? 'unmeasured baseline' : `${entry.reductionLines >= 0 ? '-' : '+'}${Math.abs(entry.reductionLines)} lines`;
    console.log(`${entry.withinBudget ? 'PASS' : 'FAIL'}\t${entry.path}\t${entry.currentLines}/${entry.maxLines}\t${reduction}`);
  }
  if (report.withinBudget !== report.hotspotCount) process.exitCode = 1;
}
