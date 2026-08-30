import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const seed = readFileSync(resolve(process.cwd(), 'packages/db/src/seed.ts'), 'utf8');

describe('canonical seed laboratory signer contract', () => {
  it('provisions an active profession and staff link for the seeded admin principal', () => {
    expect(seed).toContain('professions');
    expect(seed).toContain('staff');
    expect(seed).toContain('ensureSeedLaboratorySigner');
    expect(seed).toContain('await ensureSeedLaboratorySigner(accountId, {');
    expect(seed).toContain('id: adminUser.id');
    expect(seed).toContain('isActive: true');
    expect(seed).toContain('professionId');
  });
});
