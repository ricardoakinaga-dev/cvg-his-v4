import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = resolve(root, process.env.RELEASE_OUTPUT_DIR ?? 'artifacts/release');
const outputPath = join(outputDir, 'image-attestation-evidence.json');
const digestPattern = /^sha256:[0-9a-f]{64}$/;

function currentCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

const commitSha = process.env.RELEASE_SHA ?? currentCommit();
const attestations = [
  ['api', process.env.API_IMAGE, process.env.API_DIGEST],
  ['worker', process.env.WORKER_IMAGE, process.env.WORKER_DIGEST],
  ['spa', process.env.SPA_IMAGE, process.env.SPA_DIGEST],
].map(([component, reference, digest]) => ({
  component,
  subject_name: reference?.split(':')[0] ?? null,
  subject_digest: digest ?? null,
  attestation: 'actions/attest-build-provenance',
}));

const valid = Boolean(
  commitSha &&
    /^[0-9a-f]{40}$/.test(commitSha) &&
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
      status: valid ? 'PASS' : 'FAIL',
      commit_sha: commitSha,
      attestations,
      generated_at: new Date().toISOString(),
    },
    null,
    2
  )}\n`
);

console.log(`Image attestation evidence: ${outputPath}`);
if (!valid || !existsSync(outputPath)) process.exitCode = 1;
