import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import {
  converterEndOffsetSemantics,
  detectConverterEndOffsetSemantics,
} from './lib/native-v8-conversion.mjs';

const require = createRequire(import.meta.url);
const coverageRequire = createRequire(require.resolve('@vitest/coverage-v8/package.json'));

function installedVersion() {
  let directory = dirname(coverageRequire.resolve('ast-v8-to-istanbul'));
  for (;;) {
    const candidate = join(directory, 'package.json');
    try {
      const manifest = JSON.parse(readFileSync(candidate, 'utf8'));
      if (manifest.name === 'ast-v8-to-istanbul') return manifest.version;
    } catch {
      // keep walking up
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error('installed ast-v8-to-istanbul version not found');
    directory = parent;
  }
}

test('0.3.x semantics consume inclusive V8 end offsets', () => {
  assert.deepEqual(converterEndOffsetSemantics('0.3.12'), {
    version: '0.3.12',
    inclusiveEndOffsets: true,
  });
  assert.equal(converterEndOffsetSemantics('0.9.0').inclusiveEndOffsets, true);
});

test('1.x semantics consume exclusive V8 end offsets', () => {
  assert.deepEqual(converterEndOffsetSemantics('1.0.6'), {
    version: '1.0.6',
    inclusiveEndOffsets: false,
  });
  assert.equal(converterEndOffsetSemantics('1.9.3').inclusiveEndOffsets, false);
});

test('pre-release versions keep their major semantics', () => {
  assert.equal(converterEndOffsetSemantics('1.0.6-beta.1').inclusiveEndOffsets, false);
  assert.equal(converterEndOffsetSemantics('0.4.0-rc.2').inclusiveEndOffsets, true);
});

test('malformed or unknown versions fail closed', () => {
  for (const version of [undefined, null, '', 'one', '1', '1.0', 'v1.0.6', '1.0.6.7', '-1.0.0', '2.0.0', '3.1.4']) {
    assert.throws(
      () => converterEndOffsetSemantics(version),
      /unsupported ast-v8-to-istanbul version/,
      String(version)
    );
  }
});

test('detection resolves the installed dependency version', () => {
  const detected = detectConverterEndOffsetSemantics();
  assert.equal(detected.version, installedVersion());
  const major = Number(detected.version.split('.')[0]);
  assert.equal(detected.inclusiveEndOffsets, major === 0);
});
