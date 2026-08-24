import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const validatorPath = resolve(repositoryRoot, 'infra/scripts/validate-helm.mjs');

test('Helm render validation loads overlay values inside the render loop', () => {
  const source = readFileSync(validatorPath, 'utf8');
  const renderedValidation = source.slice(source.indexOf('if (!hasHelm())'));

  assert.match(
    renderedValidation,
    /for \(const environment of environments\) \{\s*const values = readYamlFile\(environment\.values\);/s,
    'rendered Helm assertions must use the values loaded for the current overlay'
  );
});
