import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  const mockedSpawn = vi.fn();
  return { ...actual, spawnSync: mockedSpawn, default: { ...actual, spawnSync: mockedSpawn } };
});
import { verifySecurityEvidence, validateCiEvidenceEnvelope } from '../../../scripts/run-triple-a-release-gate.mjs';
import { REQUIRED_CI_JOB_NAMES } from '../../../scripts/generate-ci-evidence.mjs';

const commitSha = 'e'.repeat(40);
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
let root: string;
let reportPath: string;
function verify() { return verifySecurityEvidence({ rootDir: root, outputDir: root, commitSha }); }
function attest(sha = digest(readFileSync(reportPath))) {
  return JSON.stringify([{ verificationResult: { statement: { subject: [{ digest: { sha256: sha } }] } } }]);
}
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'cvg-security-attestation-'));
  reportPath = join(root, 'security-evidence.json');
  const sbom = JSON.stringify({ bomFormat: 'CycloneDX', specVersion: '1.5', serialNumber: 'urn:uuid:test', version: 1,
    metadata: { component: { type: 'application', name: 'cvg-his-v4' } },
    components: [{ type: 'library', name: 'example', version: '1.0.0', 'bom-ref': 'example@1.0.0' }] });
  writeFileSync(join(root, 'sbom.json'), sbom);
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), commit_sha: commitSha,
    status: 'PASS', securityAudit: 'PASS', semgrepCi: [{ status: 'PASS' }],
    sbom: { path: 'sbom.json', sha256: digest(sbom), components: 1 } }));
  vi.stubEnv('TRIPLE_A_VERIFY_SECURITY_ATTESTATION', '1');
  vi.stubEnv('GITHUB_REPOSITORY', 'owner/project');
  vi.stubEnv('GH_TOKEN', 'test-token');
  vi.stubEnv('GITHUB_TOKEN', '');
  vi.mocked(spawnSync).mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); rmSync(root, { recursive: true, force: true }); });

describe('security report independent attestation', () => {
  it('accepts only verified report bytes under pinned workflow, repository and source/signer commit', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: attest() } as never);
    expect(verify().status).toBe('PASS');
    const [command, args] = vi.mocked(spawnSync).mock.calls[0];
    expect(command).toBe('gh');
    expect(args).toEqual(['attestation', 'verify', reportPath,
      '--repo', 'owner/project', '--signer-workflow', 'owner/project/.github/workflows/release-artifacts.yml',
      '--source-ref', 'refs/heads/main', '--source-digest', commitSha, '--signer-digest', commitSha,
      '--predicate-type', 'https://slsa.dev/provenance/v1', '--format', 'json']);
  });
  it.each(['[]', '{}', 'not-json', JSON.stringify([{ verificationResult: { statement: { subject: [] } } }])])('rejects malformed verification output %s', (stdout) => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout } as never);
    expect(verify().status).toBe('FAIL');
  });
  it('rejects a different subject digest even when gh exits zero', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 0, stdout: attest('a'.repeat(64)) } as never);
    expect(verify().status).toBe('FAIL');
  });
  it.each(['wrong repository', 'wrong source commit', 'wrong signer workflow', 'missing attestation'])('rejects trusted verifier failure: %s', (stderr) => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1, stdout: '', stderr } as never);
    expect(verify().status).toBe('FAIL');
  });
  it.each(['security-evidence.json', 'sbom.json'])('rejects a file swapped during verification: %s', (file) => {
    const stdout = attest();
    vi.mocked(spawnSync).mockImplementation(() => {
      writeFileSync(join(root, file), '{}');
      return { status: 0, stdout } as never;
    });
    expect(verify().status).toBe('FAIL');
  });
  it('keeps self-authored trust fields PARTIAL without opt-in or credentials', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    writeFileSync(reportPath, JSON.stringify({ ...report, verification: { verified: true }, workflow: 'attacker.yml' }));
    vi.stubEnv('TRIPLE_A_VERIFY_SECURITY_ATTESTATION', '');
    expect(verify().status).toBe('PARTIAL');
    vi.stubEnv('TRIPLE_A_VERIFY_SECURITY_ATTESTATION', '1');
    vi.stubEnv('GH_TOKEN', '');
    expect(verify().status).toBe('PARTIAL');
    expect(spawnSync).not.toHaveBeenCalled();
  });
  it('blocks PASS when gh is unavailable', () => {
    vi.mocked(spawnSync).mockReturnValue({ status: null, error: { code: 'ENOENT' } } as never);
    expect(verify().status).toBe('PARTIAL');
  });
  it('rejects invalid security findings before attempting attestation', () => {
    const report = JSON.parse(readFileSync(reportPath, 'utf8'));
    writeFileSync(reportPath, JSON.stringify({ ...report, securityAudit: 'FAIL' }));
    expect(verify().status).toBe('FAIL');
    expect(spawnSync).not.toHaveBeenCalled();
  });
});

describe('release consumer required CI jobs', () => {
  it.each(['missing', 'skipped', 'failure'])('rejects Critical Coverage Gate %s', (conclusion) => {
    const jobs = REQUIRED_CI_JOB_NAMES.filter((name) => name !== 'Critical Coverage Gate').map((name) => ({ name, status: 'completed', conclusion: 'success' }));
    if (conclusion !== 'missing') jobs.push({ name: 'Critical Coverage Gate', status: 'completed', conclusion });
    const now = new Date().toISOString();
    const result = validateCiEvidenceEnvelope({ rootDir: root, value: 'ci-evidence.json', commitSha,
      artifact: { schema_version: 1, evidence_type: 'cvg-his-ci-evidence', commit_sha: commitSha, status: 'PASS', observed_at: now,
        producer: { kind: 'github-actions-workflow-run', run_id: '123' },
        verification: { verified: true, method: 'github-api-workflow-run', verifier_id: 'release-ci-run-verifier', verified_at: now },
        artifacts: [{ path: 'sbom.json', sha256: `sha256:${digest(readFileSync(join(root, 'sbom.json')))}` }],
        run: { id: 123, name: 'CI', event: 'push', head_branch: 'main', head_sha: commitSha, status: 'completed', conclusion: 'success' }, jobs } });
    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('Critical Coverage Gate');
  });
});
