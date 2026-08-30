import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isValidSetupToken,
  MIN_SETUP_TOKEN_LENGTH,
  resolveSetupBootstrapToken
} from './setup-token.js';

test('fails closed instead of generating a token when none is configured', () => {
  const resolved = resolveSetupBootstrapToken(undefined);

  assert.equal(resolved.configured, false);
  assert.equal(resolved.token, undefined);
});

test('blank configuration remains disabled on every API instance', () => {
  const first = resolveSetupBootstrapToken();
  const second = resolveSetupBootstrapToken('   ');

  assert.deepEqual(first, { token: undefined, configured: false });
  assert.deepEqual(second, { token: undefined, configured: false });
});

test('uses a configured token verbatim', () => {
  const configured = '0123456789abcdef'.repeat(4);
  const resolved = resolveSetupBootstrapToken(`  ${configured}  `);

  assert.equal(resolved.configured, true);
  assert.equal(resolved.token, configured);
});

test('rejects a configured token that is too short to resist guessing', () => {
  assert.throws(
    () => resolveSetupBootstrapToken('short-token'),
    /SETUP_BOOTSTRAP_TOKEN must contain at least/
  );
});

test('rejects an obviously low-entropy token even when it is long', () => {
  assert.throws(
    () => resolveSetupBootstrapToken('a'.repeat(MIN_SETUP_TOKEN_LENGTH)),
    /high-entropy secret generator/
  );
});

test('rejects an obviously periodic token even when it has enough length and distinct characters', () => {
  assert.throws(
    () => resolveSetupBootstrapToken('01234567'.repeat(6)),
    /high-entropy secret generator/
  );
});

test('accepts only the exact token', () => {
  const token = '0123456789abcdef'.repeat(4);

  assert.equal(isValidSetupToken(token, token), true);
  assert.equal(isValidSetupToken(token, `${token}x`), false);
  assert.equal(isValidSetupToken(token, token.slice(0, -1)), false);
  assert.equal(isValidSetupToken(token, ''), false);
});

test('never includes the configured secret in validation errors', () => {
  const secret = 'x'.repeat(MIN_SETUP_TOKEN_LENGTH);

  assert.throws(
    () => resolveSetupBootstrapToken(secret),
    (error: unknown) => error instanceof Error && !error.message.includes(secret)
  );
});

test('rejects non-string candidates without throwing', () => {
  const token = 'c'.repeat(32);

  assert.equal(isValidSetupToken(token, undefined), false);
  assert.equal(isValidSetupToken(token, null), false);
  assert.equal(isValidSetupToken(token, 42), false);
  assert.equal(isValidSetupToken(token, { token }), false);
});
