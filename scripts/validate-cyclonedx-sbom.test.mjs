import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  LOCK_HASH_PROPERTY,
  enrichCycloneDxBom,
  validateCycloneDxBom,
} from './validate-cyclonedx-sbom.mjs';

const lockContents = 'lockfileVersion: 9.0\npackages:\n  react@19.0.0: {}\n';

function validBom() {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: 'urn:uuid:123e4567-e89b-42d3-a456-426614174000',
    version: 1,
    metadata: {
      timestamp: '2026-08-12T00:00:00.000Z',
      tools: { components: [{ type: 'application', name: 'cdxgen', version: '12.8.3' }] },
      properties: [],
    },
    components: [
      {
        type: 'library',
        name: 'react',
        version: '19.0.0',
        purl: 'pkg:npm/react@19.0.0',
        'bom-ref': 'pkg:npm/react@19.0.0',
      },
    ],
    dependencies: [{ ref: 'pkg:npm/react@19.0.0', dependsOn: [] }],
  };
}

test('enriches a generated BOM with the exact lockfile digest', () => {
  const enriched = enrichCycloneDxBom(validBom(), lockContents, {
    generator: '@cyclonedx/cdxgen@12.8.3',
    integrity: 'sha512-test',
  });

  const hash = createHash('sha256').update(lockContents).digest('hex');
  assert.ok(
    enriched.metadata.properties.some(
      (property) => property.name === LOCK_HASH_PROPERTY && property.value === hash,
    ),
  );
  assert.equal(validBom().metadata.properties.length, 0, 'input must not be mutated');
});

test('validates a standard CycloneDX dependency graph tied to the lockfile', () => {
  const enriched = enrichCycloneDxBom(validBom(), lockContents, {
    generator: '@cyclonedx/cdxgen@12.8.3',
    integrity: 'sha512-test',
  });

  const result = validateCycloneDxBom(enriched, lockContents);

  assert.equal(result.status, 'PASS');
  assert.equal(result.components, 1);
  assert.equal(result.dependencies, 1);
});

test('rejects stale lock hashes, ranges and missing package URLs', () => {
  const stale = enrichCycloneDxBom(validBom(), 'different lock', {
    generator: '@cyclonedx/cdxgen@12.8.3',
    integrity: 'sha512-test',
  });
  stale.components[0] = { ...stale.components[0], version: '^19.0.0', purl: undefined };

  const result = validateCycloneDxBom(stale, lockContents);

  assert.equal(result.status, 'FAIL');
  assert.match(result.errors.join('\n'), /lockfile digest/i);
  assert.match(result.errors.join('\n'), /exact version/i);
  assert.match(result.errors.join('\n'), /package URL/i);
});
