import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function normalizeSeverity(value) {
  return String(value ?? 'UNKNOWN').toUpperCase();
}

function normalizeFinding(kind, target, finding) {
  return {
    kind,
    id: finding.VulnerabilityID ?? finding.ID ?? finding.RuleID ?? 'unknown-finding',
    severity: normalizeSeverity(finding.Severity),
    target,
    title: finding.Title ?? finding.Description ?? '',
    package: finding.PkgName ?? null,
    installedVersion: finding.InstalledVersion ?? null,
    fixedVersion: finding.FixedVersion ?? null,
  };
}

export function parseTrivyReport(report) {
  if (!Array.isArray(report?.Results)) {
    throw new Error('Input is not a Trivy JSON report with a Results array.');
  }

  const findings = [];
  for (const result of report.Results) {
    const target = result.Target ?? report.ArtifactName ?? 'unknown-target';
    findings.push(
      ...(result.Vulnerabilities ?? []).map((finding) =>
        normalizeFinding('vulnerability', target, finding),
      ),
      ...(result.Misconfigurations ?? []).map((finding) =>
        normalizeFinding('misconfiguration', target, finding),
      ),
      ...(result.Secrets ?? []).map((finding) => normalizeFinding('secret', target, finding)),
    );
  }

  return {
    artifactName: report.ArtifactName ?? null,
    findings,
    errors: Array.isArray(report.Errors) ? report.Errors.map(String) : [],
  };
}

export function evaluateTrivyReport(parsedReport, failSeverities, scannerExitCode = 0) {
  const configured = [...new Set(failSeverities.map(normalizeSeverity))];
  const blocking = parsedReport.findings.filter((finding) => configured.includes(finding.severity));
  const status =
    blocking.length > 0 || parsedReport.errors.length > 0 || Number(scannerExitCode) !== 0
      ? 'FAIL'
      : 'PASS';
  return {
    status,
    artifactName: parsedReport.artifactName,
    failSeverities: configured,
    scannerExitCode: Number(scannerExitCode),
    scannerErrors: parsedReport.errors.length,
    totalFindings: parsedReport.findings.length,
    blockingFindings: blocking.length,
    counts: parsedReport.findings.reduce(
      (counts, finding) => ({ ...counts, [finding.severity]: (counts[finding.severity] ?? 0) + 1 }),
      {},
    ),
    errors: parsedReport.errors,
    findings: parsedReport.findings,
  };
}

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    values.set(argv[index].slice(2), argv[index + 1]);
    index += 1;
  }
  return values;
}

function writeReport(path, report) {
  if (!path) return;
  const absolutePath = resolve(path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const input = args.get('input');
  const reportPath = args.get('report');
  const failOn = (args.get('fail-on') ?? 'CRITICAL,HIGH')
    .split(',')
    .map((severity) => severity.trim())
    .filter(Boolean);

  try {
    if (!input) throw new Error('--input is required.');
    const parsed = parseTrivyReport(JSON.parse(readFileSync(resolve(input), 'utf8')));
    const evaluation = evaluateTrivyReport(
      parsed,
      failOn,
      Number(args.get('scanner-exit-code') ?? 0),
    );
    writeReport(reportPath, { generatedAt: new Date().toISOString(), input, ...evaluation });
    console.log(
      `Trivy gate ${evaluation.status}: ${evaluation.blockingFindings}/${evaluation.totalFindings} blocking findings; ${evaluation.scannerErrors} scanner errors.`,
    );
    return evaluation.status === 'PASS' ? 0 : 1;
  } catch (error) {
    const failure = {
      generatedAt: new Date().toISOString(),
      input: input ?? null,
      status: 'FAIL',
      reason: error instanceof Error ? error.message : String(error),
    };
    writeReport(reportPath, failure);
    console.error(`Trivy gate FAIL: ${failure.reason}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(runCli());
}
