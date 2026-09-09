import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  scoreCriteria,
  validateExternalEvidenceEnvelope,
  verifyPublishedImageAttestations,
  verifyCleanWorktree
} from '../../../scripts/run-triple-a-release-gate.mjs';

describe('Triple-A release gate scoring', () => {
  it('keeps critical score separate and counts every open P0', () => {
    const result = scoreCriteria([
      { id: 'p0-pass', priority: 'P0', status: 'PASS' },
      { id: 'p0-partial', priority: 'P0', status: 'PARTIAL' },
      { id: 'p1-pass', priority: 'P1', status: 'PASS' },
      { id: 'p1-missing', priority: 'P1', status: 'NOT_RUN' },
    ]);

    expect(result.score).toBe(63);
    expect(result.critical_score).toBe(75);
    expect(result.open_p0).toBe(1);
  });

  it('does not award score to missing or failed evidence', () => {
    const result = scoreCriteria([
      { id: 'p0-fail', priority: 'P0', status: 'FAIL' },
      { id: 'p1-missing', priority: 'P1', status: 'NOT_RUN' },
    ]);

    expect(result.score).toBe(0);
    expect(result.critical_score).toBe(0);
    expect(result.open_p0).toBe(1);
  });

  it('reports a bounded first dirty path without expanding untracked directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'cvg-triple-a-gate-'));
    try {
      execFileSync('git', ['init', '--quiet', root]);
      writeFileSync(join(root, 'generated-evidence.json'), '{"generated":true}\n');

      const result = verifyCleanWorktree(root);

      expect(result.status).toBe('FAIL');
      expect(result.evidence).toContain('generated-evidence.json');
      expect(result.command).toContain('--untracked-files=normal');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects self-authored JSON that lacks an independently verifiable envelope', () => {
    const result = validateExternalEvidenceEnvelope({
      rootDir: process.cwd(),
      value: 'fixture.json',
      commitSha: 'a'.repeat(40),
      artifact: { commit_sha: 'a'.repeat(40), status: 'PASS' }
    });

    expect(result.status).toBe('FAIL');
  });

  it('validates envelope metadata and every referenced artifact digest', () => {
    const root = mkdtempSync(join(tmpdir(), 'cvg-triple-a-evidence-'));
    try {
      const artifactRelativePath = 'result.json';
      const artifactPath = join(root, artifactRelativePath);
      const evidencePayload = '{"result":"PASS"}\n';
      writeFileSync(artifactPath, evidencePayload);
      const digest = createHash('sha256').update(evidencePayload).digest('hex');
      const commitSha = 'b'.repeat(40);

      const result = validateExternalEvidenceEnvelope({
        rootDir: root,
        value: 'envelope.json',
        commitSha,
        artifact: {
          schema_version: 1,
          evidence_type: 'cvg-his-external-evidence',
          commit_sha: commitSha,
          status: 'PASS',
          observed_at: '2026-09-09T12:00:00.000Z',
          producer: { kind: 'github-actions', run_id: '12345' },
          verification: {
            verified: true,
            method: 'github-workflow-run',
            verifier_id: 'release-assurance',
            verified_at: '2026-09-09T12:01:00.000Z'
          },
          artifacts: [{ path: artifactRelativePath, sha256: `sha256:${digest}` }]
        }
      });

      expect(result.status).toBe('PASS');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('does not treat an image envelope as attestation proof without gh verification', () => {
    const previous = process.env.TRIPLE_A_VERIFY_ATTESTATIONS;
    delete process.env.TRIPLE_A_VERIFY_ATTESTATIONS;
    try {
      const result = verifyPublishedImageAttestations({
        rootDir: process.cwd(),
        outputDir: join(process.cwd(), 'artifacts', 'release'),
        commitSha: 'c'.repeat(40)
      });

      expect(result.status).toBe('PARTIAL');
    } finally {
      if (previous === undefined) delete process.env.TRIPLE_A_VERIFY_ATTESTATIONS;
      else process.env.TRIPLE_A_VERIFY_ATTESTATIONS = previous;
    }
  });
});
