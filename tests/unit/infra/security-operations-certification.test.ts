import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(
  resolve(root, '.github/workflows/security-operations-certification.yml'),
  'utf8'
);
const runbook = readFileSync(
  resolve(root, 'docs/engineering/SECRET_ROTATION_AND_BREAK_GLASS.md'),
  'utf8'
);

describe('security operations certification contract', () => {
  it('binds evidence to an exact main SHA and protected environment', () => {
    expect(workflow).toContain('environment: security-operations');
    expect(workflow).toContain('ref: ${{ inputs.release_sha }}');
    expect(workflow).toContain('git merge-base --is-ancestor "${REQUESTED_SHA}" origin/main');
    expect(workflow).toContain('pnpm security:evidence');
    expect(workflow).toContain('apps/api/src/startup-secrets.test.ts');
    expect(workflow).toContain('pnpm --filter @cvg-his-v2/secrets test');
    expect(workflow).toContain('tests/unit/api/startup-secrets-runtime.test.ts');
    expect(workflow).toContain('retention-days: 90');
  });

  it('requires rotation, break-glass, Vault audit and human approval references', () => {
    for (const field of [
      'rotation_evidence_reference',
      'break_glass_evidence_reference',
      'vault_audit_evidence_reference',
      'executors',
      'approvers',
      'go_no_go_decision'
    ]) {
      expect(workflow).toContain(`${field}:`);
    }
    expect(runbook).toContain('Nunca registrar valores de segredos');
    expect(runbook).toContain('## 6. Break-glass');
    expect(runbook).toContain('pnpm security:operations:index');
  });

  it('generates a machine-readable index without accepting placeholder evidence', () => {
    const directory = mkdtempSync(join(tmpdir(), 'cvg-security-ops-'));
    try {
      const markdownPath = join(directory, 'index.md');
      const jsonPath = join(directory, 'index.json');
      const result = spawnSync(
        process.execPath,
        [resolve(root, 'scripts/generate-security-operations-index.mjs'), markdownPath, jsonPath],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            RELEASE_SHA: 'a'.repeat(40),
            GITHUB_SERVER_URL: 'https://github.example.invalid',
            GITHUB_REPOSITORY: 'cvg/his',
            GITHUB_RUN_ID: '12345',
            TARGET_ENVIRONMENT: 'staging',
            SECRET_CLASSES: 'AUTH_SECRET,DATABASE_URL',
            PREVIOUS_VERSION_LABEL: 'auth-2026-q2',
            CURRENT_VERSION_LABEL: 'auth-2026-q3',
            ROTATION_EVIDENCE_REFERENCE: 'SEC-002/rotation/123',
            BREAK_GLASS_EVIDENCE_REFERENCE: 'SEC-002/break-glass/124',
            VAULT_AUDIT_EVIDENCE_REFERENCE: 'restricted-audit/125',
            EXECUTORS: 'platform@example.invalid',
            APPROVERS: 'security@example.invalid;operations@example.invalid',
            RESIDUAL_RISKS: 'No residual risks identified by the approvers',
            TECHNICAL_RESULT: 'success',
            GO_NO_GO: 'go'
          }
        }
      );

      expect(result.status, result.stderr).toBe(0);
      const evidence = JSON.parse(readFileSync(jsonPath, 'utf8'));
      expect(evidence.sha).toBe('a'.repeat(40));
      expect(evidence.previousVersionLabel).not.toBe(evidence.currentVersionLabel);
      expect(readFileSync(markdownPath, 'utf8')).toContain('Secret values must never be included.');

      const invalid = spawnSync(
        process.execPath,
        [
          resolve(root, 'scripts/generate-security-operations-index.mjs'),
          join(directory, 'invalid.md'),
          join(directory, 'invalid.json')
        ],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            RELEASE_SHA: 'a'.repeat(40),
            GITHUB_SERVER_URL: 'https://github.example.invalid',
            GITHUB_REPOSITORY: 'cvg/his',
            GITHUB_RUN_ID: '12345',
            TARGET_ENVIRONMENT: 'staging',
            SECRET_CLASSES: 'AUTH_SECRET',
            PREVIOUS_VERSION_LABEL: 'auth-2026-q2',
            CURRENT_VERSION_LABEL: 'auth-2026-q3',
            ROTATION_EVIDENCE_REFERENCE: 'TODO',
            BREAK_GLASS_EVIDENCE_REFERENCE: 'SEC-002/break-glass/124',
            VAULT_AUDIT_EVIDENCE_REFERENCE: 'restricted-audit/125',
            EXECUTORS: 'platform@example.invalid',
            APPROVERS: 'security@example.invalid;operations@example.invalid',
            RESIDUAL_RISKS: 'No residual risks identified by the approvers',
            TECHNICAL_RESULT: 'success',
            GO_NO_GO: 'go'
          }
        }
      );
      expect(invalid.status).not.toBe(0);
      expect(invalid.stderr).toContain('Invalid or placeholder');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
