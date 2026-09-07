import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  retainSuccessfulTestReport,
  validateTestReport
} from '../infra/scripts/run-critical-process-suite.mjs';

const TEST_FILE = 'tests/unit/infra/critical-process-suite-contract.test.ts';
const WRONG_TEST_FILE = 'tests/unit/infra/not-the-contract.test.ts';
const REPORT_COUNTERS = [
  'numTotalTestSuites',
  'numPassedTestSuites',
  'numFailedTestSuites',
  'numPendingTestSuites',
  'numTotalTests',
  'numPassedTests',
  'numFailedTests',
  'numPendingTests',
  'numTodoTests',
  'numSkippedTests',
  'numTodoTestSuites',
  'numSkippedTestSuites'
];

function fixtureVitest(testFile = TEST_FILE, overrides = {}) {
  return {
    numTotalTestSuites: 1,
    numPassedTestSuites: 1,
    numFailedTestSuites: 0,
    numPendingTestSuites: 0,
    numTotalTests: 2,
    numPassedTests: 2,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numSkippedTests: 0,
    numTodoTestSuites: 0,
    numSkippedTestSuites: 0,
    success: true,
    testResults: [
      {
        name: resolve(testFile),
        status: 'passed',
        assertionResults: [
          { title: 'retains the report', fullName: 'retains the report', status: 'passed' },
          { title: 'revalidates the report', fullName: 'revalidates the report', status: 'passed' }
        ]
      }
    ],
    ...overrides
  };
}

function privateMode(path) {
  return statSync(path).mode & 0o777;
}

function createSandbox(prefix) {
  const root = mkdtempSync(join(realpathSync(tmpdir()), prefix));
  const reportDirectory = join(root, 'source');
  const artifactDirectory = join(root, 'artifact');
  const outsideDirectory = join(root, 'outside');

  for (const directory of [reportDirectory, artifactDirectory, outsideDirectory]) {
    mkdirSync(directory, { mode: 0o700 });
    chmodSync(directory, 0o700);
  }

  return { root, reportDirectory, artifactDirectory, outsideDirectory };
}

function writePrivateReport(reportDirectory, report) {
  const reportPath = join(reportDirectory, 'vitest.json');
  writeFileSync(reportPath, `${JSON.stringify(report)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600
  });
  chmodSync(reportPath, 0o600);
  return reportPath;
}

function withSandbox(prefix, callback) {
  const sandbox = createSandbox(prefix);
  try {
    return callback(sandbox);
  } finally {
    rmSync(sandbox.root, { recursive: true, force: true });
  }
}

test(
  'retains a valid sanitized Vitest report, preserves counters, and revalidates the artifact',
  { skip: process.platform !== 'linux' },
  () => {
    withSandbox('cvg-success-report-valid-', ({ reportDirectory, artifactDirectory }) => {
      const urlPassword = 'r05-url-password-value';
      const accessToken = 'r05-access-token-value';
      const clientSecret = 'r05-client-secret-value';
      const report = fixtureVitest(TEST_FILE, {
        diagnostic: `callback=https://runner:${urlPassword}@example.invalid/callback?access_token=${accessToken}&client_secret=${clientSecret}`
      });
      const reportPath = writePrivateReport(reportDirectory, report);

      assert.equal(privateMode(reportPath), 0o600);
      assert.equal(privateMode(artifactDirectory), 0o700);
      assert.equal(realpathSync(artifactDirectory), artifactDirectory);

      const artifactPath = retainSuccessfulTestReport(
        reportPath,
        TEST_FILE,
        reportDirectory,
        artifactDirectory
      );

      assert.equal(artifactPath, join(artifactDirectory, 'success-report.json'));
      assert.equal(privateMode(artifactPath), 0o600);

      const sourceBytes = readFileSync(reportPath);
      const artifactBytes = readFileSync(artifactPath);
      assert.deepEqual(artifactBytes, sourceBytes);
      assert.deepEqual(
        Buffer.from(validateTestReport(artifactPath, TEST_FILE, artifactDirectory)),
        artifactBytes
      );

      const retained = JSON.parse(artifactBytes);
      for (const counter of REPORT_COUNTERS) assert.equal(retained[counter], report[counter]);
      assert.equal(retained.success, true);
      assert.deepEqual(retained.testResults, report.testResults);
      assert.match(retained.diagnostic, /\[REDACTED\]/);
      for (const secret of [urlPassword, accessToken, clientSecret]) {
        assert.equal(sourceBytes.toString('utf8').includes(secret), false);
        assert.equal(artifactBytes.toString('utf8').includes(secret), false);
      }
    });
  }
);

test(
  'does not create a success artifact for pending, failed, or wrong-identity reports',
  { skip: process.platform !== 'linux' },
  () => {
    const cases = [
      [
        'pending',
        fixtureVitest(TEST_FILE, {
          numPassedTests: 1,
          numPendingTests: 1,
          testResults: [
            {
              name: resolve(TEST_FILE),
              status: 'passed',
              assertionResults: [
                { title: 'only one ran', fullName: 'only one ran', status: 'passed' }
              ]
            }
          ]
        })
      ],
      [
        'failed',
        fixtureVitest(TEST_FILE, {
          success: false,
          numPassedTests: 1,
          numFailedTests: 1,
          testResults: [
            {
              name: resolve(TEST_FILE),
              status: 'failed',
              assertionResults: [
                { title: 'failed proof', fullName: 'failed proof', status: 'failed' }
              ]
            }
          ]
        })
      ],
      [
        'wrong identity',
        fixtureVitest(TEST_FILE, {
          testResults: [
            {
              name: resolve(WRONG_TEST_FILE),
              status: 'passed',
              assertionResults: [
                { title: 'wrong file', fullName: 'wrong file', status: 'passed' },
                { title: 'wrong file again', fullName: 'wrong file again', status: 'passed' }
              ]
            }
          ]
        })
      ]
    ];

    for (const [label, report] of cases) {
      withSandbox(`cvg-success-report-${label.replaceAll(' ', '-')}-`, (sandbox) => {
        const reportPath = writePrivateReport(sandbox.reportDirectory, report);
        const outsidePath = join(sandbox.outsideDirectory, 'outside.txt');
        const outsideBytes = Buffer.from(`outside-${label}`);
        writeFileSync(outsidePath, outsideBytes, { mode: 0o600, flag: 'wx' });

        assert.throws(() => {
          retainSuccessfulTestReport(
            reportPath,
            TEST_FILE,
            sandbox.reportDirectory,
            sandbox.artifactDirectory
          );
        });
        assert.equal(existsSync(join(sandbox.artifactDirectory, 'success-report.json')), false);
        assert.deepEqual(readFileSync(outsidePath), outsideBytes);
        assert.equal(privateMode(reportPath), 0o600);
      });
    }
  }
);

test(
  'rejects overwrite and target symlink attacks without changing outside files',
  { skip: process.platform !== 'linux' },
  () => {
    withSandbox('cvg-success-report-overwrite-', (sandbox) => {
      const reportPath = writePrivateReport(
        sandbox.reportDirectory,
        fixtureVitest(TEST_FILE)
      );
      const outsidePath = join(sandbox.outsideDirectory, 'overwrite-outside.txt');
      const outsideBytes = Buffer.from('overwrite-outside-sentinel');
      writeFileSync(outsidePath, outsideBytes, { mode: 0o600, flag: 'wx' });

      const artifactPath = retainSuccessfulTestReport(
        reportPath,
        TEST_FILE,
        sandbox.reportDirectory,
        sandbox.artifactDirectory
      );
      const retainedBytes = readFileSync(artifactPath);

      assert.throws(
        () =>
          retainSuccessfulTestReport(
            reportPath,
            TEST_FILE,
            sandbox.reportDirectory,
            sandbox.artifactDirectory
          ),
        (error) => error?.code === 'EEXIST'
      );
      assert.deepEqual(readFileSync(artifactPath), retainedBytes);
      assert.deepEqual(readFileSync(outsidePath), outsideBytes);
    });

    withSandbox('cvg-success-report-symlink-file-', (sandbox) => {
      const reportPath = writePrivateReport(
        sandbox.reportDirectory,
        fixtureVitest(TEST_FILE)
      );
      const outsidePath = join(sandbox.outsideDirectory, 'file-target.txt');
      const outsideBytes = Buffer.from('file-target-sentinel');
      writeFileSync(outsidePath, outsideBytes, { mode: 0o600, flag: 'wx' });
      const artifactPath = join(sandbox.artifactDirectory, 'success-report.json');
      symlinkSync(outsidePath, artifactPath);

      assert.throws(() => {
        retainSuccessfulTestReport(
          reportPath,
          TEST_FILE,
          sandbox.reportDirectory,
          sandbox.artifactDirectory
        );
      });
      assert.equal(lstatSync(artifactPath).isSymbolicLink(), true);
      assert.deepEqual(readFileSync(outsidePath), outsideBytes);
    });

    withSandbox('cvg-success-report-symlink-dir-', (sandbox) => {
      const reportPath = writePrivateReport(
        sandbox.reportDirectory,
        fixtureVitest(TEST_FILE)
      );
      const outsideArtifact = join(sandbox.outsideDirectory, 'linked-artifact');
      mkdirSync(outsideArtifact, { mode: 0o700 });
      chmodSync(outsideArtifact, 0o700);
      const outsidePath = join(outsideArtifact, 'outside.txt');
      const outsideBytes = Buffer.from('symlink-directory-sentinel');
      writeFileSync(outsidePath, outsideBytes, { mode: 0o600, flag: 'wx' });
      const artifactLink = join(sandbox.root, 'artifact-link');
      symlinkSync(outsideArtifact, artifactLink, 'dir');

      assert.throws(() => {
        retainSuccessfulTestReport(reportPath, TEST_FILE, sandbox.reportDirectory, artifactLink);
      });
      assert.equal(lstatSync(artifactLink).isSymbolicLink(), true);
      assert.equal(existsSync(join(outsideArtifact, 'success-report.json')), false);
      assert.deepEqual(readFileSync(outsidePath), outsideBytes);
    });

    withSandbox('cvg-success-report-symlink-ancestor-', (sandbox) => {
      const reportPath = writePrivateReport(
        sandbox.reportDirectory,
        fixtureVitest(TEST_FILE)
      );
      const outsideTree = join(sandbox.outsideDirectory, 'ancestor-target');
      const outsideArtifact = join(outsideTree, 'artifact');
      mkdirSync(outsideArtifact, { recursive: true, mode: 0o700 });
      chmodSync(outsideTree, 0o700);
      chmodSync(outsideArtifact, 0o700);
      const outsidePath = join(outsideArtifact, 'outside.txt');
      const outsideBytes = Buffer.from('symlink-ancestor-sentinel');
      writeFileSync(outsidePath, outsideBytes, { mode: 0o600, flag: 'wx' });
      const ancestorLink = join(sandbox.root, 'ancestor-link');
      symlinkSync(outsideTree, ancestorLink, 'dir');
      const artifactThroughAncestor = join(ancestorLink, 'artifact');

      assert.throws(() => {
        retainSuccessfulTestReport(
          reportPath,
          TEST_FILE,
          sandbox.reportDirectory,
          artifactThroughAncestor
        );
      });
      assert.equal(lstatSync(ancestorLink).isSymbolicLink(), true);
      assert.equal(existsSync(join(outsideArtifact, 'success-report.json')), false);
      assert.deepEqual(readFileSync(outsidePath), outsideBytes);
    });
  }
);

test('rejects skipped counters that sanitization would truncate away', { skip: process.platform !== 'linux' }, () => {
  withSandbox('cvg-success-report-truncation-', (sandbox) => {
    const { numSkippedTests: ignored, ...base } = fixtureVitest();
    const report = { ...base, diagnostic: Array(11000).fill(0), numSkippedTests: 1 };
    const source = writePrivateReport(sandbox.reportDirectory, report);
    assert.throws(() => validateTestReport(source, TEST_FILE, sandbox.reportDirectory));
    assert.throws(() => retainSuccessfulTestReport(source, TEST_FILE, sandbox.reportDirectory, sandbox.artifactDirectory));
    assert.equal(existsSync(join(sandbox.artifactDirectory, 'success-report.json')), false);
  });
});

test('rejects evidence exceeding sanitizer node or depth limits even when counters pass', { skip: process.platform !== 'linux' }, () => {
  for (const diagnostic of [Array(11000).fill(0), Array.from({ length: 20 }).reduce((value) => ({ nested: value }), {})]) {
    withSandbox('cvg-success-report-completeness-', (sandbox) => {
      const source = writePrivateReport(sandbox.reportDirectory, fixtureVitest(TEST_FILE, { diagnostic }));
      validateTestReport(source, TEST_FILE, sandbox.reportDirectory);
      assert.throws(() => retainSuccessfulTestReport(source, TEST_FILE, sandbox.reportDirectory, sandbox.artifactDirectory), /would truncate evidence/);
      assert.equal(existsSync(join(sandbox.artifactDirectory, 'success-report.json')), false);
    });
  }
});
