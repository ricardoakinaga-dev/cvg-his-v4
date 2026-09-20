import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { inspectReleaseWorkflowPolicy } from '../../../scripts/validate-supply-chain.mjs';

const root = resolve(import.meta.dirname, '../../..');
const workflow = readFileSync(resolve(root, '.github/workflows/release-artifacts.yml'), 'utf8');

interface WorkflowStep {
  name: string;
  uses?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
}

const releaseSteps = (): WorkflowStep[] =>
  parse(workflow).jobs['publish-sha-artifacts'].steps;

function workflowStepBounds(content: string, name: string) {
  const marker = `      - name: ${name}`;
  const start = content.indexOf(marker);
  if (start < 0) throw new Error(`missing workflow step: ${name}`);
  const next = content.indexOf('\n      - name:', start + marker.length);
  return { start, end: next < 0 ? content.length : next };
}

function removeWorkflowStep(content: string, name: string) {
  const { start, end } = workflowStepBounds(content, name);
  return `${content.slice(0, start)}${content.slice(end)}`;
}

function moveWorkflowStepAfter(content: string, sourceName: string, destinationName: string) {
  const source = workflowStepBounds(content, sourceName);
  const step = content.slice(source.start, source.end);
  const withoutSource = `${content.slice(0, source.start)}${content.slice(source.end)}`;
  const destination = workflowStepBounds(withoutSource, destinationName);
  return `${withoutSource.slice(0, destination.end)}\n${step}${withoutSource.slice(destination.end)}`;
}

function expectAttestationContract(steps: WorkflowStep[]) {
  const attestations = steps.filter((step) => step.uses?.startsWith('actions/attest-build-provenance@'));
  expect(attestations).toHaveLength(4);
  for (const step of attestations) {
    expect(step.uses).toMatch(/^actions\/attest-build-provenance@[0-9a-f]{40}$/);
  }
  const images = attestations.filter((step) => step.with?.['subject-digest'] !== undefined);
  expect(images).toHaveLength(3);
  const imageVerificationIndex = steps.findIndex((step) => step.name === 'Verify image attestations');
  const finalGateIndex = steps.findIndex((step) => step.name === 'Run blocking Triple-A release gate');
  expect(imageVerificationIndex).toBeGreaterThan(-1);
  expect(finalGateIndex).toBeGreaterThan(imageVerificationIndex);
  for (const component of ['api', 'worker', 'spa']) {
    const matching = images.filter((step) =>
      step.with?.['subject-name'] === `ghcr.io/\${{ github.repository_owner }}/cvg-his-v4-${component}`
    );
    expect(matching).toHaveLength(1);
    expect(steps.indexOf(matching[0])).toBeLessThan(imageVerificationIndex);
    expect(matching[0].with).toEqual({
      'subject-name': `ghcr.io/\${{ github.repository_owner }}/cvg-his-v4-${component}`,
      'subject-digest': `\${{ steps.${component}.outputs.digest }}`,
      'push-to-registry': true
    });
  }
  const reports = attestations.filter((step) => step.with?.['subject-path'] !== undefined);
  expect(reports).toHaveLength(1);
  expect(reports[0].with).toEqual({ 'subject-path': 'artifacts/release/security-evidence.json' });
  const reportIndex = steps.indexOf(reports[0]);
  const generationIndex = steps.findIndex((step) => step.name === 'Generate source bundle and repository SBOM');
  const prepublicationIndex = steps.findIndex((step) => step.name === 'Run pre-publication candidate assurance');
  expect(generationIndex).toBeGreaterThan(-1);
  expect(reportIndex).toBeGreaterThan(generationIndex);
  expect(prepublicationIndex).toBeGreaterThan(reportIndex);
  for (const name of ['Run pre-publication candidate assurance', 'Run blocking Triple-A release gate']) {
    expect(steps.find((step) => step.name === name)?.env?.TRIPLE_A_VERIFY_SECURITY_ATTESTATION).toBe('1');
  }
}

describe('immutable release workflow contract', () => {
  it('only publishes a successful main push from the exact CI-tested SHA', () => {
    expect(workflow).toContain('workflow_run:');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("github.event.workflow_run.event == 'push'");
    expect(workflow).toContain('ref: ${{ env.RELEASE_SHA }}');
    expect(workflow).toContain('test "$(git rev-parse HEAD)" = "${RELEASE_SHA}"');
  });

  it('binds all release images by digest-only repository reference with SBOM and provenance', () => {
    expect(
      workflow.match(
        /(?:API|WORKER|SPA)_IMAGE: ghcr\.io\/\$\{\{ github\.repository_owner \}\}\/cvg-his-v4-(?:api|worker|spa)$/gm
      )
    ).toHaveLength(3);
    expect(workflow.match(/provenance: mode=max/g)).toHaveLength(3);
    expect(workflow.match(/sbom: true/g)).toHaveLength(3);
    expectAttestationContract(releaseSteps());
  });

  it.each(['remove image', 'late image', 'substitute report', 'remove report', 'late report', 'disable prepublication verification', 'disable final verification'])('rejects an invalid attestation contract: %s', (mutation) => {
    const steps = releaseSteps();
    const imageIndex = steps.findIndex((step) => step.name === 'Attest API image');
    const reportIndex = steps.findIndex((step) => step.name === 'Attest candidate security evidence');
    if (mutation === 'remove image') steps.splice(imageIndex, 1);
    else if (mutation === 'late image') {
      const [image] = steps.splice(imageIndex, 1);
      const verificationIndex = steps.findIndex((step) => step.name === 'Verify image attestations');
      steps.splice(verificationIndex + 1, 0, image);
    }
    else if (mutation === 'substitute report') steps[imageIndex] = structuredClone(steps[reportIndex]);
    else if (mutation === 'remove report') steps.splice(reportIndex, 1);
    else if (mutation === 'late report') steps.push(...steps.splice(reportIndex, 1));
    else {
      const name = mutation === 'disable prepublication verification'
        ? 'Run pre-publication candidate assurance'
        : 'Run blocking Triple-A release gate';
      delete steps.find((step) => step.name === name)!.env!.TRIPLE_A_VERIFY_SECURITY_ATTESTATION;
    }
    expect(() => expectAttestationContract(steps)).toThrow();
  });

  it('scans every exact OCI candidate fail-closed before publishing without a rebuild', () => {
    expect(inspectReleaseWorkflowPolicy(workflow)).toEqual([]);
    expect(workflow.match(/aquasecurity\/trivy-action@[0-9a-f]{40}/g)).toHaveLength(3);
    const prepareIndex = workflow.indexOf('name: Prepare OCI layouts for vulnerability scanning');
    const firstScanIndex = workflow.indexOf('name: Scan API image candidate for vulnerabilities');
    expect(prepareIndex).toBeGreaterThan(-1);
    expect(prepareIndex).toBeLessThan(firstScanIndex);
    expect(workflow).toContain('for component in api worker spa;');
    expect(workflow).toContain('tar -xf "/tmp/${component}-image.tar" -C "${layout}"');
    expect(workflow).toContain('test -f "${layout}/index.json"');
    expect(workflow).toContain('test -f "${layout}/oci-layout"');
    expect(workflow).toContain('input: /tmp/api-image');
    expect(workflow).toContain('input: /tmp/worker-image');
    expect(workflow).toContain('input: /tmp/spa-image');
    expect(workflow).not.toContain('input: /tmp/api-image.tar');
    expect(workflow).not.toContain('input: /tmp/worker-image.tar');
    expect(workflow).not.toContain('input: /tmp/spa-image.tar');
    expect(workflow.match(/severity: HIGH,CRITICAL/g)).toHaveLength(3);
    expect(workflow.match(/exit-code: '1'/g)).toHaveLength(3);
    expect(workflow.match(/push: false/g)).toHaveLength(3);
    expect(workflow).not.toContain('push: true');
    expect(workflow).toContain('oras copy --recursive --from-oci-layout');
  });

  it('quarantines candidates and publishes the release-set artifact only after the gate', () => {
    const blockingGateIndex = workflow.indexOf('name: Run blocking Triple-A release gate');
    const packageIndex = workflow.indexOf('name: Generate complete Triple-A evidence package');
    const releaseUploadIndex = workflow.indexOf(
      'name: Publish certified release manifest and evidence'
    );

    expect(workflow.match(/:quarantine-\$\{\{ github\.run_id \}\}-/g)).toHaveLength(3);
    expect(packageIndex).toBeGreaterThan(blockingGateIndex);
    expect(releaseUploadIndex).toBeGreaterThan(packageIndex);
    expect(workflow).not.toContain('Promote certified image digests to final SHA tags');
    expect(workflow).not.toMatch(/^\s*oras\s+(?:cp|copy)\b.*"\$\{(?:API|WORKER|SPA)_IMAGE\}"\s*$/m);
    expect(workflow.slice(releaseUploadIndex)).not.toContain('if: always()');
  });

  it('rejects a known-bad release workflow without a scanner or with a premature push', () => {
    const withoutScanner = workflow.replace(
      /uses: aquasecurity\/trivy-action@[0-9a-f]{40}/g,
      'uses: ./missing-image-scanner'
    );
    const prematurePush = workflow.replace('push: false', 'push: true');

    expect(
      inspectReleaseWorkflowPolicy(withoutScanner).some((finding) =>
        finding.includes('must scan exactly')
      )
    ).toBe(true);
    expect(
      inspectReleaseWorkflowPolicy(prematurePush).some((finding) =>
        finding.includes('must not be rebuilt and pushed')
      )
    ).toBe(true);
  });

  it('rejects a known-bad copy to a release repository reference', () => {
    const mutableFinalPublication = workflow.replace(
      '\n      - name: Run blocking Triple-A release gate',
      `\n      - name: Illicit mutable final publication
        run: oras copy "\${API_CANDIDATE_IMAGE}" "\${API_IMAGE}"

      - name: Run blocking Triple-A release gate`
    );

    expect(
      inspectReleaseWorkflowPolicy(mutableFinalPublication).some((finding) =>
        finding.includes('must never be published as mutable tags')
      )
    ).toBe(true);
  });

  it('rejects named NR-013 release transition mutations before publication', () => {
    const mutations: Array<[string, string]> = [
      ['weaken HIGH/CRITICAL severity', workflow.replace('severity: HIGH,CRITICAL', 'severity: LOW,CRITICAL')],
      ['ignore unfixed vulnerabilities', workflow.replace('ignore-unfixed: false', 'ignore-unfixed: true')],
      ['make the scanner non-blocking', workflow.replace("exit-code: '1'", "exit-code: '0'")],
      ['substitute a scanned image', workflow.replace('input: /tmp/api-image', 'input: /tmp/worker-image')],
      ['ignore the scan input', workflow.replace('input: /tmp/api-image', 'input: /tmp/missing-api-image')],
      [
        'scan before OCI layout preparation',
        moveWorkflowStepAfter(
          workflow,
          'Prepare OCI layouts for vulnerability scanning',
          'Scan API image candidate for vulnerabilities'
        )
      ],
      [
        'publish before the pre-publication gate',
        moveWorkflowStepAfter(
          workflow,
          'Run pre-publication candidate assurance',
          'Publish vetted image candidates to quarantine without rebuilding'
        )
      ],
      ['remove the final blocking gate', removeWorkflowStep(workflow, 'Run blocking Triple-A release gate')]
    ];

    for (const [mutation, content] of mutations) {
      expect(inspectReleaseWorkflowPolicy(content), mutation).not.toEqual([]);
    }
  });

  it('emits an auditable bundle, manifest and checksums', () => {
    expect(workflow).toContain('git archive --format=tar.gz');
    expect(workflow).toContain('SECURITY_EVIDENCE_DIR=artifacts/release pnpm security:evidence');
    expect(workflow).toContain('run: pnpm release:ci-evidence');
    expect(workflow).toContain('CI_RUN_ID: ${{ github.event.workflow_run.id }}');
    expect(workflow).toContain("RELEASE_REQUIRE_IMAGE_DIGESTS: '1'");
    expect(workflow).toContain('run: pnpm release:manifest');
    expect(workflow).toContain('path: |');
    expect(workflow).toContain('            artifacts/release/');
    expect(workflow).toContain('            artifacts/triple-a/');
    expect(workflow).toContain('if-no-files-found: error');
  });

  it('records image attestations before the blocking release gate', () => {
    const attestationIndex = workflow.indexOf('actions/attest-build-provenance@');
    const gateIndex = workflow.indexOf('name: Run blocking Triple-A release gate');
    expect(attestationIndex).toBeGreaterThan(-1);
    expect(workflow).toContain('run: pnpm release:attestation-evidence');
    expect(workflow).toContain(
      'TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE: artifacts/release/image-attestation-evidence.json'
    );
    expect(gateIndex).toBeGreaterThan(attestationIndex);
  });

  it('cryptographically verifies each published OCI image before the blocking gate', () => {
    expect(workflow.match(/gh attestation verify "oci:\/\/ghcr\.io\//g)).toHaveLength(3);
    expect(
      workflow.match(/--format json > artifacts\/release\/[a-z]+-attestation-verification\.json/g)
    ).toHaveLength(3);
    expect(workflow.match(/--signer-workflow "\$\{SIGNER_WORKFLOW\}"/g)).toHaveLength(3);
    expect(
      workflow.match(/--source-ref refs\/heads\/main --source-digest "\$\{RELEASE_SHA\}"/g)
    ).toHaveLength(
      3
    );
    expect(workflow).not.toContain('--source-ref main --source-digest');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}');
  });

  it('generates the manifest after attestation verification and binds the CI envelope', () => {
    const verificationIndex = workflow.indexOf('name: Verify image attestations');
    const manifestIndex = workflow.indexOf(
      'name: Generate digest-bound release-set manifest for the gate'
    );
    const gateIndex = workflow.indexOf('name: Run blocking Triple-A release gate');

    expect(manifestIndex).toBeGreaterThan(verificationIndex);
    expect(gateIndex).toBeGreaterThan(manifestIndex);
    expect(workflow).toContain('TRIPLE_A_CI_EVIDENCE: artifacts/release/ci-evidence.json');
    expect(workflow).toContain("TRIPLE_A_VERIFY_CI_EVIDENCE: '1'");
    expect(workflow).not.toContain('TRIPLE_A_CI_URL:');
  });

  it('runs a blocking candidate assurance before publishing any image', () => {
    const preflightIndex = workflow.indexOf('name: Run pre-publication candidate assurance');
    const firstPublishIndex = workflow.indexOf(
      'name: Publish vetted image candidates to quarantine'
    );
    const firstPushIndex = workflow.indexOf('oras copy --recursive --from-oci-layout');
    const preflight = workflow.slice(preflightIndex, firstPublishIndex);

    expect(preflightIndex).toBeGreaterThan(-1);
    expect(workflow).toContain("TRIPLE_A_PREPUBLICATION: '1'");
    expect(workflow).not.toContain("TRIPLE_A_ADVISORY: '1'");
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
