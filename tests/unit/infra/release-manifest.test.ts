import { readFileSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateReleaseManifest } from '../../../scripts/generate-release-manifest.mjs';

describe('release manifest', () => {
  it('binds files, SBOM and three image digests to a full commit SHA', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-release-manifest-'));
    mkdirSync(resolve(rootDir, 'artifacts/release'), { recursive: true });
    writeFileSync(resolve(rootDir, 'artifacts/release/source.tar.gz'), 'source');
    writeFileSync(resolve(rootDir, 'artifacts/release/sbom.cyclonedx.json'), '{}\n');
    const digest = `sha256:${'a'.repeat(64)}`;

    const result = generateReleaseManifest({
      rootDir,
      commitSha: '1'.repeat(40),
      version: 'sha-111111111111',
      pipelineUrl: 'https://example.test/run/1',
      requireImageDigests: true,
      images: [
        { component: 'api', reference: 'ghcr.io/cvg/api:sha', digest },
        { component: 'worker', reference: 'ghcr.io/cvg/worker:sha', digest },
        { component: 'spa', reference: 'ghcr.io/cvg/spa:sha', digest },
      ],
    });

    expect(result.manifest.commit_sha).toBe('1'.repeat(40));
    expect(result.manifest.images).toHaveLength(3);
    expect(result.manifest.images[0].immutable_reference).toBe(`ghcr.io/cvg/api@${digest}`);
    expect(result.manifest.sbom).toBe('artifacts/release/sbom.cyclonedx.json');
    expect(readFileSync(result.checksumsPath, 'utf8')).toContain('release-manifest.json');
  });

  it('fails closed when a strict release lacks an image digest', () => {
    const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-release-manifest-'));
    mkdirSync(resolve(rootDir, 'artifacts/release'), { recursive: true });
    writeFileSync(resolve(rootDir, 'artifacts/release/sbom.cyclonedx.json'), '{}\n');

    expect(() =>
      generateReleaseManifest({
        rootDir,
        commitSha: '2'.repeat(40),
        requireImageDigests: true,
        images: [],
      })
    ).toThrow('release estrito exige digests de API, worker e SPA');
  });
});
