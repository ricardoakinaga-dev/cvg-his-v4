import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false
  });

  if (!options.allowFailure && result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  return result;
};

export function inspectModerateAuditResult(audit) {
  const status = audit?.status;
  const stdout = typeof audit?.stdout === 'string' ? audit.stdout.trim() : '';
  const terminated = Boolean(audit?.signal) || !Number.isInteger(status);

  if (terminated || (status !== 0 && !stdout)) {
    const failure = audit?.signal
      ? `terminated by signal ${audit.signal}`
      : Number.isInteger(status)
        ? `exited with code ${status}`
        : 'did not produce a usable exit status';
    return {
      ok: false,
      reason: `moderate dependency audit command ${failure}`,
      report: null,
      moderateAdvisories: []
    };
  }

  // pnpm can legitimately return a non-zero status with a valid JSON advisory
  // report. An empty non-zero result is different: it has no evidence that the
  // command reached the registry and therefore fails closed above.
  if (!stdout) {
    return {
      ok: true,
      reason: 'no moderate dependency advisory payload returned',
      report: null,
      moderateAdvisories: []
    };
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    // Do not echo stdout: audit payloads can contain registry-controlled text.
    return {
      ok: false,
      reason: 'moderate dependency audit returned invalid JSON',
      report: null,
      moderateAdvisories: []
    };
  }

  if (report === null || typeof report !== 'object' || Array.isArray(report)) {
    return {
      ok: false,
      reason: 'moderate dependency audit returned an invalid JSON object',
      report: null,
      moderateAdvisories: []
    };
  }

  if (!('metadata' in report) && !('advisories' in report) && !('vulnerabilities' in report)) {
    return {
      ok: false,
      reason: 'moderate dependency audit returned an invalid JSON object',
      report: null,
      moderateAdvisories: []
    };
  }

  const advisories = report.advisories;
  const moderateAdvisories =
    advisories && typeof advisories === 'object' && !Array.isArray(advisories)
      ? Object.values(advisories).filter((advisory) => advisory?.severity === 'moderate')
      : [];

  return {
    ok: true,
    reason: null,
    report,
    moderateAdvisories
  };
}

export function runSecurityAudit({
  runCommand = run,
  log = console.log,
  error = console.error
} = {}) {
  log('Running secret scan...');
  runCommand('pnpm', ['security:secrets']);

  log('Checking high and critical dependency advisories...');
  runCommand('pnpm', ['audit', '--audit-level=high']);

  log('Collecting moderate dependency advisory summary...');
  const audit = runCommand('pnpm', ['audit', '--audit-level=moderate', '--json'], {
    allowFailure: true,
    capture: true
  });
  const parsed = inspectModerateAuditResult(audit);

  if (!parsed.ok) {
    error(`[security-audit] ${parsed.reason}; failing closed.`);
    return 1;
  }

  if (!parsed.report) {
    log('No moderate dependency advisory payload returned.');
    return 0;
  }

  const vulnerabilities = parsed.report.metadata?.vulnerabilities ?? {};
  log(
    `Dependency audit summary: critical=${vulnerabilities.critical ?? 0}, high=${vulnerabilities.high ?? 0}, moderate=${vulnerabilities.moderate ?? 0}`
  );

  if (parsed.moderateAdvisories.length > 0) {
    log('Moderate advisories kept as tracked dependency debt:');
    for (const advisory of parsed.moderateAdvisories) {
      log(
        `- ${advisory.module_name ?? 'unknown package'}: ${advisory.title ?? 'untitled advisory'}`
      );
    }
  }

  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  process.exitCode = runSecurityAudit();
}
