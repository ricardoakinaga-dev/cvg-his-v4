import { describe, expect, it } from 'vitest';

import {
  MIN_SETUP_TOKEN_LENGTH,
  isValidSetupToken,
  resolveSetupBootstrapToken
} from '../../../apps/api/src/setup-token.js';

const VALID_TOKEN = 'Aa1!Bb2@Cc3#Dd4$Ee5%Ff6^Gg7&Hh8*Ii9(Jj0-Kk1_Ll2';

describe('setup bootstrap token boundary', () => {
  it('trims and resolves a valid operator token without manufacturing one', () => {
    expect(VALID_TOKEN.length).toBeGreaterThanOrEqual(MIN_SETUP_TOKEN_LENGTH);
    expect(resolveSetupBootstrapToken(`  ${VALID_TOKEN}  `)).toEqual({
      token: VALID_TOKEN,
      configured: true
    });
    expect(resolveSetupBootstrapToken(undefined)).toEqual({ token: undefined, configured: false });
    expect(resolveSetupBootstrapToken('   ')).toEqual({ token: undefined, configured: false });
  });

  it('rejects weak configured tokens and validates constant-time equality cases', () => {
    expect(() => resolveSetupBootstrapToken('short')).toThrow(/SETUP_BOOTSTRAP_TOKEN/);
    expect(() => resolveSetupBootstrapToken('A'.repeat(MIN_SETUP_TOKEN_LENGTH))).toThrow(/SETUP_BOOTSTRAP_TOKEN/);
    expect(() => resolveSetupBootstrapToken(`${VALID_TOKEN.slice(0, 20)} ${VALID_TOKEN.slice(20)}`)).toThrow(/SETUP_BOOTSTRAP_TOKEN/);

    expect(isValidSetupToken(VALID_TOKEN, VALID_TOKEN)).toBe(true);
    expect(isValidSetupToken(VALID_TOKEN, `${VALID_TOKEN}x`)).toBe(false);
    expect(isValidSetupToken(VALID_TOKEN, VALID_TOKEN.slice(0, -1))).toBe(false);
    expect(isValidSetupToken(VALID_TOKEN, '')).toBe(false);
    expect(isValidSetupToken(VALID_TOKEN, undefined)).toBe(false);
    expect(isValidSetupToken(VALID_TOKEN, 42)).toBe(false);
  });
});
