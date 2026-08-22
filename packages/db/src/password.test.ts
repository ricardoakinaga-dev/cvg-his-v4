import { describe, expect, it } from 'vitest';

import { hashSeedPassword } from './password.js';

describe('seed password hashing', () => {
  it('writes the same salted scrypt format accepted by the users module', async () => {
    const password = 'SeedOnly2026!strong';
    const first = await hashSeedPassword(password);
    const second = await hashSeedPassword(password);

    expect(first).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(second).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
  });
});
