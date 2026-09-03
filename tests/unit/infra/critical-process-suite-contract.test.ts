import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  classifyProcessOutcome,
  isWindowsProcessTreeOwned,
  preserveFailureArtifact,
  readBoundedReportText,
  runOwnedProcess,
  sanitizeDiagnostic,
  terminateOwnedProcess
} from '../../../infra/scripts/critical-process-suite-runtime.mjs';
import {
  resolveCriticalTestDatabaseName,
  resolveCriticalTestDatabaseUrl,
  validateTestReport
} from '../../../infra/scripts/run-critical-process-suite.mjs';

const root = resolve(import.meta.dirname, '../../..');
const runner = readFileSync(resolve(root, 'infra/scripts/run-critical-process-suite.mjs'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const runtime = readFileSync(
  resolve(root, 'infra/scripts/critical-process-suite-runtime.mjs'),
  'utf8'
);
const setupProcessTest = readFileSync(
  resolve(root, 'tests/integration/process/setup-installation-to-session.test.ts'),
  'utf8'
);

describe('critical process proof execution contract', () => {
  it('fails the runner when a process test is skipped or hangs', () => {
    expect(runner).toContain('numPendingTests !== 0');
    expect(runner).toContain('numTodoTests !== 0');
    expect(runner).toContain('optionalCounters.numSkippedTests !== 0');
    expect(runner).toContain("assertion?.status === 'passed'");
    expect(runner).toContain('counters.numPassedTests !== counters.numTotalTests');
    expect(runner).toContain('--reporter=json');
    expect(runner).toContain('timeoutMs:');
  });

  it('uses asynchronous owned child execution with finite timeout and failure retention', () => {
    expect(runner).toContain("from './critical-process-suite-runtime.mjs'");
    expect(runner).toContain('await runOwnedProcess');
    expect(runner).toContain('preserveFailureArtifact');
    expect(runner).not.toContain('spawnSync');
    expect(runner).toContain('resolveRunnerTimeoutMs');
    expect(runtime).toContain('CRITICAL_PROCESS_TIMEOUT_MS');
    expect(runtime).toContain('abortSignal');
    expect(runtime).toContain('runnerError');
    expect(runner).toContain('const SIGNAL_EXIT_CODES');
    expect(runner).toContain('SIGTERM: 143');
    expect(runner).toContain("process.on('SIGINT'");
    expect(runner).toContain("process.on('SIGTERM'");
    expect(runner).toContain('CHILD_ENVIRONMENT_KEYS');
    expect(runner).toContain('await signalHandlers.waitForCleanup()');
    expect(runner).not.toContain('...process.env');
    expect(runtime).not.toContain("'taskkill'");
    expect(runtime).toContain('WINDOWS_TREE_CLEANUP_BUDGET_MS');
    expect(runtime).toContain('WINDOWS_FORCE_RESERVE_MS');
    expect(runtime).toContain('killWaitHandle');
    expect(runtime).toContain('helperClosed');
    expect(runtime).toContain('closed === true');
    expect(runtime).toContain('CVG_CRITICAL_TREE_OK:');
    expect(runtime).toContain('captureWindowsRootIdentity');
    expect(runtime).toContain('ownedWindowsRootIdentityPromises');
    expect(runtime).toContain('isWindowsProcessTreeOwned');
    expect(runtime).toContain('runWindowsIdentityTermination(identity, deadline)');
    expect(runtime).toContain('spawnOwnedProcess');
    expect(runtime).toContain('WINDOWS_POWERSHELL_PATH');
    expect(runtime).not.toMatch(/runWindowsHelper\(\s*'powershell\.exe'/);
    expect(runtime).toContain('windows-owned-process-supervisor.ps1');
    expect(runtime).toContain('windows-terminate-owned-process.ps1');
    expect(runtime).toContain('CVG_CRITICAL_SUPERVISOR_TARGET_ARGS_JSON');
    expect(runtime).toContain('CVG_CRITICAL_SUPERVISOR_IDENTITY_FILE');
    expect(runner).toContain('new AbortController()');
    expect(runner).toContain('abortSignal: signalHandlers.abortSignal');
    expect(runner).toContain('activeChildren.add(child)');
    expect(runner).toContain('cleanupComplete');
    expect(runner).toContain('connectionTimeoutMillis');
    expect(runner).toContain('query_timeout');
    expect(runner).toContain('statement_timeout');
    expect(runner).toContain('EPHEMERAL_DATABASE_CLOSE_TIMEOUT_MS');
    expect(runner).toContain('client.connection?.stream?.destroy()');
    expect(runner).toContain('Promise.race');
    expect(packageJson.scripts['security:secrets']).toContain('ps1');
    const supervisorScript = readFileSync(
      resolve(root, 'infra/scripts/windows-owned-process-supervisor.ps1'),
      'utf8'
    );
    expect(supervisorScript).toContain('PROC_THREAD_ATTRIBUTE_JOB_LIST');
    expect(supervisorScript).toContain('EXTENDED_STARTUPINFO_PRESENT');
    expect(supervisorScript).toContain('JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE');
    expect(supervisorScript).toContain('TerminateJobObject');
    expect(supervisorScript).toContain('return unchecked((int)exitCode);');
    expect(supervisorScript).not.toContain('exitCode == STILL_ACTIVE');
    const terminatorScript = readFileSync(
      resolve(root, 'infra/scripts/windows-terminate-owned-process.ps1'),
      'utf8'
    );
    expect(terminatorScript).toContain('OpenProcess');
    expect(terminatorScript).toContain('GetProcessTimes');
    expect(terminatorScript).toContain('TerminateProcess');
    expect(runtime).toContain('remainingMilliseconds(deadline)');
    expect(runtime).toContain('MAX_REPORT_INPUT_BYTES');
    expect(runtime).toContain('readSync');
    expect(runtime).toContain('MAX_REPORT_NODES');
    expect(runtime).toContain('sanitizeReportInPlace');
    expect(runtime).toContain('O_NOFOLLOW');
    expect(runtime).toContain('could not verify the opened transient report identity');
    expect(runtime).toContain('openedReport.dev !== report.reportStat.dev');
    expect(runtime).toContain('array of string arguments');
    expect(runtime).toContain('timeout cannot exceed');
    expect(runtime).toContain('removeEventListener.call');
    expect(runtime).toContain('refusing to read a symbolic-link report path');
    expect(runtime).toContain('refusing to rewrite a multiply-linked report file');
    expect(runner).toContain('sanitizeReportInPlace(reportPath, reportDirectory)');
    expect(runner).toContain('readBoundedReportText');
    expect(runner).toContain("'pnpm.cmd'");
    expect(runner).toContain('process.env.ComSpec ||');
    expect(runner).toContain('resolveCriticalTestDatabaseUrl');
    expect(runner).toContain('DATABASE_URL: databaseUrl');
    expect(runner).toContain('DATABASE_URL_TEST: databaseUrl');
    expect(runner).not.toContain("  'DATABASE_URL',");
    expect(runner).not.toContain("  'DATABASE_URL_TEST',");
    expect(runner).not.toContain("  'REDIS_URL',");
    expect(runner).toContain('removeArtifactDirectory(artifactDirectory, test.file)');
    expect(runner.indexOf('if (signalHandlers.receivedSignal)')).toBeLessThan(
      runner.indexOf('if (childExitCode !== 0)')
    );
    expect(runner).toContain('cleanupEphemeralTestDatabase');
    expect(runner).toContain('pg_terminate_backend');
    expect(runner).toContain('DROP DATABASE IF EXISTS');
  });

  it('classifies timeout, spawn, signal and exit outcomes distinctly', () => {
    expect(
      classifyProcessOutcome({
        status: null,
        signal: null,
        error: null,
        timedOut: true,
        interrupted: false
      })
    ).toMatchObject({ kind: 'timeout' });
    expect(
      classifyProcessOutcome({
        status: null,
        signal: null,
        error: Object.assign(new Error('missing command'), { code: 'ENOENT' }),
        timedOut: false,
        interrupted: false
      })
    ).toMatchObject({ kind: 'spawn_error', errorCode: 'ENOENT' });
    expect(
      classifyProcessOutcome({
        status: null,
        signal: 'SIGTERM',
        error: null,
        timedOut: false,
        interrupted: false
      })
    ).toMatchObject({ kind: 'signal', signal: 'SIGTERM' });
    expect(
      classifyProcessOutcome({
        status: 17,
        signal: null,
        error: null,
        timedOut: false,
        interrupted: false
      })
    ).toMatchObject({ kind: 'exit', status: 17 });
  });

  it('fails closed when a Windows process-tree root identity is reused', () => {
    const originalRoot = { pid: 4172, creationTime: '638921337000000000' };
    const reusedRoot = { pid: 4172, creationTime: '638921338000000000' };
    const descendant = { pid: 4173, creationTime: '638921338100000000' };

    expect(
      isWindowsProcessTreeOwned(
        { root: originalRoot, descendants: [descendant] },
        originalRoot,
        false
      )
    ).toBe(true);
    expect(
      isWindowsProcessTreeOwned(
        { root: reusedRoot, descendants: [descendant] },
        originalRoot,
        false
      )
    ).toBe(false);
    expect(
      isWindowsProcessTreeOwned({ root: null, descendants: [descendant] }, undefined, false)
    ).toBe(false);
    expect(
      isWindowsProcessTreeOwned({ root: null, descendants: [descendant] }, originalRoot, false)
    ).toBe(true);
    expect(
      isWindowsProcessTreeOwned({ root: null, descendants: [descendant] }, originalRoot, true)
    ).toBe(true);
    expect(isWindowsProcessTreeOwned({ root: null, descendants: [] }, originalRoot, true)).toBe(
      true
    );
    expect(
      isWindowsProcessTreeOwned({ root: originalRoot, descendants: [] }, originalRoot, true)
    ).toBe(true);
    expect(isWindowsProcessTreeOwned({ root: null, descendants: [] }, undefined, false)).toBe(true);
  });

  it('redacts credentials and caps diagnostics', () => {
    const diagnostic = sanitizeDiagnostic(
      'DATABASE_URL=postgres://runner:super-secret@localhost:5432/cvg\n' +
        'Authorization: Bearer token-value\n' +
        'MFA_SECRET_ENCRYPTION_KEY=raw-mfa-secret\n' +
        'ATTACHMENT_STORAGE_S3_ACCESS_KEY=raw-s3-secret\n' +
        'REDIS_URL=redis://runner:raw-redis-secret@localhost:6379/cvg\n' +
        'REDIS_EMPTY_USER=redis://:raw-empty-user-secret@localhost:6379/cvg\n' +
        'connectionString=raw-connection-string-secret\n' +
        'dsn=raw-dsn-secret\n' +
        'db_url=raw-db-url-secret\n' +
        'signingKey=raw-signing-key-secret\n' +
        'SUPABASE_SERVICE_ROLE_KEY=raw-service-role-secret\n' +
        'https://example.invalid/callback?access_token=raw-query-token&client_secret=raw-query-secret\n' +
        'config={password:"raw-nested-password", credentials:{access_token:"raw-nested-token"}}\n' +
        'PASSWORD=raw-exact-password\n' +
        'PRIVATE_KEY=raw-private-key\n' +
        'API_KEY=raw-api-key\n' +
        '--password separated-password\n' +
        '--access-token=separated-token\n' +
        'x'.repeat(20_000)
    );

    expect(diagnostic).not.toContain('super-secret');
    expect(diagnostic).not.toContain('token-value');
    expect(diagnostic).not.toContain('raw-mfa-secret');
    expect(diagnostic).not.toContain('raw-s3-secret');
    expect(diagnostic).not.toContain('raw-redis-secret');
    expect(diagnostic).not.toContain('raw-empty-user-secret');
    expect(diagnostic).not.toContain('raw-connection-string-secret');
    expect(diagnostic).not.toContain('raw-dsn-secret');
    expect(diagnostic).not.toContain('raw-db-url-secret');
    expect(diagnostic).not.toContain('raw-signing-key-secret');
    expect(diagnostic).not.toContain('raw-service-role-secret');
    expect(diagnostic).not.toContain('raw-query-token');
    expect(diagnostic).not.toContain('raw-query-secret');
    expect(diagnostic).not.toContain('raw-nested-password');
    expect(diagnostic).not.toContain('raw-nested-token');
    expect(diagnostic).not.toContain('raw-exact-password');
    expect(diagnostic).not.toContain('raw-private-key');
    expect(diagnostic).not.toContain('raw-api-key');
    expect(diagnostic).not.toContain('separated-password');
    expect(diagnostic).not.toContain('separated-token');
    expect(diagnostic.length).toBeLessThanOrEqual(4_000);
  });

  it('does not embed a database credential and does not inherit the parent environment by default', async () => {
    expect(runner).not.toContain('postgres:postgres@localhost:5433');
    expect(runtime).toContain('env = {}');

    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-env-boundary-'));
    const secretKey = 'CVG_RUNNER_INHERITED_SECRET_CONTRACT';
    const secretValue = 'must-not-cross-public-boundary';
    const previousValue = process.env[secretKey];
    process.env[secretKey] = secretValue;

    try {
      const running = runOwnedProcess({
        command: process.execPath,
        args: ['-e', `process.stdout.write(process.env.${secretKey} ?? 'missing')`],
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'environment-boundary-contract'
      });

      const outcome = await running;
      expect(outcome.kind).toBe('success');
      expect(outcome.stdout).toBe('missing');
      expect(outcome.stdout).not.toContain(secretValue);
    } finally {
      if (previousValue === undefined) delete process.env[secretKey];
      else process.env[secretKey] = previousValue;
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('accepts only a fully counted, target-bound Vitest report', async () => {
    const { mkdtempSync, readFileSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const reportDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-report-contract-'));
    const reportPath = join(reportDirectory, 'vitest.json');
    const testFile = 'tests/unit/infra/ci-contract.test.ts';
    const report = {
      numTotalTestSuites: 1,
      numPassedTestSuites: 1,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      success: true,
      testResults: [
        {
          name: resolve(testFile),
          status: 'passed',
          assertionResults: [{ title: 'proof', fullName: 'proof', status: 'passed' }]
        }
      ]
    };

    try {
      writeFileSync(reportPath, JSON.stringify(report));
      expect(() => validateTestReport(reportPath, testFile, reportDirectory)).not.toThrow();

      const reportWithAnUnboundSecondFile = {
        ...report,
        testResults: [
          ...report.testResults,
          {
            ...report.testResults[0],
            name: resolve('tests/unit/infra/another.test.ts')
          }
        ]
      };
      writeFileSync(reportPath, JSON.stringify(reportWithAnUnboundSecondFile));
      expect(() => validateTestReport(reportPath, testFile, reportDirectory)).toThrow(
        /exactly one executable test-file result/
      );

      const forgedReport = {
        ...report,
        numPassedTests: 0,
        testResults: [{ ...report.testResults[0], name: resolve('tests/unit/infra/other.test.ts') }]
      };
      writeFileSync(reportPath, JSON.stringify(forgedReport));
      expect(() => validateTestReport(reportPath, testFile, reportDirectory)).toThrow();
      expect(readFileSync(reportPath, 'utf8')).toContain('other.test.ts');
    } finally {
      rmSync(reportDirectory, { recursive: true, force: true });
    }
  });

  it('rejects symlink and hardlink report paths without changing the external file', async () => {
    if (process.platform === 'win32') return;

    const {
      linkSync,
      lstatSync,
      mkdtempSync,
      readFileSync,
      rmSync,
      symlinkSync,
      unlinkSync,
      writeFileSync
    } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const reportDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-report-links-'));
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-report-links-artifact-'));
    const externalPath = join(reportDirectory, '..', 'cvg-runner-external-report.json');
    const reportPath = join(reportDirectory, 'vitest.json');
    const hardlinkPath = join(reportDirectory, 'hardlinked-vitest.json');
    const rawReport = JSON.stringify({ password: 'external-secret' });

    try {
      writeFileSync(externalPath, rawReport);
      symlinkSync(externalPath, reportPath);
      expect(() =>
        preserveFailureArtifact({
          artifactDirectory,
          label: 'symlink-report-contract',
          command: 'pnpm',
          args: [],
          outcome: { kind: 'report_contract', status: 1 },
          elapsedMs: 1,
          reportPath,
          reportDirectory
        })
      ).toThrow(/symbolic-link/);
      expect(readFileSync(externalPath, 'utf8')).toBe(rawReport);
      expect(lstatSync(reportPath).isSymbolicLink()).toBe(true);

      unlinkSync(reportPath);
      linkSync(externalPath, hardlinkPath);
      expect(() => readBoundedReportText(hardlinkPath, reportDirectory)).toThrow(/multiply-linked/);
      expect(readFileSync(externalPath, 'utf8')).toBe(rawReport);
    } finally {
      rmSync(reportDirectory, { recursive: true, force: true });
      rmSync(artifactDirectory, { recursive: true, force: true });
      try {
        unlinkSync(externalPath);
      } catch {
        // The report directory cleanup may already have removed the fixture.
      }
    }
  });

  it('accepts only localhost PostgreSQL test databases', () => {
    expect(
      resolveCriticalTestDatabaseUrl('postgres://postgres:postgres@localhost:5433/cvg_his_v2_test')
    ).toBe('postgres://postgres:postgres@localhost:5433/cvg_his_v2_test');
    expect(
      resolveCriticalTestDatabaseUrl('postgres://runner:secret@127.0.0.1:5432/cvg_his_v2_test_ci')
    ).toContain('cvg_his_v2_test_ci');
    expect(
      resolveCriticalTestDatabaseUrl(
        'postgres://runner:secret@127.0.0.1:55433/cvg_his_v2_test_isolated'
      )
    ).toContain('cvg_his_v2_test_isolated');
    expect(() =>
      resolveCriticalTestDatabaseUrl('postgres://runner:secret@localhost:5433/cvg_his_v2')
    ).toThrow();
    expect(() =>
      resolveCriticalTestDatabaseUrl('postgres://runner:secret@db.internal:5433/cvg_his_v2_test')
    ).toThrow();
    expect(() =>
      resolveCriticalTestDatabaseUrl('mysql://runner:secret@localhost:5433/cvg_his_v2_test')
    ).toThrow();
  });

  it('derives only the owned ephemeral database name for each manifest entry', () => {
    expect(
      resolveCriticalTestDatabaseName(
        'postgres://runner:secret@localhost:5433/cvg_his_v2_test',
        'critical_process_123_abc_01_setup'
      )
    ).toBe('cvg_his_v2_test_critical_process_123_abc_01_setup');
    expect(
      resolveCriticalTestDatabaseName(
        'postgres://runner:secret@localhost:5433/cvg_his_v2_test_ci',
        'critical_process_123_abc_01_setup'
      )
    ).toBe('cvg_his_v2_test_ci_critical_process_123_abc_01_setup');
    expect(() =>
      resolveCriticalTestDatabaseName(
        'postgres://runner:secret@localhost:5433/cvg_his_v2',
        'critical_process_123_abc_01_setup'
      )
    ).toThrow();
    expect(() =>
      resolveCriticalTestDatabaseName('postgres://runner:secret@localhost:5433/cvg_his_v2_test', '')
    ).toThrow();
  });

  it('classifies a real spawn error and preserves its failure artifact', async () => {
    const { mkdtempSync, readFileSync, rmSync, existsSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-spawn-error-'));

    try {
      const outcome = await runOwnedProcess({
        command: '/definitely/missing/cvg-critical-process-command',
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'spawn-error-contract'
      });

      expect(outcome).toMatchObject({ kind: 'spawn_error', errorCode: 'ENOENT' });
      expect(existsSync(join(artifactDirectory, 'failure.json'))).toBe(true);
      expect(readFileSync(join(artifactDirectory, 'failure.json'), 'utf8')).toContain(
        'spawn-error-contract'
      );
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('classifies a real signal termination and preserves bounded diagnostics', async () => {
    if (process.platform === 'win32') return;

    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-signal-'));

    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', 'setInterval(() => {}, 1000)'],
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'signal-contract',
        onChildSpawn: (child) => {
          setTimeout(() => terminateOwnedProcess(child, 'SIGTERM'), 20);
        }
      });

      expect(outcome).toMatchObject({ kind: 'signal', signal: 'SIGTERM' });
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('classifies caller abort as interrupted and still cleans the owned process', async () => {
    if (process.platform === 'win32') return;

    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-abort-'));
    const controller = new AbortController();

    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', 'setInterval(() => {}, 1000)'],
        timeoutMs: 2_000,
        artifactDirectory,
        label: 'abort-contract',
        abortSignal: controller.signal,
        onChildSpawn: () => {
          setTimeout(() => controller.abort(), 20);
        }
      });

      expect(outcome).toMatchObject({ kind: 'interrupted', cleanupComplete: true });
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('returns a typed hook failure and reaps the owned descendants', async () => {
    if (process.platform === 'win32') return;

    const { existsSync, mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-hook-failure-'));
    const markerPath = join(artifactDirectory, 'hook-orphan-marker');

    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: [
          '-e',
          "setTimeout(() => require('node:fs').writeFileSync(process.env.RUNNER_HOOK_MARKER, 'orphan'), 300); setInterval(() => {}, 1000)"
        ],
        env: { RUNNER_HOOK_MARKER: markerPath },
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'hook-failure-contract',
        onChildSpawn: () => {
          throw new Error('spawn hook failed');
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(outcome).toMatchObject({ kind: 'runner_error', cleanupComplete: true });
      expect(outcome.errorMessage).toContain('spawn hook failed');
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('returns a typed abort-registration failure and reaps the child', async () => {
    if (process.platform === 'win32') return;

    const { existsSync, mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-abort-registration-'));
    const markerPath = join(artifactDirectory, 'abort-registration-orphan-marker');
    const abortSignal = {
      aborted: false,
      addEventListener() {
        throw new Error('abort listener registration failed');
      }
    };

    try {
      const result = await runOwnedProcess({
        command: process.execPath,
        args: [
          '-e',
          "setTimeout(() => require('node:fs').writeFileSync(process.env.RUNNER_ABORT_MARKER, 'orphan'), 300); setTimeout(() => process.exit(0), 900)"
        ],
        env: { RUNNER_ABORT_MARKER: markerPath },
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'abort-registration-contract',
        abortSignal
      })
        .then((outcome) => ({ outcome }))
        .catch((error) => ({ error }));

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(result).not.toHaveProperty('error');
      expect(result.outcome).toMatchObject({ kind: 'runner_error', cleanupComplete: true });
      expect(result.outcome.errorMessage).toContain('abort listener registration failed');
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('returns a typed abort-state access failure and reaps the child', async () => {
    if (process.platform === 'win32') return;

    const { existsSync, mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-abort-state-'));
    const markerPath = join(artifactDirectory, 'abort-state-orphan-marker');
    const abortSignal = {
      get aborted() {
        throw new Error('abort state access failed');
      },
      addEventListener() {
        throw new Error('listener must not be registered');
      }
    };

    try {
      const result = await runOwnedProcess({
        command: process.execPath,
        args: [
          '-e',
          "setTimeout(() => require('node:fs').writeFileSync(process.env.RUNNER_ABORT_MARKER, 'orphan'), 300); setTimeout(() => process.exit(0), 900)"
        ],
        env: { RUNNER_ABORT_MARKER: markerPath },
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'abort-state-contract',
        abortSignal
      })
        .then((outcome) => ({ outcome }))
        .catch((error) => ({ error }));

      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(result).not.toHaveProperty('error');
      expect(result.outcome).toMatchObject({ kind: 'runner_error', cleanupComplete: true });
      expect(result.outcome.errorMessage).toContain('abort state access failed');
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('sanitizes and replaces a raw Vitest report before artifact retention', async () => {
    const { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } =
      await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-report-'));
    const reportPath = join(artifactDirectory, 'vitest.json');
    writeFileSync(
      reportPath,
      JSON.stringify({
        success: false,
        error: 'DATABASE_URL=postgres://runner:raw-db-secret@localhost/db',
        authorization: 'Bearer raw-bearer-secret',
        password: 'raw-password',
        private_key: 'raw-private-key',
        access_key: 'raw-access-key',
        encryption_key: 'raw-encryption-key',
        redis_url: 'redis://runner:raw-redis-secret@localhost/db'
      })
    );

    try {
      const artifactPath = preserveFailureArtifact({
        artifactDirectory,
        label: 'report-contract',
        command: 'pnpm',
        args: [],
        outcome: {
          kind: 'report_contract',
          status: 1,
          signal: null,
          errorCode: null,
          errorMessage: 'report failed'
        },
        elapsedMs: 10,
        reportPath
      });

      const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
      const sanitizedReportPath = artifact.reportPath;
      const sanitizedReport = readFileSync(sanitizedReportPath, 'utf8');
      expect(sanitizedReport).not.toContain('raw-db-secret');
      expect(sanitizedReport).not.toContain('raw-bearer-secret');
      expect(sanitizedReport).not.toContain('raw-password');
      expect(sanitizedReport).not.toContain('raw-private-key');
      expect(sanitizedReport).not.toContain('raw-access-key');
      expect(sanitizedReport).not.toContain('raw-encryption-key');
      expect(sanitizedReport).not.toContain('raw-redis-secret');
      expect(existsSync(reportPath)).toBe(false);
      expect(sanitizedReportPath).toBe(join(artifactDirectory, 'failure-report.json'));
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('preserves a sanitized artifact when an owned child times out', async () => {
    const { mkdtempSync, readFileSync, rmSync, existsSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-contract-'));

    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', 'setTimeout(() => {}, 5_000)'],
        cwd: process.cwd(),
        env: { ...process.env, RUNNER_TEST_SECRET: 'not-for-artifacts' },
        timeoutMs: 50,
        artifactDirectory,
        label: 'timeout-contract'
      });

      expect(outcome).toMatchObject({ kind: 'timeout', cleanupComplete: true });
      expect(outcome.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(outcome.failureArtifactPath).toBe(join(artifactDirectory, 'failure.json'));
      expect(existsSync(join(artifactDirectory, 'failure.json'))).toBe(true);
      const artifact = readFileSync(join(artifactDirectory, 'failure.json'), 'utf8');
      expect(artifact).not.toContain('not-for-artifacts');
      expect(artifact).toContain('timeout-contract');
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('does not leak a credential split across diagnostic chunks', async () => {
    if (process.platform === 'win32') return;

    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-diagnostic-boundary-'));
    const secret = 'cross-boundary-secret';
    const firstChunk = `${'x'.repeat(4_090)}PASSWORD=`;
    const script = [
      `process.stdout.write(${JSON.stringify(firstChunk)});`,
      `setTimeout(() => process.stdout.write(${JSON.stringify(secret)}), 20);`,
      'setInterval(() => {}, 1000);'
    ].join(' ');

    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', script],
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'diagnostic-boundary-contract'
      });

      expect(outcome.kind).toBe('timeout');
      expect(outcome.stdout).not.toContain(secret);
      expect(outcome.stderr).not.toContain(secret);
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('bounds oversized report input before parsing and retention', async () => {
    const { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } =
      await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-report-limit-'));
    const reportPath = join(artifactDirectory, 'oversized-vitest.json');
    const rawSecret = 'raw-oversized-report-secret';
    writeFileSync(reportPath, `{"password":"${rawSecret}","padding":"${'x'.repeat(1_050_000)}"}`);

    try {
      const bounded = readBoundedReportText(reportPath);
      expect(bounded.truncated).toBe(true);
      expect(Buffer.byteLength(bounded.content, 'utf8')).toBe(1_000_000);

      const artifactPath = preserveFailureArtifact({
        artifactDirectory,
        label: 'report-limit-contract',
        command: 'pnpm',
        args: [],
        outcome: {
          kind: 'report_contract',
          status: 1,
          signal: null,
          errorCode: null,
          errorMessage: 'oversized report'
        },
        elapsedMs: 10,
        reportPath
      });
      const artifact = JSON.parse(readFileSync(artifactPath, 'utf8'));
      const sanitizedReport = readFileSync(artifact.reportPath, 'utf8');
      expect(sanitizedReport).toContain('input-truncated');
      expect(sanitizedReport).not.toContain(rawSecret);
      expect(Buffer.byteLength(sanitizedReport, 'utf8')).toBeLessThanOrEqual(1_000_000);
      expect(existsSync(reportPath)).toBe(false);
    } finally {
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('settles a typed finalization error when the failure artifact cannot be written', async () => {
    const { mkdtempSync, rmSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-finalization-'));
    const artifactPath = join(temporaryDirectory, 'artifact-file');
    writeFileSync(artifactPath, 'not a directory');

    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', 'setTimeout(() => {}, 5_000)'],
        timeoutMs: 50,
        artifactDirectory: artifactPath,
        label: 'finalization-error-contract'
      });

      expect(outcome).toMatchObject({ kind: 'runner_error' });
      expect(outcome.errorMessage).toContain('runner finalization failed');
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  });

  it('terminates descendants in the owned process group on timeout', async () => {
    if (process.platform === 'win32') return;

    const { mkdtempSync, rmSync, existsSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-descendant-'));
    const readyPath = join(artifactDirectory, 'descendant-ready');
    const markerPath = join(artifactDirectory, 'descendant-alive');
    let running;
    let settled = false;

    try {
      running = runOwnedProcess({
        command: process.execPath,
        args: [
          '-e',
          "const { spawn } = require('node:child_process'); spawn(process.execPath, ['-e', process.env.RUNNER_GRANDCHILD_SCRIPT], { stdio: 'ignore' }); setInterval(() => {}, 1000)"
        ],
        cwd: process.cwd(),
        env: {
          ...process.env,
          RUNNER_READY: readyPath,
          RUNNER_MARKER: markerPath,
          RUNNER_GRANDCHILD_SCRIPT:
            "const fs = require('node:fs'); fs.writeFileSync(process.env.RUNNER_READY, 'ready'); setTimeout(() => fs.writeFileSync(process.env.RUNNER_MARKER, 'alive'), 2500)"
        },
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'descendant-timeout-contract'
      });

      const readyDeadline = Date.now() + 500;
      while (!existsSync(readyPath) && Date.now() < readyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(existsSync(readyPath)).toBe(true);
      const outcome = await running;
      settled = true;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      expect(outcome).toMatchObject({ kind: 'timeout', cleanupComplete: true });
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      if (running && !settled) await running;
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('terminates descendants after an ordinary non-zero child exit', async () => {
    if (process.platform === 'win32') return;

    const { mkdtempSync, rmSync, existsSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const artifactDirectory = mkdtempSync(join(tmpdir(), 'cvg-runner-exit-descendant-'));
    const readyPath = join(artifactDirectory, 'descendant-ready');
    const markerPath = join(artifactDirectory, 'descendant-alive');
    let running;
    let settled = false;

    try {
      running = runOwnedProcess({
        command: process.execPath,
        args: [
          '-e',
          "const { spawn } = require('node:child_process'); const fs = require('node:fs'); spawn(process.execPath, ['-e', process.env.RUNNER_GRANDCHILD_SCRIPT], { stdio: 'ignore' }); const waitForReady = () => fs.existsSync(process.env.RUNNER_READY) ? setTimeout(() => process.exit(17), 50) : setTimeout(waitForReady, 10); waitForReady()"
        ],
        cwd: process.cwd(),
        env: {
          ...process.env,
          RUNNER_READY: readyPath,
          RUNNER_MARKER: markerPath,
          RUNNER_GRANDCHILD_SCRIPT:
            "const fs = require('node:fs'); fs.writeFileSync(process.env.RUNNER_READY, 'ready'); setTimeout(() => fs.writeFileSync(process.env.RUNNER_MARKER, 'alive'), 2500)"
        },
        timeoutMs: 2_000,
        artifactDirectory,
        label: 'exit-descendant-contract'
      });

      const readyDeadline = Date.now() + 500;
      while (!existsSync(readyPath) && Date.now() < readyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(existsSync(readyPath)).toBe(true);
      const outcome = await running;
      settled = true;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      expect(outcome).toMatchObject({ kind: 'exit', status: 17, cleanupComplete: true });
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      if (running && !settled) await running;
      rmSync(artifactDirectory, { recursive: true, force: true });
    }
  });

  it('does not silently skip the distributed setup proof in a required run', () => {
    expect(setupProcessTest).toContain("process.env.REQUIRE_TEST_DB === '1'");
    expect(setupProcessTest).toContain('!canRunDisposableDistributedFixture');
  });
});
