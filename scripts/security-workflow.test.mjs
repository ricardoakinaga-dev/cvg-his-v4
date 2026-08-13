import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

const workflowText = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
const workflow = parse(workflowText);

function steps(jobName) {
  return workflow.jobs[jobName]?.steps ?? [];
}

function stepIndex(jobName, name) {
  return steps(jobName).findIndex((step) => step.name === name);
}

test('defaults to no token permissions and declares minimum permissions per job', () => {
  assert.deepEqual(workflow.permissions, {});
  for (const [name, job] of Object.entries(workflow.jobs)) {
    assert.ok(job.permissions, `${name} must declare permissions`);
    assert.equal(job.permissions.contents, 'read', `${name} needs read-only contents`);
  }
  assert.equal(workflow.jobs.sast.permissions['security-events'], 'write');
});

test('pins every action to a verified full commit SHA', () => {
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    for (const step of job.steps ?? []) {
      if (!step.uses) continue;
      assert.match(step.uses, /@[a-f0-9]{40}$/, `${jobName}: ${step.uses}`);
    }
  }
});

test('checks out full history in every job that checks out source', () => {
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    for (const step of job.steps ?? []) {
      if (!String(step.uses ?? '').startsWith('actions/checkout@')) continue;
      assert.equal(step.with?.['fetch-depth'], 0, `${jobName} must use fetch-depth 0`);
    }
  }
});

test('uploads SAST evidence before enforcing the Semgrep result gate', () => {
  const scanCommand = steps('sast').find((step) => step.name === 'Run Semgrep scan').run;
  assert.match(scanCommand, /p\/security-audit/);
  assert.doesNotMatch(scanCommand, /p\/security-extended/);
  assert.ok(stepIndex('sast', 'Evaluate Semgrep findings') >= 0);
  assert.ok(
    stepIndex('sast', 'Upload Semgrep evidence') > stepIndex('sast', 'Evaluate Semgrep findings')
  );
  assert.ok(
    stepIndex('sast', 'Enforce Semgrep gate') > stepIndex('sast', 'Upload Semgrep evidence')
  );
  assert.match(
    steps('sast').find((step) => step.name === 'Evaluate Semgrep findings').run,
    /gate-semgrep-results\.mjs/
  );
});

test('scans full git history for secrets and gates only after evidence upload', () => {
  const command = steps('secret-scan').find(
    (step) => step.name === 'Scan full Git history with Gitleaks'
  ).run;
  assert.match(command, /\n\s+git \/repo/);
  assert.match(command, /\n\s+dir \/repo/);
  assert.doesNotMatch(command, /gitleaks git/);
  assert.match(command, /--log-opts="--all"/);
  assert.match(command, /gitleaks-working-tree\.json/);
  const evaluation = steps('secret-scan').find(
    (step) => step.name === 'Evaluate Gitleaks findings'
  ).run;
  assert.match(evaluation, /gate-gitleaks-results\.mjs/);
  assert.match(evaluation, /\.gitleaks-history-baseline\.json/);
  assert.ok(
    stepIndex('secret-scan', 'Upload secret scan evidence') >
      stepIndex('secret-scan', 'Evaluate Gitleaks findings')
  );
  assert.ok(
    stepIndex('secret-scan', 'Enforce secret scan gate') >
      stepIndex('secret-scan', 'Upload secret scan evidence')
  );
});

test('builds and scans every deployable image and blocks Critical or High findings', () => {
  assert.deepEqual(workflow.jobs['image-scan'].strategy.matrix.image, ['api', 'spa', 'worker']);
  const smoke = steps('image-scan').find((step) => step.name === 'Smoke built image');
  assert.match(smoke.run, /smoke-container-image\.mjs/);
  assert.ok(
    stepIndex('image-scan', 'Smoke built image') >
      stepIndex('image-scan', 'Build image for scanning')
  );
  const scan = steps('image-scan').find((step) =>
    String(step.uses ?? '').startsWith('aquasecurity/trivy-action@')
  );
  assert.equal(scan.with.severity, 'CRITICAL,HIGH');
  assert.equal(scan.with.format, 'json');
  assert.ok(
    stepIndex('image-scan', 'Scan image with Trivy') > stepIndex('image-scan', 'Smoke built image')
  );
  const enforcement = steps('image-scan').find((step) => step.name === 'Enforce image scan gate');
  assert.equal(enforcement.env.RUNTIME_OUTCOME, '${{ steps.image-smoke.outcome }}');
  assert.match(enforcement.run, /RUNTIME_OUTCOME/);
  assert.ok(
    stepIndex('image-scan', 'Enforce image scan gate') >
      stepIndex('image-scan', 'Upload image scan evidence')
  );
});

test('security aggregation and strict release are explicit blocking jobs', () => {
  assert.deepEqual([...workflow.jobs['security-gate'].needs].sort(), [
    'dependency-audit',
    'image-scan',
    'sast',
    'secret-scan'
  ]);
  assert.ok(workflow.jobs['release-gate'].needs.includes('security-gate'));
  assert.match(steps('release-gate').at(-1).run, /rc:evidence:strict/);
});

test('enterprise release blocks on complete integration, API E2E, functional SPA and visual gates', () => {
  const integrationCommand = steps('integration-tests').find(
    (step) => step.name === 'Run integration tests'
  ).run;
  const spaStep = steps('test-e2e-spa').find((step) => step.name === 'Run SPA E2E tests');
  const visualStep = steps('test-visual').find(
    (step) => step.name === 'Run visual regression tests'
  );
  const apiE2EStep = steps('test-e2e-api').find((step) => step.name === 'Run API E2E tests');

  assert.match(integrationCommand, /test:integration/);
  assert.match(apiE2EStep.run, /test:e2e/);
  assert.match(spaStep.run, /--grep-invert[= ]['"]?Visual/);
  assert.doesNotMatch(spaStep.run, /master-search-360-reception\.spec\.ts/);
  assert.equal(spaStep.env.E2E_REUSE_EXISTING_SERVER, 'true');
  assert.notEqual(visualStep['continue-on-error'], true);
  assert.equal(visualStep.env.E2E_REUSE_EXISTING_SERVER, 'true');
  assert.ok(workflow.jobs['release-gate'].needs.includes('test-e2e-api'));
  assert.ok(workflow.jobs['release-gate'].needs.includes('test-visual'));
});
