import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  findMissingHelmCiMarkers,
  findForbiddenDeploySurfaceReferences,
  REQUIRED_HELM_SHA256,
  REQUIRED_HELM_VERSION,
  validateDeploySurface
} from '../../../scripts/check-deploy-surface-of-truth.mjs';

describe('canonical deploy surface contract', () => {
  it('accepts the current repository only when the declared canonical surface is wired', () => {
    const result = validateDeploySurface(process.cwd());

    expect(result.errors).toEqual([]);
  });

  it('rejects an active reference to the legacy Helm track', () => {
    const violations = findForbiddenDeploySurfaceReferences([
      {
        path: '.github/workflows/ci.yml',
        content: 'helm lint charts/helm/umbrella'
      }
    ]);

    expect(violations).toEqual([
      {
        path: '.github/workflows/ci.yml',
        reason: 'active configuration references the legacy charts/helm track'
      }
    ]);
  });

  it('requires the CI guard to install and require the pinned Helm toolchain', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');

    expect(workflow).toContain('CVG_HELM_VERSION: v3.15.4');
    expect(workflow).toContain(
      'CVG_HELM_SHA256: 11400fecfc07fd6f034863e4e0c4c4445594673fd2a129e701fe41f31170cfa9'
    );
    expect(workflow).toContain('sha256sum --check');
    expect(workflow).toContain('test "$(command -v helm)" = "/usr/local/bin/helm"');
    expect(workflow).toContain('HELM_BIN=/usr/local/bin/helm REQUIRE_HELM=1 pnpm validate:helm');
  });

  it('rejects a CI Helm contract that omits the pinned checksum or fail-closed mode', () => {
    const missing = findMissingHelmCiMarkers(
      [`CVG_HELM_VERSION: ${REQUIRED_HELM_VERSION}`, 'helm version --short'].join('\n')
    );

    expect(missing).toContain(`CVG_HELM_SHA256: ${REQUIRED_HELM_SHA256}`);
    expect(missing).toContain('sha256sum --check');
    expect(missing).toContain('HELM_BIN=/usr/local/bin/helm REQUIRE_HELM=1 pnpm validate:helm');
  });
});
