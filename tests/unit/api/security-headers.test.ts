import { describe, expect, it } from 'vitest';

import { isSecureRequest } from '../../../apps/api/src/http/security-headers.ts';

describe('security headers request classification', () => {
  it('accepts both array and scalar forwarded protocol headers', () => {
    expect(
      isSecureRequest({
        socket: { encrypted: false },
        headers: { 'x-forwarded-proto': ['https', 'http'] }
      } as never)
    ).toBe(true);

    expect(
      isSecureRequest({
        socket: { encrypted: false },
        headers: { 'x-forwarded-proto': 'https, http' }
      } as never)
    ).toBe(true);
  });
});
