import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = resolve(root, process.env.SECURITY_EVIDENCE_DIR ?? 'artifacts/security');
mkdirSync(outputDir, { recursive: true });

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
}

function parseAudit(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const counts = parsed.metadata?.vulnerabilities ?? {};
    const total = ['critical', 'high', 'moderate', 'low', 'info'].reduce(
      (sum, severity) => sum + Number(counts[severity] ?? 0),
      0,
    );
    return { validJson: true, counts, total };
  } catch (error) {
    return {
      validJson: false,
      counts: {},
      total: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const startedAt = new Date().toISOString();
const audit = run('pnpm', ['audit', '--audit-level=low', '--json']);
const auditPath = join(outputDir, 'pnpm-audit.json');
const auditLogPath = join(outputDir, 'pnpm-audit.stderr.log');
writeFileSync(auditPath, audit.stdout || '{}\n');
writeFileSync(auditLogPath, audit.stderr ?? '');
const auditEvidence = parseAudit(audit.stdout ?? '');
const auditStatus = audit.status === 0 && auditEvidence.validJson && auditEvidence.total === 0 ? 'PASS' : 'FAIL';

const sbom = run('node', ['scripts/generate-cyclonedx-sbom.mjs']);
const sbomLogPath = join(outputDir, 'sbom-command.log');
writeFileSync(sbomLogPath, `${sbom.stdout ?? ''}${sbom.stderr ?? ''}`);
const sbomStatus = sbom.status === 0 ? 'PASS' : 'FAIL';

const report = {
  startedAt,
  completedAt: new Date().toISOString(),
  status: auditStatus === 'PASS' && sbomStatus === 'PASS' ? 'PASS' : 'FAIL',
  scope: ['pnpm-lock dependency audit', 'CycloneDX SBOM generation and validation'],
  semgrep: 'Evaluated independently by the SAST job from scanner JSON/SARIF.',
  imageScan: 'Evaluated independently by the image-scan job from Trivy JSON.',
  dependencyAudit: {
    status: auditStatus,
    exitCode: audit.status ?? 1,
    report: relative(root, auditPath),
    stderr: relative(root, auditLogPath),
    ...auditEvidence,
  },
  sbom: {
    status: sbomStatus,
    exitCode: sbom.status ?? 1,
    report: relative(root, join(outputDir, 'sbom.cyclonedx.json')),
    generationEvidence: relative(root, join(outputDir, 'sbom-generation.json')),
    log: relative(root, sbomLogPath),
  },
};

const reportPath = join(outputDir, 'security-evidence.json');
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  `Security evidence ${report.status}: dependency audit=${auditStatus}, CycloneDX SBOM=${sbomStatus}.`,
);
console.log(`Evidence: ${relative(root, reportPath)}`);

if (report.status !== 'PASS') process.exit(1);
