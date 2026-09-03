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
    expect(workflow.match(/actions\/attest-build-provenance@v2/g)).toHaveLength(3);
  });

  it('emits an auditable bundle, manifest and checksums', () => {
    expect(workflow).toContain('git archive --format=tar.gz');
    expect(workflow).toContain('SECURITY_EVIDENCE_DIR=artifacts/release pnpm security:evidence');
    expect(workflow).toContain("RELEASE_REQUIRE_IMAGE_DIGESTS: '1'");
    expect(workflow).toContain('run: pnpm release:manifest');
    expect(workflow).toContain('path: artifacts/release/');
    expect(workflow).toContain('if-no-files-found: error');
  });
});
