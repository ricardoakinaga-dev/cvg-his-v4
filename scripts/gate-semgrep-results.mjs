import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SEVERITY_ALIASES = new Map([
  ['ERROR', 'ERROR'],
  ['HIGH', 'ERROR'],
  ['CRITICAL', 'ERROR'],
  ['WARNING', 'WARNING'],
  ['WARN', 'WARNING'],
  ['MEDIUM', 'WARNING'],
  ['INFO', 'INFO'],
  ['NOTE', 'INFO'],
  ['LOW', 'INFO'],
  ['NONE', 'INFO'],
]);

function normalizeSeverity(value) {
  return SEVERITY_ALIASES.get(String(value ?? 'INFO').toUpperCase()) ?? 'INFO';
}

function parseJsonFinding(result) {
  return {
    ruleId: result.check_id ?? result.ruleId ?? 'unknown-rule',
    severity: normalizeSeverity(result.extra?.severity ?? result.severity),
    path: result.path ?? 'unknown-path',
    line: result.start?.line ?? null,
    message: result.extra?.message ?? result.message ?? '',
  };
}

function parseSarifFinding(result, ruleLevels) {
  const location = result.locations?.[0]?.physicalLocation;
  return {
    ruleId: result.ruleId ?? 'unknown-rule',
    severity: normalizeSeverity(result.level ?? ruleLevels.get(result.ruleId)),
    path: location?.artifactLocation?.uri ?? 'unknown-path',
    line: location?.region?.startLine ?? null,
    message: result.message?.text ?? result.message?.markdown ?? '',
  };
}

export function parseSemgrepReport(report) {
  if (Array.isArray(report?.results) && Array.isArray(report?.errors)) {
    return {
      format: 'semgrep-json',
      findings: report.results.map(parseJsonFinding),
      errors: report.errors.map((error) => ({
        type: error.type ?? 'SemgrepError',
        level: String(error.level ?? 'error').toLowerCase(),
        message: error.message ?? error.long_msg ?? String(error),
      })),
    };
  }

  if (report?.version === '2.1.0' && Array.isArray(report?.runs)) {
    const findings = [];
    const errors = [];
    for (const run of report.runs) {
      const ruleLevels = new Map(
        (run.tool?.driver?.rules ?? []).map((rule) => [
          rule.id,
          rule.defaultConfiguration?.level ?? 'note',
        ]),
      );
      findings.push(...(run.results ?? []).map((result) => parseSarifFinding(result, ruleLevels)));
      for (const invocation of run.invocations ?? []) {
        if (invocation.executionSuccessful === false) {
          errors.push({
            type: 'SARIFInvocationError',
            level: 'error',
            message: 'Scanner invocation was unsuccessful.',
          });
        }
        for (const notification of invocation.toolExecutionNotifications ?? []) {
          if (notification.level === 'error') {
            errors.push({
              type: notification.descriptor?.id ?? 'SARIFToolError',
              level: 'error',
              message: notification.message?.text ?? 'Scanner reported an error.',
            });
          }
        }
      }
    }
    return { format: 'sarif', findings, errors };
  }

  throw new Error('Input is not a Semgrep JSON or SARIF 2.1.0 report.');
}

export function evaluateSemgrepReport(parsedReport, failSeverities, scannerExitCode = 0) {
  const configured = [...new Set(failSeverities.map(normalizeSeverity))];
  const blocking = parsedReport.findings.filter((finding) => configured.includes(finding.severity));
  const fatalScannerErrors = parsedReport.errors.filter(
    (error) => !['warn', 'warning', 'note', 'info'].includes(String(error.level ?? 'error').toLowerCase()),
  );
  const scannerWarnings = parsedReport.errors.length - fatalScannerErrors.length;
  const scannerFailed = Number(scannerExitCode) !== 0;
  const status = blocking.length > 0 || fatalScannerErrors.length > 0 || scannerFailed ? 'FAIL' : 'PASS';

  return {
    status,
    format: parsedReport.format,
    failSeverities: configured,
    scannerExitCode: Number(scannerExitCode),
    scannerErrors: fatalScannerErrors.length,
    scannerWarnings,
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
    const key = argv[index];
    if (!key.startsWith('--')) continue;
    values.set(key.slice(2), argv[index + 1]);
    index += 1;
  }
  return values;
}

function writeGateReport(path, report) {
  if (!path) return;
  const absolutePath = resolve(path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
}

export function runCli(argv = process.argv.slice(2)) {
  const args = parseArguments(argv);
  const input = args.get('input');
  const reportPath = args.get('report');
  const failOn = (args.get('fail-on') ?? process.env.SEMGREP_FAIL_SEVERITIES ?? 'ERROR')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const scannerExitCode = Number(args.get('scanner-exit-code') ?? 0);

  try {
    if (!input) throw new Error('--input is required.');
    const parsed = parseSemgrepReport(JSON.parse(readFileSync(resolve(input), 'utf8')));
    const evaluation = evaluateSemgrepReport(parsed, failOn, scannerExitCode);
    writeGateReport(reportPath, { generatedAt: new Date().toISOString(), input, ...evaluation });
    console.log(
      `Semgrep gate ${evaluation.status}: ${evaluation.blockingFindings}/${evaluation.totalFindings} blocking findings; ${evaluation.scannerErrors} scanner errors.`,
    );
    return evaluation.status === 'PASS' ? 0 : 1;
  } catch (error) {
    const failure = {
      generatedAt: new Date().toISOString(),
      input: input ?? null,
      status: 'FAIL',
      reason: error instanceof Error ? error.message : String(error),
    };
    writeGateReport(reportPath, failure);
    console.error(`Semgrep gate FAIL: ${failure.reason}`);
    return 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(runCli());
}
