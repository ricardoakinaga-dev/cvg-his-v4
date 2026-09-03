import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  REQUIRED_UAT_SCENARIOS,
  REQUIRED_VISUAL_SNAPSHOTS,
  validateUsabilityManualEvidence
} from './usability-certification-contract.mjs';

const execFileAsync = promisify(execFile);
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidateSha = '1234567890abcdef1234567890abcdef12345678';
const hospitalCandidateSha = '844596fc55d9e189a2e7be19ecac7b170a6acced';

function identity(prefix) {
  return { name: `${prefix} Silva`, corporateId: `${prefix.toLowerCase()}-1042` };
}

function acceptedEvidence() {
  return {
    schemaVersion: 1,
    candidateSha,
    visualReview: {
      result: 'approved',
      reviewedAt: '2026-09-03T10:00:00-03:00',
      productApprover: identity('Produto'),
      uxApprover: identity('Design'),
      evidenceReference: 'https://evidence.example/visual-review/1042',
      decisions: REQUIRED_VISUAL_SNAPSHOTS.map((snapshot) => ({
        snapshot,
        classification: 'intentional-change',
        decision: 'approved',
        evidenceReference: `https://evidence.example/visual/${snapshot}`
      }))
    },
    uat: Object.entries(REQUIRED_UAT_SCENARIOS).map(([role, scenarios]) => ({
      role,
      result: 'accepted',
      executedAt: '2026-09-03T11:00:00-03:00',
      environment: 'homologation-postgresql-16.15',
      approver: identity(role),
      evidenceReference: `https://evidence.example/uat/${role}`,
      scenarios: scenarios.map((id) => ({
        id,
        result: 'accepted',
        evidenceReference: `https://evidence.example/uat/${role}/${id}`
      }))
    })),
    accessibilityReview: {
      result: 'accepted',
      executedAt: '2026-09-03T12:00:00-03:00',
      technology: 'NVDA 2026.1 with Firefox 145',
      approver: identity('Acessibilidade'),
      evidenceReference: 'https://evidence.example/accessibility/1042'
    },
    residualRisks: [],
    goNoGo: {
      decision: 'go',
      decidedAt: '2026-09-03T13:00:00-03:00',
      evidenceReference: 'https://evidence.example/decision/1042',
      approvers: {
        product: identity('DirecaoProduto'),
        qa: identity('LiderQA'),
        engineering: identity('LiderEngenharia')
      }
    }
  };
}

test('accepts complete five-role GO evidence bound to the exact SHA', () => {
  const evidence = acceptedEvidence();
  const result = validateUsabilityManualEvidence(evidence, {
    expectedSha: candidateSha,
    expectedDecision: 'go'
  });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test('keeps the manual template synchronized with the enforced inventories', async () => {
  const template = JSON.parse(
    await readFile(
      join(rootDir, 'docs/templates/usability-certification-manual-evidence.template.json'),
      'utf8'
    )
  );
  assert.deepEqual(
    template.visualReview.decisions.map((item) => item.snapshot).sort(),
    [...REQUIRED_VISUAL_SNAPSHOTS].sort()
  );
  assert.deepEqual(
    Object.fromEntries(
      template.uat.map((entry) => [entry.role, entry.scenarios.map((scenario) => scenario.id)])
    ),
    Object.fromEntries(
      Object.entries(REQUIRED_UAT_SCENARIOS).map(([role, scenarios]) => [role, [...scenarios]])
    )
  );
});

test('uses only validated SHA outputs in artifact names and paths', async () => {
  const workflow = await readFile(
    join(rootDir, '.github/workflows/usability-certification.yml'),
    'utf8'
  );
  assert.doesNotMatch(
    workflow,
    /(?:name: usability|artifacts\/playwright\/).*inputs\.candidate_sha/
  );
  assert.equal((workflow.match(/id: candidate/g) ?? []).length, 3);
  assert.match(workflow, /steps\.candidate\.outputs\.sha/);
  assert.doesNotMatch(workflow, /Upload certification index\n\s+if: always\(\)/);
  assert.match(workflow, /finalDecision:"pending-manual-index"/);

  const preparationWorkflow = await readFile(
    join(rootDir, '.github/workflows/prepare-usability-review.yml'),
    'utf8'
  );
  assert.doesNotMatch(preparationWorkflow, /name: usability-visual-review-.*inputs\.candidate_sha/);
  assert.match(
    preparationWorkflow,
    /name: usability-visual-review-\$\{\{ steps\.candidate\.outputs\.sha \}\}/
  );
});

test('generates a 15-snapshot visual review package from immutable Git blobs', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'cvg-visual-review-'));
  await execFileAsync(
    process.execPath,
    [
      'scripts/generate-usability-visual-review-package.mjs',
      hospitalCandidateSha,
      temporaryDirectory
    ],
    { cwd: rootDir, env: process.env }
  );
  const manifest = JSON.parse(await readFile(join(temporaryDirectory, 'manifest.json'), 'utf8'));
  const html = await readFile(join(temporaryDirectory, 'index.html'), 'utf8');
  assert.equal(manifest.candidateSha, hospitalCandidateSha);
  assert.equal(manifest.snapshotCount, 15);
  assert.equal(manifest.items.length, 15);
  assert.equal(new Set(manifest.items.map((item) => item.before.sha256)).size, 15);
  assert.equal(new Set(manifest.items.map((item) => item.after.sha256)).size, 15);
  assert.match(html, /Pacote de revisão visual hospitalar/);
  assert.match(html, /Classificação e decisão formal/);
});

test('rejects a candidate SHA mismatch', () => {
  const result = validateUsabilityManualEvidence(acceptedEvidence(), {
    expectedSha: 'abcdef1234567890abcdef1234567890abcdef12',
    expectedDecision: 'go'
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /candidateSha must equal the dispatched SHA/);
});

test('rejects missing UAT roles and scenarios', () => {
  const evidence = acceptedEvidence();
  evidence.uat.pop();
  evidence.uat[0].scenarios.pop();
  const result = validateUsabilityManualEvidence(evidence, {
    expectedSha: candidateSha,
    expectedDecision: 'go'
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /hospital-administrator/);
  assert.match(result.errors.join('\n'), /close-command/);
});

test('rejects placeholders, pending visual decisions and residual P1 risk for GO', () => {
  const evidence = acceptedEvidence();
  evidence.visualReview.productApprover.name = '<full-name>';
  evidence.visualReview.decisions[0].decision = 'pending';
  evidence.residualRisks.push({
    id: 'RISK-1',
    severity: 'p1',
    description: 'Known release blocker',
    owner: 'Operations Team',
    dueDate: '2026-09-10',
    acceptedBy: identity('RiskOwner')
  });
  const result = validateUsabilityManualEvidence(evidence, {
    expectedSha: candidateSha,
    expectedDecision: 'go'
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join('\n'), /real approver/);
  assert.match(result.errors.join('\n'), /every visual decision/);
  assert.match(result.errors.join('\n'), /residual P0 or P1/);
});

test('generates a SHA-bound index with a digest of validated manual evidence', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'cvg-usability-certification-'));
  const manualPath = join(temporaryDirectory, 'manual.json');
  const markdownPath = join(temporaryDirectory, 'index.md');
  const jsonPath = join(temporaryDirectory, 'index.json');
  await writeFile(manualPath, `${JSON.stringify(acceptedEvidence())}\n`, 'utf8');

  await execFileAsync(
    process.execPath,
    ['scripts/generate-usability-certification-index.mjs', markdownPath, jsonPath],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        CANDIDATE_SHA: candidateSha,
        GITHUB_SERVER_URL: 'https://github.example',
        GITHUB_REPOSITORY: 'clinic/his',
        GITHUB_RUN_ID: '9001',
        TECHNICAL_RESULT: 'success',
        CROSS_BROWSER_RESULT: 'success',
        MANUAL_EVIDENCE_PATH: manualPath,
        GO_NO_GO: 'go'
      }
    }
  );

  const generated = JSON.parse(await readFile(jsonPath, 'utf8'));
  const markdown = await readFile(markdownPath, 'utf8');
  assert.equal(generated.sha, candidateSha);
  assert.match(generated.manualEvidence.sha256, /^[0-9a-f]{64}$/);
  assert.equal(generated.manualEvidence.uat.length, 5);
  assert.match(markdown, /veterinary-pathologist/);
  assert.match(markdown, /Decision: \*\*go\*\*/);
});

test('refuses a GO index when a technical job did not succeed', async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'cvg-usability-certification-'));
  const manualPath = join(temporaryDirectory, 'manual.json');
  await writeFile(manualPath, `${JSON.stringify(acceptedEvidence())}\n`, 'utf8');

  await assert.rejects(
    execFileAsync(process.execPath, ['scripts/generate-usability-certification-index.mjs'], {
      cwd: rootDir,
      env: {
        ...process.env,
        CANDIDATE_SHA: candidateSha,
        GITHUB_SERVER_URL: 'https://github.example',
        GITHUB_REPOSITORY: 'clinic/his',
        GITHUB_RUN_ID: '9002',
        TECHNICAL_RESULT: 'failure',
        CROSS_BROWSER_RESULT: 'success',
        MANUAL_EVIDENCE_PATH: manualPath,
        GO_NO_GO: 'go'
      }
    }),
    /GO requires successful technical and cross-browser jobs/
  );
});
