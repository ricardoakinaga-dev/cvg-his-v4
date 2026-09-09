import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = resolve(root, process.env.RELEASE_OUTPUT_DIR ?? 'artifacts/release');
const outputPath = join(outputDir, 'image-attestation-evidence.json');
const manifestPath = join(outputDir, 'release-manifest.json');
const checksumsPath = join(outputDir, 'CHECKSUMS.sha256');
const verificationPaths = ['api', 'worker', 'spa'].map((component) =>
  join(outputDir, `${component}-attestation-verification.json`)
);
const digestPattern = /^sha256:[0-9a-f]{64}$/;

function currentCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const commitSha = process.env.RELEASE_SHA ?? currentCommit();
const attestations = [
  ['api', process.env.API_IMAGE, process.env.API_DIGEST],
  ['worker', process.env.WORKER_IMAGE, process.env.WORKER_DIGEST],
  ['spa', process.env.SPA_IMAGE, process.env.SPA_DIGEST],
].map(([component, reference, digest]) => ({
  component,
  subject_reference: reference ?? null,
  subject_name: reference?.split(':')[0] ?? null,
  subject_digest: digest ?? null,
  attestation: 'actions/attest-build-provenance',
}));

let manifest = null;
try {
  if (existsSync(manifestPath)) manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  manifest = null;
}

const manifestImages = new Map((manifest?.images ?? []).map((image) => [image.component, image]));
const manifestMatches = Boolean(
  manifest?.commit_sha === commitSha &&
    ['api', 'worker', 'spa'].every((component) => {
      const expected = attestations.find((item) => item.component === component);
      const actual = manifestImages.get(component);
      return actual?.reference === expected?.subject_reference &&
        actual?.digest === expected?.subject_digest;
    })
);
const verificationReports = verificationPaths.map((path) => {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'));
    return (Array.isArray(value) && value.length > 0)
      || (value !== null && typeof value === 'object' && Object.keys(value).length > 0);
  } catch {
    return false;
  }
});
const evidenceArtifacts = [manifestPath, checksumsPath, ...verificationPaths]
  .filter((path) => existsSync(path))
  .map((path) => ({
    path: relative(root, path).split('\\').join('/'),
    sha256: `sha256:${sha256(path)}`
  }));

const valid = Boolean(
  commitSha &&
    /^[0-9a-f]{40}$/.test(commitSha) &&
    process.env.GITHUB_RUN_ID &&
    manifestMatches &&
    existsSync(manifestPath) &&
    existsSync(checksumsPath) &&
    verificationReports.every(Boolean) &&
    attestations.length === 3 &&
    attestations.every(
      (item) => typeof item.subject_name === 'string' && digestPattern.test(item.subject_digest ?? '')
    )
);

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      schema_version: 1,
      evidence_type: 'cvg-his-external-evidence',
      status: valid ? 'PASS' : 'FAIL',
      commit_sha: commitSha,
      observed_at: new Date().toISOString(),
      producer: {
        kind: 'github-actions',
        run_id: process.env.GITHUB_RUN_ID ?? ''
      },
      verification: {
        verified: valid,
        method: 'github-cli-gh-attestation-verify',
        verifier_id: 'gh-attestation-verify',
        verified_at: new Date().toISOString()
      },
      artifacts: existsSync(manifestPath) && existsSync(checksumsPath) ? evidenceArtifacts : [],
      attestations,
      generated_at: new Date().toISOString(),
    },
    null,
    2
  )}\n`
);

console.log(`Image attestation evidence: ${outputPath}`);
if (!valid || !existsSync(outputPath)) process.exitCode = 1;
