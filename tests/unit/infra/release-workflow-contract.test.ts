import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(resolve(root, '.github/workflows/release-artifacts.yml'), 'utf8');

describe('immutable release workflow contract', () => {
  it('only publishes a successful main push from the exact CI-tested SHA', () => {
    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("github.event.workflow_run.event == 'push'");
    expect(workflow).toContain('ref: ${{ env.RELEASE_SHA }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA}"');
  });

  it('publishes all images by SHA with SBOM and provenance', () => {
    expect(workflow.match(/cvg-his-v4-(api|worker|spa):\$\{\{ github\.event\.workflow_run\.head_sha \}\}/g)).toHaveLength(3);
    expect(workflow.match(/provenance: mode=max/g)).toHaveLength(3);
    expect(workflow.match(/sbom: true/g)).toHaveLength(3);
    expect(workflow.match(/actions\/attest-build-provenance@[0-9a-f]{40}/g)).toHaveLength(3);
  });

  it('emits an auditable bundle, manifest and checksums', () => {
    expect(workflow).toContain('git archive --format=tar.gz');
    expect(workflow).toContain('SECURITY_EVIDENCE_DIR=artifacts/release pnpm security:evidence');
    expect(workflow).toContain('run: pnpm release:ci-evidence');
    expect(workflow).toContain('CI_RUN_ID: ${{ github.event.workflow_run.id }}');
    expect(workflow).toContain("RELEASE_REQUIRE_IMAGE_DIGESTS: '1'");
    expect(workflow).toContain('run: pnpm release:manifest');
    expect(workflow).toContain('path: artifacts/release/');
    expect(workflow).toContain('if-no-files-found: error');
  });

  it('records image attestations before the blocking release gate', () => {
    const attestationIndex = workflow.indexOf('actions/attest-build-provenance@');
    const gateIndex = workflow.indexOf('name: Run blocking Triple-A release gate');
    expect(attestationIndex).toBeGreaterThan(-1);
    expect(workflow).toContain('run: pnpm release:attestation-evidence');
    expect(workflow).toContain('TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE: artifacts/release/image-attestation-evidence.json');
    expect(gateIndex).toBeGreaterThan(attestationIndex);
  });

  it('cryptographically verifies each published OCI image before the blocking gate', () => {
    expect(workflow.match(/gh attestation verify "oci:\/\/ghcr\.io\//g)).toHaveLength(3);
    expect(workflow.match(/--format json > artifacts\/release\/[a-z]+-attestation-verification\.json/g)).toHaveLength(3);
    expect(workflow.match(/--signer-workflow "\$\{SIGNER_WORKFLOW\}"/g)).toHaveLength(3);
    expect(workflow.match(/--source-ref main --source-digest "\$\{RELEASE_SHA\}"/g)).toHaveLength(3);
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
  });

  it('generates the manifest after attestation verification and binds the CI envelope', () => {
    const verificationIndex = workflow.indexOf('name: Verify image attestations');
    const manifestIndex = workflow.indexOf('name: Generate release manifest and checksums');
    const gateIndex = workflow.indexOf('name: Run blocking Triple-A release gate');

    expect(manifestIndex).toBeGreaterThan(verificationIndex);
    expect(gateIndex).toBeGreaterThan(manifestIndex);
    expect(workflow).toContain('TRIPLE_A_CI_EVIDENCE: artifacts/release/ci-evidence.json');
    expect(workflow).toContain("TRIPLE_A_VERIFY_CI_EVIDENCE: '1'");
    expect(workflow).not.toContain('TRIPLE_A_CI_URL:');
  });

  it('runs a blocking candidate assurance before publishing any image', () => {
    const preflightIndex = workflow.indexOf('name: Run pre-publication candidate assurance');
    const firstPublishIndex = workflow.indexOf('name: Build and publish API image');
    const firstPushIndex = workflow.indexOf('push: true');
    const preflight = workflow.slice(preflightIndex, firstPublishIndex);

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(workflow).toContain('TRIPLE_A_PREPUBLICATION: \'1\'');
    expect(workflow).not.toContain('TRIPLE_A_ADVISORY: \'1\'');
    expect(workflow).toContain('run: pnpm release:triple-a');
    expect(preflight).toContain('TRIPLE_A_EVIDENCE_COMMIT_SHA: ${{ env.RELEASE_SHA }}');
    expect(preflight).toContain('TRIPLE_A_CI_EVIDENCE: artifacts/release/ci-evidence.json');
    expect(preflight).toContain('TRIPLE_A_CI_RUN_ID: ${{ github.event.workflow_run.id }}');
    expect(preflight).toContain("TRIPLE_A_VERIFY_CI_EVIDENCE: '1'");
    expect(preflight).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
    expect(firstPublishIndex).toBeGreaterThan(preflightIndex);
    expect(firstPushIndex).toBeGreaterThan(preflightIndex);
  });
});
