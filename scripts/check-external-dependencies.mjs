#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const defaultManifestPath = resolve(root, 'docs/engineering/external-dependency-readiness.json');
const placeholder = /^(?:|n\/?a|none|todo|pending|tbd|unknown|sem evid[eê]ncia|-|<[^>]+>)$/i;

export function evaluateExternalDependencies({ manifest, environment = process.env } = {}) {
  const dependencies = manifest?.dependencies ?? [];
  return dependencies.map((dependency) => {
    const raw = typeof environment[dependency.evidenceEnv] === 'string' ? environment[dependency.evidenceEnv].trim() : '';
    const available = Boolean(raw) && !placeholder.test(raw);
    return {
      ...dependency,
      status: available ? 'READY_FOR_REVIEW' : 'BLOCKED',
      evidence: available ? raw : 'evidence_not_provided',
      action: available ? 'Validar evidência no ambiente autorizado e registrar aceite.' : dependency.nextAction
    };
  });
}

export function runExternalDependencyCheck({ manifestPath = defaultManifestPath, environment = process.env, outputDir = process.env.EXTERNAL_DEPENDENCY_EVIDENCE_DIR ?? 'artifacts/consolidacao-2026-09-05/external-dependencies', strict = process.argv.includes('--strict') || process.env.CVG_EXTERNAL_STRICT === '1' } = {}) {
  if (!existsSync(manifestPath)) throw new Error(`external dependency manifest not found: ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.schema_version !== 1) throw new Error('external dependency manifest schema_version must be 1');
  const checks = evaluateExternalDependencies({ manifest, environment });
  const blocked = checks.filter((item) => item.status === 'BLOCKED');
  const report = { generatedAt: new Date().toISOString(), mode: strict ? 'strict' : 'advisory', readyForReview: checks.length - blocked.length, blocked: blocked.length, checks };
  mkdirSync(join(root, outputDir), { recursive: true });
  writeFileSync(join(root, outputDir, 'external-dependency-readiness.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ? resolve(process.argv[1]) : '').href) {
  try {
    const report = runExternalDependencyCheck();
    console.log(`External dependency readiness: ${report.readyForReview}/${report.checks.length} ready; ${report.blocked} blocked (${report.mode}).`);
    for (const check of report.checks) console.log(`${check.status}\t${check.id}\t${check.ticket}\t${check.owner}\t${check.action}`);
    if (process.argv.includes('--strict') && report.blocked > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
